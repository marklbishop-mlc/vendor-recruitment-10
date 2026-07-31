import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using environment variables with safe defaults for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mlc-vendor-recruitment.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "in-house-dev-mlc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "in-house-dev-mlc.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id"
};

// Initialize Firebase Instance
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore explicitly targeting the named database
const dbName = import.meta.env.VITE_FIRESTORE_DB_NAME || 'mlc-vendor-recruitment-db';
export const db = getFirestore(app, dbName);
