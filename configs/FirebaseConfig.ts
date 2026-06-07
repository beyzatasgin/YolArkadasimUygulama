import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, initializeApp } from "firebase/app";
import {
  // @ts-expect-error Firebase RN persistence export
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";
import { getFirebaseConfig } from "./env";

const envConfig = getFirebaseConfig();

const firebaseConfig = {
  apiKey: envConfig.apiKey || "AIzaSyDzN9W2pvnlfGFAxAwClypg8yA2Lpl7hT8",
  authDomain: envConfig.authDomain || "travelapp-8096d.firebaseapp.com",
  projectId: envConfig.projectId || "travelapp-8096d",
  storageBucket: envConfig.storageBucket || "travelapp-8096d.firebasestorage.app",
  messagingSenderId: envConfig.messagingSenderId || "486556902431",
  appId: envConfig.appId || "1:486556902431:web:279f35d0dde69165ba612a",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitError: Error | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  firebaseInitError = error as Error;
  console.log("❌ Firebase initialization failed:", firebaseInitError.message);
}

export { app, auth, db, firebaseInitError, storage };
