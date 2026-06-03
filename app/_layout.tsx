import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import OfflineBanner from "../components/OfflineBanner";
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

  return (
    <CreateTripContext.Provider value={{ tripData, setTripData }}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
        {/* Tüm sayfalarda internet bağlantısı durumunu göster */}
        <OfflineBanner />
      </View>
    </CreateTripContext.Provider>
  );
}
