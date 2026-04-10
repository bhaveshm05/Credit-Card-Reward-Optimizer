// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Auth
import * as authModule from "firebase/auth";
import { initializeAuth, Auth } from "firebase/auth";

// Firestore
import { getFirestore } from "firebase/firestore";
import type { FirebaseApp } from "firebase/app";

const getReactNativePersistence = (authModule as any).getReactNativePersistence;

const firebaseConfig = {
  apiKey: "AIzaSyD38zv4LLd0OwkgONUFPGy6wP_I3eGKeik",
  authDomain: "ccro-3a550.firebaseapp.com",
  projectId: "ccro-3a550",
  storageBucket: "ccro-3a550.appspot.com",
  messagingSenderId: "148569413849",
  appId: "1:148569413849:web:908201e24a6713f11d46c8",
  measurementId: "G-M2NXW5KZH9",
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// Auth instance
let authInstance: Auth;
try {
  if (!getReactNativePersistence) throw new Error("Persistence utility failed.");
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  console.warn("Firebase auth warning:", e);
}

// Firestore instance
const firestore = getFirestore(app);

export { app, authInstance as auth, firestore };
