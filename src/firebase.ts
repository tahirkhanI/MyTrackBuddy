import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Add this for Auth
import { getFirestore } from "firebase/firestore"; // Add this for Database

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate config
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
  console.error("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in your environment variables.");
}

// Initialize Firebase
let app;
try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
    throw new Error("Firebase API Key is missing");
  }
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  app = {
    name: '[DEFAULT]',
    options: firebaseConfig,
    automaticDataCollectionEnabled: false
  } as any;
}

// Export services to use them in your app
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;