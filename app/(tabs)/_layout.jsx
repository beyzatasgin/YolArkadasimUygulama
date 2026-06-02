import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { auth, db } from "./../../configs/FirebaseConfig";
import { Colors } from "./../../constants/Colors";
export default function TabLayout() {
  const [user, setUser] = useState(auth?.currentUser ?? null);
  const [initializing, setInitializing] = useState(true);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth?.currentUser || !db) return;

    const currentUser = auth.currentUser;
    const profileRef = doc(db, "userProfiles", currentUser.uid);

    const upsertPresence = async (isOnline) => {
      try {
        await setDoc(
          profileRef,
          {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Kullanıcı",
            displayNameLower: (currentUser.displayName || "Kullanıcı").toLowerCase(),
            email: currentUser.email || "",
            searchableEmail: (currentUser.email || "").toLowerCase(),
            photoURL: currentUser.photoURL || null,
            isOnline,
            lastSeen: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.warn("Presence update error:", error?.message || error);
      }
    };

    upsertPresence(true);
    const presenceInterval = setInterval(() => upsertPresence(true), 25000);

    const appStateSubscription = AppState.addEventListener("change", (next) => {
      const wasActive = appStateRef.current === "active";
      const isNowActive = next === "active";
      appStateRef.current = next;
      upsertPresence(isNowActive);
      if (!wasActive && isNowActive) {
        upsertPresence(true);
      }
    });

    return () => {
      clearInterval(presenceInterval);
      appStateSubscription.remove();
      upsertPresence(false);
    };
  }, [user]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
      }}
    >
      <Tabs.Screen
        name="mytrip"
        options={{
          tabBarLabel: "Seyahatlerim",
          tabBarIcon: ({ color }) => (
            <Ionicons name="location-sharp" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarLabel: "Keşfet",
          tabBarIcon: ({ color }) => (
            <Ionicons name="globe-sharp" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarLabel: "Sosyal",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
