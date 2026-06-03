# ⚡ CREO ECE Career OS

> Your complete ECE → Cybersecurity + AI Engineering career operating system

![CREO ECE](https://img.shields.io/badge/CREO-ECE%20Career%20OS-00f5c4?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Installable-blue?style=for-the-badge)

---

## 🚀 Features

| Module | Features |
|--------|----------|
| **Auth** | Email/Password login, Signup, Forgot Password, Profile |
| **Dashboard** | Welcome card, AI suggestions, Pomodoro, Habits, Stats |
| **Semester Tracker** | Subjects, Credits, Internal Marks, Attendance, Exam Dates |
| **Productivity** | Full Pomodoro Timer, Habit Tracker, Study Log, Weekly Charts |
| **AI Assistant** | OpenRouter integration, ECE/Cyber/AI specialist, 8 quick prompts |
| **Notes System** | Cloudinary uploads (PDF, Image, Doc), Search & Filter |
| **Cybersecurity Hub** | Roadmap, Certifications, CTF Tracker, Skills Radar |
| **Placement Hub** | Resume Builder, Project Portfolio, Internship Tracker |
| **Analytics** | 6 chart types — Study hours, Attendance, Skills, CGPA trend |
| **PWA** | Installable on Android, Offline support via Service Worker |

---

## 📁 Folder Structure

```
creo-ece-career-os/
├── index.html          # Main SPA entry point
├── styles.css          # All styles (dark/light glassmorphism)
├── app.js              # Complete application logic
├── firebase.js         # 🔑 CONFIG FILE — set your keys here
├── sw.js               # Service Worker (PWA offline)
├── manifest.json       # PWA manifest
├── firebase.json       # Firebase Hosting config
├── 404.html            # GitHub Pages SPA fallback
├── .gitignore
└── README.md
```

---

## ⚙️ Setup Instructions

### Step 1 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project → **CREO ECE Career OS**
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in production mode
5. Go to **Project Settings** → Add Web App → Copy config
6. Open `firebase.js` and replace:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",           // ← paste your key
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 2 — Firestore Security Rules

In Firebase Console → Firestore → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Step 3 — OpenRouter API Key

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Create a free API key
3. Open `firebase.js` and replace:

```javascript
const OPENROUTER_API_KEY = "sk-or-v1-your-key-here";
```

> **Free models available:** Gemini 2.0 Flash, Llama 3.1 8B, Mistral 7B — no cost!

### Step 4 — Cloudinary Setup (for Notes uploads)

1. Sign up at [Cloudinary.com](https://cloudinary.com) (free tier: 25GB)
2. Go to Dashboard → Settings → Upload → Add upload preset
3. Set preset as **Unsigned**
4. Open `firebase.js` and replace:

```javascript
const CLOUDINARY_CLOUD_NAME = "your-cloud-name";
const CLOUDINARY_UPLOAD_PRESET = "your-preset-name";
```

### Step 5 — Deploy to GitHub Pages

```bash
# 1. Create a new GitHub repository
# 2. Clone and add files
git init
git add .
git commit -m "Initial commit: CREO ECE Career OS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/creo-ece-career-os.git
git push -u origin main

# 3. Enable GitHub Pages
# Go to: Repository Settings → Pages → Source: Deploy from branch → main → / (root)
# Your app will be live at: https://YOUR_USERNAME.github.io/creo-ece-career-os/
```

### Step 6 — Firebase Authorized Domains

In Firebase Console → Authentication → Settings → Authorized domains, add:
```
YOUR_USERNAME.github.io
localhost
```

---

## 📱 Install on Android

1. Open your deployed URL in Chrome on Android
2. Tap the **"Add to Home Screen"** banner (or Menu → Install App)
3. CREO ECE will install as a standalone app!

---

## 🔒 Security Notes

- All Firestore data is user-scoped via Firebase Auth UID
- Security rules prevent any user from reading another user's data
- API keys are stored client-side — for production, consider using Firebase Functions as a proxy
- Cloudinary uses unsigned upload preset — restrict allowed file types in Cloudinary dashboard

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Auth & DB:** Firebase Authentication + Firestore
- **File Storage:** Cloudinary (PDFs, Images, Documents)
- **AI:** OpenRouter API (Gemini, Llama, Mistral, Claude, GPT-4o)
- **Charts:** Chart.js v4
- **Icons:** Lucide Icons
- **Fonts:** Syne, Plus Jakarta Sans, JetBrains Mono
- **PWA:** Service Worker + Web App Manifest
- **Hosting:** GitHub Pages / Firebase Hosting

---

## 🗺️ Roadmap (Planned Features)

- [ ] Collaborative study rooms
- [ ] Google Calendar sync for exam dates
- [ ] AI-powered note OCR (extract text from uploaded images)
- [ ] Competitive programming tracker (LeetCode, Codeforces)
- [ ] Job application tracker
- [ ] Dark/Light theme per-section customization

---

## 📄 License

MIT License — Free to use, modify, and deploy.

---

Built with ⚡ for ECE students pursuing Cybersecurity + AI careers.
# ECE-SPARK
