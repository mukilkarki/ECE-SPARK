# User Notification Guide for ECE-SPARK

This file documents how ECE-SPARK can notify users today, what is already present in the project, and the recommended implementation path for production notifications.

## 1. Project analysis

ECE-SPARK is a static, mobile-first web application that runs from `index.html` and uses plain JavaScript, CSS, and Firebase services.

Current project facts that affect notifications:

- The app already uses Firebase Web SDK compat scripts for app, auth, and Firestore.
- Firebase configuration is centralized in `js/firebase.js` and includes a `messagingSenderId`, which is required for Firebase Cloud Messaging (FCM).
- User records are stored under `users/{uid}` with user-owned subcollections.
- The UI already has an in-app toast system in `js/app.js`.
- `showNotifications()` currently only asks for browser notification permission and then displays an in-app toast.
- `sw.js` is already registered as the app service worker, so it can be extended for background push notifications.
- The app is deployed as a static web app, so any trusted fan-out notification sending must happen outside the browser, such as Firebase Cloud Functions, a secure admin panel backend, or a trusted server.

## 2. Notification types to support

Use three levels of notification depending on urgency and whether the user is online.

| Type | When to use | Current status | Recommended implementation |
| --- | --- | --- | --- |
| In-app toast | Quick feedback while the user is using the app, such as save success or validation warnings. | Already available through `showToast(message, type)`. | Continue using the existing toast helper. |
| Browser notification | Local reminders or foreground notices after the user grants permission. | Permission request exists, but no real notification payloads are shown yet. | Add a small helper that calls `new Notification(...)` only after permission is granted. |
| Push notification | Important updates when the app is closed or in the background, such as study reminders, announcement broadcasts, or deadline alerts. | Not implemented yet. | Add Firebase Cloud Messaging with token storage and server-side sends. |

## 3. Recommended architecture

```text
User browser
  ├─ Signs in with Firebase Auth
  ├─ Grants notification permission
  ├─ Gets an FCM registration token
  └─ Stores token under users/{uid}/notificationTokens/{tokenHash}

Trusted sender
  ├─ Cloud Function, admin backend, or scheduled job
  ├─ Selects target users
  ├─ Reads active notification tokens
  └─ Sends messages through Firebase Admin SDK / FCM

Service worker
  └─ Receives background push messages and displays notifications
```

Do not send push notifications directly from frontend code with server credentials. Browser code is public, so FCM server keys and Firebase Admin credentials must stay in a backend environment.

## 4. Firestore data model

Add a `notificationTokens` subcollection under each user:

```text
users/{uid}/notificationTokens/{tokenHash}
  token: string
  platform: "web"
  userAgent: string
  enabled: boolean
  createdAt: server timestamp
  updatedAt: server timestamp
  lastSeenAt: server timestamp
```

Optional user preferences can live on the root user document:

```text
users/{uid}
  notificationPreferences: {
    enabled: boolean,
    studyReminders: boolean,
    announcements: boolean,
    deadlineAlerts: boolean,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  }
```

## 5. Frontend implementation plan

### Step 1: Load Firebase Messaging

Add the Firebase Messaging compat script in `index.html` after the Firebase app script and before `js/app.js`:

```html
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"></script>
```

### Step 2: Add public VAPID key config

In `js/firebase.js`, add a public VAPID key from Firebase Console:

```js
const FIREBASE_VAPID_KEY = "YOUR_PUBLIC_WEB_PUSH_CERTIFICATE_KEY_PAIR";
```

Firebase Console path:

1. Project settings
2. Cloud Messaging
3. Web Push certificates
4. Generate key pair

The VAPID key is public and can be in frontend config. Admin SDK credentials and server keys must not be placed in frontend files.

### Step 3: Request permission and register a token

Create a helper in `js/app.js`:

```js
async function enablePushNotifications() {
  if (!currentUser) {
    showToast('Please sign in before enabling notifications.', 'warning');
    return;
  }

  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported on this device.', 'warning');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast('Notification permission was not granted.', 'warning');
    return;
  }

  if (!firebase.messaging || !FIREBASE_VAPID_KEY) {
    showToast('Push notifications are not configured yet.', 'warning');
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const messaging = firebase.messaging();
  const token = await messaging.getToken({
    vapidKey: FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    showToast('Could not create notification token.', 'warning');
    return;
  }

  const tokenId = await sha256TokenId(token);
  await db
    .collection('users')
    .doc(currentUser.uid)
    .collection('notificationTokens')
    .doc(tokenId)
    .set({
      token,
      platform: 'web',
      userAgent: navigator.userAgent,
      enabled: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

  showToast('Push notifications enabled.', 'success');
}

async function sha256TokenId(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
```

Then update `showNotifications()` to call `enablePushNotifications()` or wire this helper to a dedicated profile setting button.

### Step 4: Handle foreground messages

Add a foreground listener after the Messaging instance is initialized:

```js
function listenForForegroundPushMessages() {
  if (!firebase.messaging) return;

  const messaging = firebase.messaging();
  messaging.onMessage(payload => {
    const title = payload.notification?.title || 'ECE-SPARK';
    const body = payload.notification?.body || 'You have a new update.';
    showToast(`${title}: ${body}`, 'info');
  });
}
```

Call it once after Firebase initialization.

## 6. Service worker implementation plan

Firebase Messaging background handling normally uses `firebase-messaging-sw.js`. Because this project already has `sw.js`, choose one of these options:

### Option A: Keep `sw.js` as the only service worker

Import Firebase Messaging into `sw.js` and add the background handler near the top of the file:

```js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'ECE-SPARK';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/assets/ecespark_logo.jpg',
    badge: '/assets/ecespark_logo.jpg',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});
```

Because service workers cannot read constants from `js/firebase.js`, either duplicate only the Firebase app config in `sw.js` or create a separate generated config file that can be imported by both scripts.

### Option B: Add a separate `firebase-messaging-sw.js`

Use this if you want to avoid mixing app-shell caching and push handling. Register it specifically when calling `messaging.getToken()`.

## 7. Backend sending plan

Use Firebase Cloud Functions or another trusted server to send notifications. Example Cloud Function with Firebase Admin SDK:

```js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendAnnouncement = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  // Replace with an admin-role check before production use.
  const { title, body, targetUid } = data;

  const tokenSnap = await admin
    .firestore()
    .collection('users')
    .doc(targetUid)
    .collection('notificationTokens')
    .where('enabled', '==', true)
    .get();

  const tokens = tokenSnap.docs.map(doc => doc.data().token).filter(Boolean);
  if (!tokens.length) return { sent: 0 };

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: { link: 'https://your-domain.example/' }
    }
  });

  return {
    sent: response.successCount,
    failed: response.failureCount
  };
});
```

Production requirements:

- Verify that the sender is an admin before sending broadcasts.
- Respect each user's notification preferences.
- Remove invalid or expired tokens returned by FCM.
- Rate-limit user-triggered notifications.
- Log send attempts without storing sensitive message content unnecessarily.

## 8. Firestore rules update

Extend the current user-owned rules so users can only manage their own notification tokens:

```text
match /users/{userId}/notificationTokens/{tokenId} {
  allow read, create, update, delete: if request.auth != null && request.auth.uid == userId;
}
```

If the existing nested subcollection wildcard remains in place, this is already permitted for the owner, but an explicit rule makes the notification intent clearer.

## 9. Example notification use cases

- Study reminder: "Time for your daily ECE-SPARK study session."
- Deadline alert: "Your Digital Signal Processing exam is tomorrow."
- Habit streak alert: "Complete today's habit to keep your streak alive."
- Admin announcement: "New placement preparation roadmap added."
- AI assistant follow-up: "Your generated plan is ready."

## 10. Rollout checklist

1. Add Messaging SDK to `index.html`.
2. Add `FIREBASE_VAPID_KEY` to `js/firebase.js`.
3. Add frontend enable/disable notification helpers.
4. Store FCM tokens in Firestore under the signed-in user.
5. Add service worker background push handling.
6. Build a Cloud Function or backend sender.
7. Add admin authorization for broadcasts.
8. Add preference controls in Profile.
9. Test foreground messages, background messages, closed-browser behavior, and token cleanup.
10. Document deployment steps for Firebase Hosting or the current static host.

## 11. Testing checklist

Test in these states before release:

- Signed out user clicks notification button.
- Signed in user denies notification permission.
- Signed in user grants permission and token is saved.
- Foreground push displays an in-app toast.
- Background push displays a browser notification.
- Clicking a notification opens the app URL.
- Deleted or expired tokens are removed by the backend.
- User preferences prevent disabled notification categories from being sent.
