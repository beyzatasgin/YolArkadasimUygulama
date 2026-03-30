import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../configs/FirebaseConfig";
import {
  CreateTripContext,
  defaultTripData,
} from "../context/CreateTripContext";
export default function RootLayout() {
  useFonts({
    outfit: require("./../assets/fonts/Outfit-Regular.ttf"),
    "outfit-medium": require("./../assets/fonts/Outfit-Medium.ttf"),
    "outfit-bold": require("./../assets/fonts/Outfit-Bold.ttf"),
  });

  const [tripData, setTripData] = useState(defaultTripData);

  useEffect(() => {
    // Uygulama her temiz açılışta login ekranını göstermek için
    // kalıcı Firebase oturumunu kapat.
    if (auth?.currentUser) {
      signOut(auth).catch((error) => {
        console.log("Auto sign-out failed:", error?.message || error);
      });
    }
  }, []);

  return (
    <CreateTripContext.Provider value={{ tripData, setTripData }}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* <Stack.Screen name="index" options={{
      headerShown:false
    }}/> */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </CreateTripContext.Provider>
  );
}
