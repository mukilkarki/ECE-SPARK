// ============================================================
// CREO ECE Career OS — firebase.js
// ⚠️  REPLACE ALL "YOUR_*" VALUES BEFORE DEPLOYING
// ============================================================

// ---- Firebase Config ----
// Get from: Firebase Console → Project Settings → Your Apps → Web App
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAdUnNzLWp1h11KUPFDD0LciA-tBW5ez0Q",
  authDomain: "ece-void-os.firebaseapp.com",
  projectId: "ece-void-os",
  storageBucket: "ece-void-os.firebasestorage.app",
  messagingSenderId: "766661271652",
  appId: "1:766661271652:web:b327d689721d5c432b7f71",
  measurementId: "G-RHGCLXYEZ7"
};

// ---- AI Proxy / OpenRouter Config ----
// AI_API_ENDPOINT points to the deployed proxy used by app.js.
// OPENROUTER_API_KEY is optional when the proxy is available.
const AI_API_ENDPOINT = "https://ecespark.mukilkarkimail.workers.dev";
const OPENROUTER_API_KEY = "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";

// ---- Cloudinary Config ----
// Sign up at https://cloudinary.com (free 25GB)
// Create an UNSIGNED upload preset in Settings → Upload
const CLOUDINARY_CLOUD_NAME   = "dk3e0trh6";
const CLOUDINARY_UPLOAD_PRESET = "ECE SPARK";

// ---- Admin Access Config ----
// Add trusted administrator emails here. For production, mirror this with
// Firebase custom claims / Firestore rules so admin access is enforced server-side.
const ADMIN_EMAILS = [
  "admin@ecespark.in"
];

// ============================================================
// Firestore Security Rules — paste in Firebase Console
// ============================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        (request.auth.token.admin == true ||
         request.auth.token.email in ['mukilkarkimail@gmail.com']);
    }

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write: if isAdmin();
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
        allow read, write: if isAdmin();
      }
    }

    match /admin/{docId}/{subcollection=**} {
      allow read, write: if isAdmin();
    }
  }
}
*/

// ============================================================
// Firestore Database Structure (reference only)
// ============================================================
/*
users/{uid}/
  ├── (root doc)      → { name, email, college, branch, semester, cgpa,
  │                       targetCgpa, goal, bio, avatarUrl, roadmapProgress,
  │                       cyberSkills, createdAt }
  ├── subjects/       → [{ name, code, credits, internalMark, attendance, examDate }]
  ├── studySessions/  → [{ date, subject, duration, pomodoroCount, notes }]
  ├── habits/         → [{ name, icon, streak, completedDates[], targetDays }]
  ├── notes/          → [{ title, subject, type, cloudinaryUrl, publicId, tags[] }]
  ├── certifications/ → [{ name, provider, status, completedDate, credentialUrl, category }]
  ├── internships/    → [{ company, role, type, status, startDate, endDate, stipend }]
  ├── projects/       → [{ title, description, techStack[], githubUrl, liveUrl, status }]
  └── ctfChallenges/  → [{ name, platform, category, points, solved, date }]
*/
