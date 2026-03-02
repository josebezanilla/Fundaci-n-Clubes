import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder",
};

let app;
let auth: any;
let googleProvider: any;
let db: any;

try {
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "placeholder") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getFirestore(app);
  }
} catch (err) {
  console.error("Firebase init error:", err);
}

export { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db };
export type { User };
