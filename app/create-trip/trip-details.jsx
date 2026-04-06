import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  useCallback,
  useContext,
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
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const removeUndefinedFields = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

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
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [tripName, setTripName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/create-trip/review-trip");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "Seyahat Detayları",
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ paddingHorizontal: 6, paddingVertical: 6 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [handleGoBack, navigation]);

  // Kaydedildiğinde otomatik yönlendirme
  useEffect(() => {
    if (saved) {
      console.log("✅ Trip saved, redirecting to My Trips in 1.5 seconds...");
      const timer = setTimeout(async () => {
        console.log("🔄 Starting navigation to My Trips...");

        // Async navigation - expo-router router.replace Promise döndürebilir
        try {
          // İlk deneme: tabs path ile (await ile)
          await router.replace("/(tabs)/mytrip");
          console.log("✅ Navigation successful with /(tabs)/mytrip");
        } catch (error) {
          console.warn("⚠️ First navigation attempt failed:", error);
          console.log("🔄 Trying alternative path: /mytrip");

          try {
            // İkinci deneme: basit path ile (sign-in ve sign-up'da kullanılan)
            await router.replace("/mytrip");
            console.log("✅ Navigation successful with /mytrip");
          } catch (error2) {
            console.warn("⚠️ Second navigation attempt failed:", error2);
            console.log("🔄 Trying push method...");

            try {
              // Üçüncü deneme: push ile
              await router.push("/(tabs)/mytrip");
              console.log("✅ Navigation successful with push");
            } catch (error3) {
              console.error("❌ All navigation attempts failed:", error3);
              // Son çare: Ana sayfaya git (kullanıcı logged in ise oradan mytrip'e yönlendirilecek)
              try {
                await router.replace("/");
              } catch (finalError) {
                console.error(
                  "❌ Final navigation attempt failed:",
                  finalError,
                );
                // Alert göster
                Alert.alert(
                  "Başarılı",
                  "Seyahatiniz kaydedildi. Lütfen manuel olarak Seyahatlerim sayfasına gidin.",
                  [
                    {
                      text: "Tamam",
                      onPress: () => {
                        // Kullanıcı manuel olarak gidebilir
                      },
                    },
                  ],
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

  // Tarih formatı
  const formatDate = (date) => {
    if (!date) return "Seçilmedi";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Seyahati kaydet
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
      if (!db) {
        throw new Error("Firestore başlatılamadı");
      }

      // Tarihleri Firestore Timestamp'e dönüştür
      const startDate =
        tripData.startDate instanceof Date
          ? tripData.startDate
          : new Date(tripData.startDate);
      const endDate =
        tripData.endDate instanceof Date
          ? tripData.endDate
          : new Date(tripData.endDate);

      // Firestore Timestamp'e dönüştür
      const startDateTimestamp = Timestamp.fromDate(startDate);
      const endDateTimestamp = Timestamp.fromDate(endDate);

      // Seyahat verilerini hazırla
      const tripToSave = removeUndefinedFields({
        userId: auth?.currentUser?.uid,
        tripName: tripName.trim() || `${tripData.selectedPlace.name} Seyahati`,
        selectedPlace: {
          name: tripData.selectedPlace.name,
          address: tripData.selectedPlace.address,
          coordinates: tripData.selectedPlace.coordinates,
          url: tripData.selectedPlace.url,
          photoUrl: tripData.selectedPlace.photoUrl || null, // Place görseli
        },
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        duration: tripData.duration,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Firebase Firestore'a kaydet
      console.log("💾 Saving trip to Firestore...", tripToSave);
      const tripsRef = collection(db, "trips");
      const docRef = await addDoc(tripsRef, tripToSave);
      console.log(
        "✅ Trip saved successfully to Firestore with ID:",
        docRef.id,
      );
      console.log("📝 Doc ref:", docRef);

      // Context'i temizle
      setTripData({
        selectedPlace: null,
        startDate: null,
        endDate: null,
        duration: null,
        accommodation: null,
        transportation: null,
      });

      // Başarılı durumu göster - useEffect ile otomatik yönlendirme yapılacak
      console.log("🎉 Setting saved state to true...");
      setSaved(true);
      console.log(
        "✅ Saved state updated, useEffect should trigger navigation",
      );
    } catch (error) {
      console.error("❌ Trip save error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // State'leri sıfırla
      setSaved(false);

      // Kullanıcıya hata mesajı göster
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Seyahat Detayları</Text>
        <Text style={styles.subtitle}>
          Seyahatinizi kişiselleştirin ve kaydedin
        </Text>

        {/* Seyahat Özeti */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seyahat Özeti</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="location" size={20} color={Colors.PRIMARY} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Yer</Text>
              <Text style={styles.summaryValue}>
                {tripData?.selectedPlace?.name || "Seçilmedi"}
              </Text>
            </View>
          </View>

          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar" size={20} color={Colors.PRIMARY} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Tarih</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(tripData.startDate)} -{" "}
                  {formatDate(tripData.endDate)}
                </Text>
              </View>
            </View>
          )}

          {tripData?.duration && (
            <View style={styles.summaryRow}>
              <Ionicons name="time" size={20} color={Colors.PRIMARY} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Süre</Text>
                <Text style={styles.summaryValue}>{tripData.duration} gün</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seyahat Adı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seyahat Adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: İstanbul Macerası"
            placeholderTextColor={Colors.GRAY}
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Seyahatinizle ilgili özel notlarınızı buraya yazabilirsiniz..."
            placeholderTextColor={Colors.GRAY}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving || saved) && styles.saveButtonDisabled,
            saved && styles.saveButtonSuccess,
          ]}
          onPress={handleSaveTrip}
          disabled={saving || saved}
        >
          {saving ? (
            <>
              <ActivityIndicator
                size="small"
                color={Colors.WHITE}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
            </>
          ) : saved ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.WHITE}
              />
              <Text style={styles.saveButtonText}>Kaydedildi ✓</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.WHITE}
              />
              <Text style={styles.saveButtonText}>Seyahati Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Anasayfaya Dön Butonu */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            router.replace("/(tabs)/mytrip");
          }}
        >
          <Ionicons name="home-outline" size={24} color={Colors.PRIMARY} />
          <Text style={styles.homeButtonText}>Anasayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  content: {
    padding: 25,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 12,
    backgroundColor: Colors.WHITE,
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
  },
  notesInput: {
    height: 100,
    paddingTop: 15,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 30,
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonSuccess: {
    backgroundColor: "#10B981", // Yeşil renk
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: Colors.WHITE,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 30,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  homeButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
});
