import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  INTEREST_OPTIONS,
  MAX_TRAVELERS,
  MIN_TRAVELERS,
} from "../../constants/tripPreferences";
import { useCreateTrip } from "../../hooks/useCreateTrip";

const ACCENT = "#6366F1";
const ACCENT_LIGHT = "#818CF8";
const DARK_HEADER = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const TOTAL_STEPS = 6;
const CURRENT_STEP = 3;

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: DARK_HEADER }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: i < current ? ACCENT : "rgba(255,255,255,0.2)",
          }}
        />
      ))}
    </View>
  );
}

export default function TripPreferences() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useCreateTrip();

  const [travelers, setTravelers] = useState(tripData?.travelers || 1);
  const [selectedInterests, setSelectedInterests] = useState(tripData?.interests || []);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace("/create-trip/select-date");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId],
    );
  };

  const handleContinue = () => {
    if (selectedInterests.length === 0) {
      Alert.alert(
        "İlgi Alanı Seçin",
        "AI planınızı kişiselleştirmek için en az bir ilgi alanı seçin.",
      );
      return;
    }

    setTripData({ ...tripData, travelers, interests: selectedInterests });
    router.push("/create-trip/review-trip");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BODY_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_HEADER} />

      {/* Dark Header */}
      <View style={{ backgroundColor: DARK_HEADER, paddingTop: Constants.statusBarHeight || 44 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 }}>
          <TouchableOpacity
            onPress={handleGoBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "outfit-bold", fontSize: 18, color: "#FFFFFF" }}>
              Tercihlerini Belirle
            </Text>
            <Text style={{ fontFamily: "outfit", fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
              Adım {CURRENT_STEP} / {TOTAL_STEPS}
            </Text>
          </View>
        </View>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Traveler Count Section */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 4 }}>
            Yolcu Sayısı
          </Text>
          <Text style={{ fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED, marginBottom: 20 }}>
            Kaç kişi seyahat edeceksiniz?
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28 }}>
            {/* Minus button */}
            <TouchableOpacity
              onPress={() => setTravelers((v) => Math.max(MIN_TRAVELERS, v - 1))}
              disabled={travelers <= MIN_TRAVELERS}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: travelers <= MIN_TRAVELERS ? "#F3F4F6" : "#EEF2FF",
                borderWidth: 2,
                borderColor: travelers <= MIN_TRAVELERS ? "#E5E7EB" : ACCENT,
                alignItems: "center",
                justifyContent: "center",
                opacity: travelers <= MIN_TRAVELERS ? 0.5 : 1,
              }}
            >
              <Ionicons name="remove" size={22} color={travelers <= MIN_TRAVELERS ? TEXT_MUTED : ACCENT} />
            </TouchableOpacity>

            {/* Count display */}
            <View style={{ alignItems: "center", minWidth: 72 }}>
              <Text style={{ fontFamily: "outfit-bold", fontSize: 44, color: TEXT_PRIMARY, lineHeight: 52 }}>
                {travelers}
              </Text>
              <Text style={{ fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED }}>
                kişi
              </Text>
            </View>

            {/* Plus button */}
            <TouchableOpacity
              onPress={() => setTravelers((v) => Math.min(MAX_TRAVELERS, v + 1))}
              disabled={travelers >= MAX_TRAVELERS}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: travelers >= MAX_TRAVELERS ? "#F3F4F6" : ACCENT,
                borderWidth: 2,
                borderColor: travelers >= MAX_TRAVELERS ? "#E5E7EB" : ACCENT,
                alignItems: "center",
                justifyContent: "center",
                opacity: travelers >= MAX_TRAVELERS ? 0.5 : 1,
              }}
            >
              <Ionicons name="add" size={22} color={travelers >= MAX_TRAVELERS ? TEXT_MUTED : "#FFFFFF"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Interests Section */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY }}>
              İlgi Alanları
            </Text>
            {selectedInterests.length > 0 && (
              <View style={{ backgroundColor: "#EEF2FF", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: "outfit-medium", fontSize: 12, color: ACCENT }}>
                  {selectedInterests.length} seçildi
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED, marginBottom: 18 }}>
            En az bir tane seçin
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {INTEREST_OPTIONS.map((interest) => {
              const selected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: selected ? ACCENT : "#E5E7EB",
                    backgroundColor: selected ? ACCENT : "#FFFFFF",
                  }}
                >
                  <Ionicons
                    name={interest.icon}
                    size={16}
                    color={selected ? "#FFFFFF" : ACCENT}
                  />
                  <Text style={{
                    fontFamily: "outfit-medium",
                    fontSize: 13,
                    color: selected ? "#FFFFFF" : TEXT_PRIMARY,
                  }}>
                    {interest.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 17,
            backgroundColor: ACCENT,
            borderRadius: 16,
            gap: 8,
          }}
          onPress={handleContinue}
        >
          <Text style={{ fontSize: 16, fontFamily: "outfit-medium", color: "#FFFFFF" }}>
            Devam Et
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
