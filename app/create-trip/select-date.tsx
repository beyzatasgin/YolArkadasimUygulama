import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DatePickerModal from "../../components/DatePickerModal";
import { useCreateTrip } from "../../hooks/useCreateTrip";

const ACCENT = "#6366F1";
const ACCENT_LIGHT = "#818CF8";
const DARK_HEADER = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const TOTAL_STEPS = 6;
const CURRENT_STEP = 2;

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

export default function SelectDate() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useCreateTrip();

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace("/create-trip/search-place");
  }, [navigation, router]);

  const [selectedStartDate, setSelectedStartDate] = useState(
    tripData?.startDate
      ? tripData.startDate instanceof Date
        ? tripData.startDate
        : new Date(tripData.startDate)
      : null,
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    tripData?.endDate
      ? tripData.endDate instanceof Date
        ? tripData.endDate
        : new Date(tripData.endDate)
      : null,
  );
  const [selectedDuration, setSelectedDuration] = useState(tripData?.duration || null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const durationOptions = [
    { label: "1 Gün", value: 1 },
    { label: "2-3 Gün", value: 3 },
    { label: "1 Hafta", value: 7 },
    { label: "2 Hafta", value: 14 },
    { label: "1 Ay", value: 30 },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today;
  };

  const handleStartDateSelect = (date: Date) => {
    setSelectedStartDate(date);
    if (selectedDuration) {
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + selectedDuration - 1);
      setSelectedEndDate(endDate);
    }
  };

  const handleEndDateSelect = (date: Date) => {
    setSelectedEndDate(date);
    if (selectedStartDate) {
      const diffTime = Math.abs(date.getTime() - selectedStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setSelectedDuration(diffDays);
    }
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    if (selectedStartDate) {
      const endDate = new Date(selectedStartDate);
      endDate.setDate(endDate.getDate() + duration - 1);
      setSelectedEndDate(endDate);
    }
  };

  const handleContinue = () => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert("Hata", "Lütfen başlangıç ve bitiş tarihlerini seçin");
      return;
    }

    const updatedTripData = {
      ...tripData,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      duration: selectedDuration,
    };

    setTripData(updatedTripData);
    router.push("/create-trip/trip-preferences");
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
              Tarihlerini Seç
            </Text>
            <Text style={{ fontFamily: "outfit", fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
              Adım {CURRENT_STEP} / {TOTAL_STEPS}
            </Text>
          </View>
        </View>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Date Selector Row */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          {/* Start Date Card */}
          <TouchableOpacity
            onPress={() => setShowStartDatePicker(true)}
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 2,
              borderColor: selectedStartDate ? ACCENT : "#E5E7EB",
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: selectedStartDate ? "#EEF2FF" : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}>
              <Ionicons name="calendar-outline" size={18} color={selectedStartDate ? ACCENT : TEXT_MUTED} />
            </View>
            <Text style={{ fontFamily: "outfit", fontSize: 11, color: TEXT_MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Başlangıç
            </Text>
            <Text style={{
              fontFamily: "outfit-bold",
              fontSize: selectedStartDate ? 15 : 13,
              color: selectedStartDate ? TEXT_PRIMARY : TEXT_MUTED,
            }}>
              {selectedStartDate ? formatShortDate(selectedStartDate) : "Seç"}
            </Text>
            {selectedStartDate && (
              <Text style={{ fontFamily: "outfit", fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                {selectedStartDate.toLocaleDateString("tr-TR", { year: "numeric" })}
              </Text>
            )}
          </TouchableOpacity>

          {/* Duration Badge (center) */}
          <View style={{ alignItems: "center", justifyContent: "center", minWidth: 56 }}>
            {selectedDuration ? (
              <View style={{
                backgroundColor: ACCENT,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 8,
                alignItems: "center",
              }}>
                <Text style={{ fontFamily: "outfit-bold", fontSize: 16, color: "#FFFFFF" }}>
                  {selectedDuration}
                </Text>
                <Text style={{ fontFamily: "outfit", fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
                  gün
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 20, height: 1, backgroundColor: "#D1D5DB" }} />
              </View>
            )}
          </View>

          {/* End Date Card */}
          <TouchableOpacity
            onPress={() => setShowEndDatePicker(true)}
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 2,
              borderColor: selectedEndDate ? ACCENT : "#E5E7EB",
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: selectedEndDate ? "#EEF2FF" : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}>
              <Ionicons name="calendar" size={18} color={selectedEndDate ? ACCENT : TEXT_MUTED} />
            </View>
            <Text style={{ fontFamily: "outfit", fontSize: 11, color: TEXT_MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Bitiş
            </Text>
            <Text style={{
              fontFamily: "outfit-bold",
              fontSize: selectedEndDate ? 15 : 13,
              color: selectedEndDate ? TEXT_PRIMARY : TEXT_MUTED,
            }}>
              {selectedEndDate ? formatShortDate(selectedEndDate) : "Seç"}
            </Text>
            {selectedEndDate && (
              <Text style={{ fontFamily: "outfit", fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                {selectedEndDate.toLocaleDateString("tr-TR", { year: "numeric" })}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Start Options */}
        {!selectedStartDate && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: TEXT_MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Hızlı Başlangıç
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "Yarın", icon: "time-outline", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; } },
                { label: "Gelecek Hafta", icon: "calendar-outline", getDate: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; } },
                { label: "Gelecek Ay", icon: "calendar-outline", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleStartDateSelect(opt.getDate())}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    paddingVertical: 12,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                  }}
                >
                  <Ionicons name={opt.icon as any} size={15} color={ACCENT} />
                  <Text style={{ fontFamily: "outfit", fontSize: 12, color: TEXT_PRIMARY }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Duration Options */}
        {selectedStartDate && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: TEXT_MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Seyahat Süresi
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {durationOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleDurationSelect(option.value)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: selectedDuration === option.value ? ACCENT : "#E5E7EB",
                    backgroundColor: selectedDuration === option.value ? "#EEF2FF" : "#FFFFFF",
                  }}
                >
                  <Text style={{
                    fontFamily: "outfit-medium",
                    fontSize: 13,
                    color: selectedDuration === option.value ? ACCENT : TEXT_PRIMARY,
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Summary Card */}
        {selectedStartDate && selectedEndDate && (
          <View style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 18,
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 14 }}>
              Seyahat Özeti
            </Text>
            {[
              { label: "Hedef", value: tripData?.selectedPlace?.name || "Seçilmedi" },
              { label: "Süre", value: `${selectedDuration} gün` },
              { label: "Tarihler", value: `${formatDate(selectedStartDate)} – ${formatDate(selectedEndDate)}` },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED }}>{row.label}</Text>
                <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: TEXT_PRIMARY, flex: 1, textAlign: "right" }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: 17,
            backgroundColor: (!selectedStartDate || !selectedEndDate) ? "#D1D5DB" : ACCENT,
            borderRadius: 16,
            gap: 8,
          }}
          onPress={handleContinue}
          disabled={!selectedStartDate || !selectedEndDate}
        >
          <Text style={{ fontSize: 16, fontFamily: "outfit-medium", color: "#FFFFFF" }}>
            Devam Et
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        selectedDate={selectedStartDate}
        minDate={getMinDate()}
        title="Başlangıç Tarihini Seç"
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onDateSelect={handleEndDateSelect}
        selectedDate={selectedEndDate}
        minDate={selectedStartDate || getMinDate()}
        title="Bitiş Tarihini Seç"
      />
    </View>
  );
}
