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
  console.log("❌ Firebase initialization failed:", error.message);
}

// Check if auth was initialized successfully
if (!auth) {
  console.log("⚠️ Auth not initialized, using fallback");
  
  // Fallback mock auth (should not be needed)
  auth = {
    currentUser: null,
    signInWithEmailAndPassword: (auth, email, password) => {
      console.log("Demo sign in:", email);
      return Promise.resolve({ 
        user: { 
          uid: 'demo-user-' + Date.now(),
          email: email,
          displayName: email.split('@')[0]
        } 
      });
    },
    createUserWithEmailAndPassword: (auth, email, password) => {
      console.log("Demo sign up:", email);
      return Promise.resolve({ 
        user: { 
          uid: 'demo-user-' + Date.now(),
          email: email,
          displayName: email.split('@')[0]
        } 
      });
    },
    signOut: () => {
      console.log("Demo sign out");
      return Promise.resolve();
    },
  };
}

export { app, auth, db, storage };

