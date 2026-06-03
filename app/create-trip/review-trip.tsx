import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getInterestLabel } from "../../constants/tripPreferences";
import { useCreateTrip } from "../../hooks/useCreateTrip";

const ACCENT = "#6366F1";
const DARK_HEADER = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";

export default function ReviewTrip() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData } = useCreateTrip();

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace("/create-trip/trip-preferences");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const formatDate = (date) => {
    if (!date) return "Seçilmedi";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const validateTrip = () => {
    if (!tripData?.selectedPlace) {
      Alert.alert("Hata", "Lütfen bir yer seçin");
      router.push("/create-trip/search-place");
      return false;
    }
    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert("Hata", "Lütfen seyahat tarihlerini seçin");
      router.push("/create-trip/select-date");
      return false;
    }
    if (!tripData?.interests || tripData.interests.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir ilgi alanı seçin");
      router.push("/create-trip/trip-preferences");
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateTrip()) return;
    router.push("/create-trip/trip-details");
  };

  const handleGenerateAIPlan = () => {
    if (!validateTrip()) return;
    router.push("/create-trip/generate-ai-trip");
  };

  const handleEditPlace = () => router.push("/create-trip/search-place");
  const handleEditDate = () => router.push("/create-trip/select-date");
  const handleEditPreferences = () => router.push("/create-trip/trip-preferences");

  const travelers = tripData?.travelers || 1;
  const isDisabled = !tripData?.selectedPlace || !tripData?.startDate;

  return (
    <View style={styles.screen}>
      {/* Dark header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Seyahatini İncele</Text>
          <Text style={styles.headerStep}>Adım 4 / 6</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: "66.6%" }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Destination card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={18} color={ACCENT} />
              </View>
              <Text style={styles.cardTitle}>Destinasyon</Text>
            </View>
            <TouchableOpacity onPress={handleEditPlace} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={ACCENT} />
              <Text style={styles.editBtnText}>Düzenle</Text>
            </TouchableOpacity>
          </View>

          {tripData?.selectedPlace ? (
            <View style={styles.cardBody}>
              <Text style={styles.placeName}>{tripData.selectedPlace.name}</Text>
              <Text style={styles.placeAddress}>{tripData.selectedPlace.address}</Text>
              {tripData.selectedPlace.url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(tripData.selectedPlace.url)}
                  style={styles.linkRow}
                >
                  <Ionicons name="open-outline" size={14} color={ACCENT} />
                  <Text style={styles.linkText}>Haritada Görüntüle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={20} color="#EF4444" />
              <Text style={styles.emptyText}>Yer seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Dates card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar" size={18} color={ACCENT} />
              </View>
              <Text style={styles.cardTitle}>Tarihler</Text>
            </View>
            <TouchableOpacity onPress={handleEditDate} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={ACCENT} />
              <Text style={styles.editBtnText}>Düzenle</Text>
            </TouchableOpacity>
          </View>

          {tripData?.startDate && tripData?.endDate ? (
            <View style={styles.cardBody}>
              <View style={styles.dateRow}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateLabel}>Gidiş</Text>
                  <Text style={styles.dateValue}>{formatDate(tripData.startDate)}</Text>
                </View>
                <View style={styles.dateSeparator}>
                  <Ionicons name="arrow-forward" size={18} color={TEXT_MUTED} />
                </View>
                <View style={[styles.dateBox, { alignItems: "flex-end" }]}>
                  <Text style={styles.dateLabel}>Dönüş</Text>
                  <Text style={styles.dateValue}>{formatDate(tripData.endDate)}</Text>
                </View>
              </View>
              {tripData.duration && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={14} color={ACCENT} />
                  <Text style={styles.durationText}>{tripData.duration} gün</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={20} color="#EF4444" />
              <Text style={styles.emptyText}>Tarih seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Travelers & Interests card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={18} color={ACCENT} />
              </View>
              <Text style={styles.cardTitle}>Tercihler</Text>
            </View>
            <TouchableOpacity onPress={handleEditPreferences} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color={ACCENT} />
              <Text style={styles.editBtnText}>Düzenle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.travelerRow}>
              <Ionicons name="person" size={16} color={ACCENT} />
              <Text style={styles.travelerText}>
                {travelers} {travelers === 1 ? "yolcu" : "yolcu"}
              </Text>
            </View>
            {tripData?.interests && tripData.interests.length > 0 ? (
              <View style={styles.chipsRow}>
                {tripData.interests.map((interestId) => (
                  <View key={interestId} style={styles.chip}>
                    <Text style={styles.chipText}>{getInterestLabel(interestId)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.mutedText}>İlgi alanı seçilmedi</Text>
            )}
          </View>
        </View>

        {/* AI plan ready badge */}
        {tripData?.aiPlan && (
          <View style={styles.aiBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.aiBadgeText}>
              AI planı hazır — görüntülemek veya düzenlemek için dokunun
            </Text>
          </View>
        )}

        {/* AI Plan button */}
        <TouchableOpacity
          style={[styles.aiButton, isDisabled && styles.buttonDisabled]}
          onPress={handleGenerateAIPlan}
          disabled={isDisabled}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
          <Text style={styles.aiButtonText}>
            {tripData?.aiPlan ? "AI Planını Görüntüle" : "AI Plan Oluştur"}
          </Text>
        </TouchableOpacity>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueButton, isDisabled && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isDisabled}
        >
          <Text style={styles.continueButtonText}>Detayları Tamamla</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Back link */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backLink}>
          <Ionicons name="chevron-back" size={16} color={ACCENT} />
          <Text style={styles.backLinkText}>Düzenle / Geri Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BODY_BG,
  },
  header: {
    backgroundColor: DARK_HEADER,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: "#fff",
  },
  headerStep: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "rgba(99,102,241,0.2)",
    backgroundColor: "#D1D5DB",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  editBtnText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },
  cardBody: {
    padding: 16,
  },
  placeName: {
    fontFamily: "outfit-bold",
    fontSize: 17,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  placeAddress: {
    fontFamily: "outfit",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  linkText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
    textDecorationLine: "underline",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#FEF2F2",
  },
  emptyText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: "#EF4444",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateBox: {
    flex: 1,
  },
  dateSeparator: {
    paddingHorizontal: 8,
  },
  dateLabel: {
    fontFamily: "outfit",
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateValue: {
    fontFamily: "outfit-medium",
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  durationText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },
  travelerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  travelerText: {
    fontFamily: "outfit-medium",
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  chipText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },
  mutedText: {
    fontFamily: "outfit",
    fontSize: 14,
    color: TEXT_MUTED,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  aiBadgeText: {
    flex: 1,
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: "#047857",
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: ACCENT,
    paddingVertical: 17,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  aiButtonText: {
    fontFamily: "outfit-bold",
    fontSize: 17,
    color: "#fff",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#374151",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  continueButtonText: {
    fontFamily: "outfit-medium",
    fontSize: 16,
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  backLinkText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: ACCENT,
  },
});
