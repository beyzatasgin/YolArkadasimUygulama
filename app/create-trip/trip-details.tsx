import Ionicons from "@expo/vector-icons/Ionicons";
import { scheduleTripNotifications } from "../../services/notificationService";
import { useNavigation, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "../../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../../configs/FirebaseMessages";
import { defaultTripData } from "../../context/CreateTripContext";
import { useCreateTrip } from "../../hooks/useCreateTrip";

const ACCENT = "#6366F1";
const DARK_HEADER = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const removeUndefinedFields = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return value;
  const cleaned = {};
  Object.entries(value).forEach(([key, fieldValue]) => {
    const normalizedValue = removeUndefinedFields(fieldValue);
    if (normalizedValue !== undefined) {
      cleaned[key] = normalizedValue;
    }
  });
  return cleaned;
};

export default function TripDetails() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useCreateTrip();

  const [tripName, setTripName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [itineraryExpanded, setItineraryExpanded] = useState(false);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace("/create-trip/review-trip");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Kaydedildiğinde otomatik yönlendirme
  useEffect(() => {
    if (saved) {
      console.log("✅ Trip saved, redirecting to My Trips in 1.5 seconds...");
      const timer = setTimeout(async () => {
        console.log("🔄 Starting navigation to My Trips...");
        try {
          await router.replace("/(tabs)/mytrip");
          console.log("✅ Navigation successful with /(tabs)/mytrip");
        } catch (error) {
          console.warn("⚠️ First navigation attempt failed:", error);
          try {
            await router.replace("/mytrip");
            console.log("✅ Navigation successful with /mytrip");
          } catch (error2) {
            console.warn("⚠️ Second navigation attempt failed:", error2);
            try {
              await router.push("/(tabs)/mytrip");
              console.log("✅ Navigation successful with push");
            } catch (error3) {
              console.error("❌ All navigation attempts failed:", error3);
              try {
                await router.replace("/");
              } catch (finalError) {
                console.error("❌ Final navigation attempt failed:", finalError);
                Alert.alert(
                  "Başarılı",
                  "Seyahatiniz kaydedildi. Lütfen manuel olarak Seyahatlerim sayfasına gidin.",
                  [{ text: "Tamam" }],
                );
              }
            }
          }
        }
      }, 1500);
      return () => {
        clearTimeout(timer);
        console.log("🧹 Navigation timer cleared");
      };
    }
  }, [saved, router]);

  const formatDate = (date) => {
    if (!date) return "Seçilmedi";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleSaveTrip = async () => {
    if (saving) return;

    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, initMessage);
      return;
    }
    if (!auth?.currentUser) {
      Alert.alert("Hata", "Lütfen giriş yapın");
      return;
    }
    if (!tripData?.selectedPlace) {
      Alert.alert("Hata", "Lütfen bir yer seçin");
      return;
    }
    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert("Hata", "Lütfen seyahat tarihlerini seçin");
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      if (!db) throw new Error("Firestore başlatılamadı");

      const startDate =
        tripData.startDate instanceof Date
          ? tripData.startDate
          : new Date(tripData.startDate);
      const endDate =
        tripData.endDate instanceof Date
          ? tripData.endDate
          : new Date(tripData.endDate);

      const startDateTimestamp = Timestamp.fromDate(startDate);
      const endDateTimestamp = Timestamp.fromDate(endDate);

      const tripToSave = removeUndefinedFields({
        userId: auth?.currentUser?.uid,
        tripName: tripName.trim() || `${tripData.selectedPlace.name} Seyahati`,
        selectedPlace: {
          name: tripData.selectedPlace.name,
          address: tripData.selectedPlace.address,
          coordinates: tripData.selectedPlace.coordinates,
          url: tripData.selectedPlace.url,
          photoUrl: tripData.selectedPlace.photoUrl || null,
        },
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        duration: tripData.duration,
        travelers: tripData.travelers || 1,
        interests: tripData.interests || [],
        aiPlan: tripData.aiPlan || null,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("💾 Saving trip to Firestore...", tripToSave);
      const tripsRef = collection(db, "trips");
      const docRef = await addDoc(tripsRef, tripToSave);
      console.log("✅ Trip saved successfully to Firestore with ID:", docRef.id);

      try {
        if (tripData.startDate) {
          await scheduleTripNotifications({
            tripId: docRef.id,
            tripName: tripToSave.tripName,
            placeName: tripData.selectedPlace?.name || "Destinasyon",
            startDate:
              tripData.startDate instanceof Date
                ? tripData.startDate
                : new Date(tripData.startDate),
          });
        }
      } catch (notifErr) {
        console.warn("Bildirim zamanlanamadı:", notifErr);
      }

      setTripData(defaultTripData);
      console.log("🎉 Setting saved state to true...");
      setSaved(true);
    } catch (error) {
      console.error("❌ Trip save error:", error);
      setSaved(false);
      let errorMessage = error.message || "Bilinmeyen bir hata oluştu";
      if (error?.code === "permission-denied") {
        errorMessage =
          "Yazma izni reddedildi. Firestore güvenlik kurallarını kontrol edin.";
      } else if (error?.code === "unavailable") {
        errorMessage =
          "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
      }
      Alert.alert(
        "Kayıt Hatası",
        `Seyahat kaydedilirken bir hata oluştu:\n\n${errorMessage}\n\nLütfen tekrar deneyin.`,
        [{ text: "Tamam" }],
      );
    } finally {
      setSaving(false);
    }
  };

  const previewDays = tripData?.aiPlan?.itinerary?.slice(0, 2) || [];

  return (
    <View style={styles.screen}>
      {/* Dark header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Seyahatini Kaydet</Text>
          <Text style={styles.headerStep}>Adım 6 / 6</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Full progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={styles.progressBarFill} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Trip name input */}
        <View style={styles.nameSection}>
          <Text style={styles.nameLabel}>Seyahat Adı</Text>
          <TextInput
            style={styles.nameInput}
            placeholder={`${tripData?.selectedPlace?.name || "İstanbul"} Seyahati`}
            placeholderTextColor={TEXT_MUTED}
            value={tripName}
            onChangeText={setTripName}
            returnKeyType="done"
          />
        </View>

        {/* Summary card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Seyahat Özeti</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="location" size={16} color={ACCENT} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Yer</Text>
              <Text style={styles.summaryValue}>{tripData?.selectedPlace?.name || "Seçilmedi"}</Text>
            </View>
          </View>
          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calendar" size={16} color={ACCENT} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Tarih</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(tripData.startDate)} – {formatDate(tripData.endDate)}
                </Text>
              </View>
            </View>
          )}
          {tripData?.duration && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="time" size={16} color={ACCENT} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Süre</Text>
                <Text style={styles.summaryValue}>{tripData.duration} gün</Text>
              </View>
            </View>
          )}
        </View>

        {/* AI Plan preview (collapsible) */}
        {previewDays.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setItineraryExpanded((v) => !v)}
            >
              <View style={styles.collapsibleLeft}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="sparkles" size={16} color={ACCENT} />
                </View>
                <Text style={styles.cardTitle}>AI Plan Önizleme</Text>
              </View>
              <Ionicons
                name={itineraryExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={TEXT_MUTED}
              />
            </TouchableOpacity>

            {itineraryExpanded && (
              <View style={styles.itineraryBody}>
                {previewDays.map((day, idx) => (
                  <View key={idx} style={styles.dayPreviewItem}>
                    <View style={styles.dayPreviewBadge}>
                      <Text style={styles.dayPreviewBadgeText}>Gün {day.day}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayPreviewTitle}>{day.title}</Text>
                      {day.activities.slice(0, 2).map((act, aIdx) => (
                        <Text key={aIdx} style={styles.dayPreviewAct} numberOfLines={1}>
                          • {act}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
                {(tripData?.aiPlan?.itinerary?.length || 0) > 2 && (
                  <Text style={styles.moreDaysText}>
                    +{(tripData.aiPlan.itinerary.length - 2)} gün daha...
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notlar</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Seyahatinizle ilgili özel notlarınızı buraya yazabilirsiniz..."
            placeholderTextColor={TEXT_MUTED}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (saving || saved) && styles.saveBtnDisabled,
            saved && styles.saveBtnSuccess,
          ]}
          onPress={handleSaveTrip}
          disabled={saving || saved}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.saveBtnText}>Kaydediliyor...</Text>
            </>
          ) : saved ? (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Kaydedildi ✓</Text>
            </>
          ) : (
            <>
              <Ionicons name="save" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Seyahati Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Home button */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace("/(tabs)/mytrip")}
        >
          <Ionicons name="home-outline" size={20} color={ACCENT} />
          <Text style={styles.homeBtnText}>Anasayfaya Dön</Text>
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
    backgroundColor: "#D1D5DB",
  },
  progressBarFill: {
    height: 4,
    width: "100%",
    backgroundColor: ACCENT,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 50 },
  // Name input
  nameSection: {
    marginBottom: 16,
  },
  nameLabel: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  nameInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: "outfit-bold",
    fontSize: 20,
    color: TEXT_PRIMARY,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  summaryContent: { flex: 1 },
  summaryLabel: {
    fontFamily: "outfit",
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontFamily: "outfit-medium",
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  // Collapsible
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  collapsibleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itineraryBody: {
    marginTop: 14,
    gap: 12,
  },
  dayPreviewItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dayPreviewBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 2,
  },
  dayPreviewBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 11,
    color: "#fff",
  },
  dayPreviewTitle: {
    fontFamily: "outfit-bold",
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  dayPreviewAct: {
    fontFamily: "outfit",
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 19,
  },
  moreDaysText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  // Notes
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    fontFamily: "outfit",
    fontSize: 15,
    color: TEXT_PRIMARY,
    height: 110,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: -2,
  },
  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: {
    opacity: 0.8,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnSuccess: {
    backgroundColor: "#10B981",
  },
  saveBtnText: {
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: "#fff",
  },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E7FF",
    marginBottom: 10,
  },
  homeBtnText: {
    fontFamily: "outfit-medium",
    fontSize: 16,
    color: ACCENT,
  },
});
