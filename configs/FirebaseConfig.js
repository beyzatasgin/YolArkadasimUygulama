// configs/FirebaseConfig.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔐 Firebase proje yapılandırman
const firebaseConfig = {
  apiKey: "AIzaSyDzN9W2pvnlfGFAxAwClypg8yA2Lpl7hT8",
  authDomain: "travelapp-8096d.firebaseapp.com",
  projectId: "travelapp-8096d",
  storageBucket: "travelapp-8096d.appspot.com",
  messagingSenderId: "486556902431",
  appId: "1:486556902431:web:279f35d0dde69165ba612a",
};

// 🚀 Firebase'i başlat
let app = null;
let auth = null;
let db = null;
let storage = null;
let firebaseInitError = null;

try {
  app = initializeApp(firebaseConfig);

  // 🔑 Authentication servisini başlat (React Native için)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  // 🗃️ Firestore veritabanı (isteğe bağlı)
  db = getFirestore(app);

  // 📦 Firebase Storage (fotoğraf yükleme için)
  storage = getStorage(app);

  console.log("✅ Firebase initialized successfully");
} catch (error) {
  firebaseInitError = error;
  console.log("❌ Firebase initialization failed:", error.message);
}

export { app, auth, db, firebaseInitError, storage };
