import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../configs/FirebaseMessages";

const ACCENT = "#6366F1";
const BG = "#F5F7FB";
const DARK_BG = "#0A0F1E";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const DANGER = "#EF4444";

export default function SavedPlaces() {
  const navigation = useNavigation();
  const router = useRouter();
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, initMessage);
      setLoading(false);
      return;
    }

    if (!auth?.currentUser || !db) {
      setLoading(false);
      return;
    }

    const savedPlacesRef = collection(db, "savedPlaces");
    const q = query(
      savedPlacesRef,
      where("userId", "==", auth?.currentUser?.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const places = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          places.push({
            id: docSnap.id,
            ...data,
            savedAt: data.savedAt?.toDate ? data.savedAt.toDate() : new Date(),
          });
        });
        places.sort((a, b) => {
          const aDate = a.savedAt || new Date(0);
          const bDate = b.savedAt || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        setSavedPlaces(places);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching saved places:", error);
        if (error.code === "failed-precondition") {
          console.warn(
            "⚠️ Firestore composite index gerekiyor. Sadece userId ile filtreleme yapılıyor.",
          );
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleDeletePlace = async (placeId) => {
    Alert.alert(
      "Yeri Kaldır",
      "Bu yeri kaydedilenlerden kaldırmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "savedPlaces", placeId));
            } catch (error) {
              console.error("Error deleting place:", error);
              Alert.alert("Hata", "Yer kaldırılırken bir hata oluştu.");
            }
          },
        },
      ],
    );
  };

  const openInMaps = (place) => {
    if (place.coordinates) {
      const { lat, lon } = place.coordinates;
      const url =
        place.url ||
        `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      Linking.openURL(url).catch((err) => {
        console.error("Maps açma hatası:", err);
        Alert.alert("Hata", "Harita açılamadı");
      });
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const statusBarHeight =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 44;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />
        {/* Dark header */}
        <View
          style={{
            backgroundColor: DARK_BG,
            paddingTop: statusBarHeight + 12,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={ACCENT} />
          <Text
            style={{
              fontFamily: "outfit",
              color: TEXT_MUTED,
              marginTop: 12,
              fontSize: 14,
            }}
          >
            Yükleniyor...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />

      {/* ── Dark Header ── */}
      <View
        style={{
          backgroundColor: DARK_BG,
          paddingTop: statusBarHeight + 12,
          paddingBottom: 24,
          paddingHorizontal: 20,
          // Glow effect via shadow
          shadowColor: ACCENT,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {/* Subtle glow blob */}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 40,
            width: 120,
            height: 80,
            borderRadius: 60,
            backgroundColor: "rgba(99,102,241,0.15)",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Back button – white circle */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.12)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 22,
                color: "#FFFFFF",
                letterSpacing: 0.3,
              }}
            >
              Kaydedilen Yerler
            </Text>
          </View>
        </View>

        {/* Count badge */}
        {savedPlaces.length > 0 && (
          <View
            style={{
              marginTop: 14,
              alignSelf: "flex-start",
              marginLeft: 54,
              backgroundColor: ACCENT,
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontFamily: "outfit-medium",
                fontSize: 13,
                color: "#FFFFFF",
              }}
            >
              {savedPlaces.length} yer kaydedildi
            </Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {savedPlaces.length === 0 ? (
          /* ── Empty State ── */
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: "#EEF2FF",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="heart-outline" size={52} color={ACCENT} />
            </View>

            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 22,
                color: TEXT_PRIMARY,
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Henüz Kaydedilen Yer Yok
            </Text>
            <Text
              style={{
                fontFamily: "outfit",
                fontSize: 15,
                color: TEXT_MUTED,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 36,
              }}
            >
              Keşfet sayfasından beğendiğiniz yerleri kaydedebilirsiniz
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)/discover")}
              style={{
                paddingHorizontal: 32,
                paddingVertical: 14,
                backgroundColor: ACCENT,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "outfit-bold",
                  fontSize: 15,
                }}
              >
                Keşfet'e Git
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Place Cards ── */
          savedPlaces.map((place) => (
            <View
              key={place.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                marginBottom: 18,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              {/* ── Image section ── */}
              {place.photoUrl ? (
                <View style={{ height: 160, position: "relative" }}>
                  <Image
                    source={{ uri: place.photoUrl }}
                    style={{ width: "100%", height: 160 }}
                    resizeMode="cover"
                  />
                  {/* Dark overlay with place name */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 90,
                      justifyContent: "flex-end",
                      paddingHorizontal: 14,
                      paddingBottom: 12,
                      backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "outfit-bold",
                        fontSize: 18,
                        color: "#FFFFFF",
                        lineHeight: 22,
                      }}
                      numberOfLines={2}
                    >
                      {place.name}
                    </Text>
                  </View>
                </View>
              ) : (
                /* Indigo placeholder */
                <View
                  style={{
                    height: 160,
                    backgroundColor: ACCENT,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="location" size={28} color="#FFFFFF" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "outfit-bold",
                      fontSize: 17,
                      color: "#FFFFFF",
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                    numberOfLines={2}
                  >
                    {place.name}
                  </Text>
                </View>
              )}

              {/* ── Card body ── */}
              <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                {/* Address row */}
                {place.address && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={TEXT_MUTED}
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      style={{
                        fontFamily: "outfit",
                        fontSize: 13,
                        color: TEXT_MUTED,
                        flex: 1,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {place.address}
                    </Text>
                  </View>
                )}

                {/* Date saved */}
                {place.savedAt && (
                  <Text
                    style={{
                      fontFamily: "outfit",
                      fontSize: 11,
                      color: "#C4C9D4",
                      marginBottom: 12,
                    }}
                  >
                    {formatDate(place.savedAt)} tarihinde kaydedildi
                  </Text>
                )}

                {/* Action row */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  {/* Haritada Gör button */}
                  <TouchableOpacity
                    onPress={() => openInMaps(place)}
                    style={{
                      flex: 1,
                      height: 42,
                      backgroundColor: ACCENT,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      shadowColor: ACCENT,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    <Ionicons name="map-outline" size={17} color="#FFFFFF" />
                    <Text
                      style={{
                        fontFamily: "outfit-medium",
                        fontSize: 13,
                        color: "#FFFFFF",
                      }}
                    >
                      Haritada Gör
                    </Text>
                  </TouchableOpacity>

                  {/* Red heart delete button */}
                  <TouchableOpacity
                    onPress={() => handleDeletePlace(place.id)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: "#FEF2F2",
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                  >
                    <Ionicons name="heart" size={20} color={DANGER} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
