import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  Linking,
  ScrollView,
  StatusBar,
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
import {
  searchDiscoverPlaces,
  type DiscoverPlace,
} from "../../services/placesService";
import {
  getGooglePlacesApiKey,
  isPlaceholderKey,
  shouldUseApiProxy,
} from "../../configs/env";
import { requireDb } from "../../utils/firestore";
import { getPlaceImageUrl } from "../../utils/imageHelper";

const INDIGO = "#6366F1";
const BG = "#F5F7FB";
const DARK_HEADER = "#0A0F1E";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const DANGER = "#EF4444";

const defaultPlaces = [
  {
    id: "paris",
    title: "Paris, Fransa",
    description: "Işıklar Şehri • Eyfel Kulesi • Louvre Müzesi",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=60",
  },
  {
    id: "nyc",
    title: "New York, ABD",
    description: "Times Square • Central Park • Broadway",
    image:
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=900&q=60",
  },
  {
    id: "istanbul",
    title: "İstanbul, Türkiye",
    description: "Boğaz • Ayasofya • Kapalıçarşı",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=60",
  },
];

const CATEGORY_CHIPS = [
  { label: "İstanbul", icon: "🕌" },
  { label: "Paris", icon: "🗼" },
  { label: "Tokyo", icon: "🌸" },
  { label: "Bali", icon: "🌴" },
  { label: "New York", icon: "🗽" },
  { label: "Roma", icon: "🏛️" },
  { label: "Barcelona", icon: "⛵" },
  { label: "Dubai", icon: "🌆" },
];

const buildMapsUrl = (place) => {
  if (place.url) {
    return place.url;
  }
  if (place.coordinates) {
    const { lat, lon } = place.coordinates;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title)}`;
};

export default function Discover() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [places, setPlaces] = useState(defaultPlaces);
  const [loading, setLoading] = useState(false);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [placesConfigAlertShown, setPlacesConfigAlertShown] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Kaydedilen yerleri dinle
  useEffect(() => {
    if (!auth || !db) return;

    if (!auth?.currentUser) return;

    const savedPlacesRef = collection(db, "savedPlaces");
    const q = query(
      savedPlacesRef,
      where("userId", "==", auth?.currentUser?.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const savedIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.placeId) {
            savedIds.add(String(data.placeId));
          }
        });
        setSavedPlaceIds(savedIds);
      },
      (error) => {
        console.error("Error fetching saved places:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const showDefaultIfEmpty = () => {
    setPlaces(defaultPlaces);
    setLoading(false);
  };

  const mapDiscoverResults = (results: DiscoverPlace[]) =>
    results.map((place) => ({
      id: place.id,
      placeId: place.placeId || place.id,
      title: place.title,
      description: place.description || "Haritada açmak için dokunun",
      coordinates: place.coordinates,
      image: getPlaceImageUrl(place.title),
      url: place.url,
    }));

  const fetchPlaces = async (text: string) => {
    setLoading(true);

    if (
      !shouldUseApiProxy() &&
      isPlaceholderKey(getGooglePlacesApiKey())
    ) {
      console.warn("⚠️ Google Places API key bulunamadı.");
      showDefaultIfEmpty();
      return;
    }

    try {
      const results = await searchDiscoverPlaces(text);
      if (results.length > 0) {
        setPlaces(mapDiscoverResults(results));
      } else {
        showDefaultIfEmpty();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Discover search failed:", message);

      const isPermissionIssue =
        message.includes("403") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("REQUEST_DENIED") ||
        message.includes("API key");

      if (isPermissionIssue && !placesConfigAlertShown) {
        setPlacesConfigAlertShown(true);
        Alert.alert(
          "Google Places Ayarı Gerekli",
          "Places API (New) etkin, billing açık ve API key kısıtları doğru olmalı.",
        );
      }

      showDefaultIfEmpty();
    } finally {
      setLoading(false);
    }
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (overrideText?: string) => {
    const trimmed = (overrideText ?? searchText).trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!trimmed) {
      showDefaultIfEmpty();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchPlaces(trimmed);
    }, 500);
  };

  const handleChipPress = (label: string) => {
    setSearchText(label);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    fetchPlaces(label);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getPlaceUniqueId = (place) => {
    if (place.placeId) {
      return String(place.placeId);
    }
    if (place.coordinates && place.coordinates.lat && place.coordinates.lon) {
      return `${place.coordinates.lat}-${place.coordinates.lon}`;
    }
    return String(place.id || place.title || "unknown");
  };

  const isPlaceSaved = (place) => {
    const uniqueId = getPlaceUniqueId(place);
    return savedPlaceIds.has(uniqueId);
  };

  const handleSavePlace = async (place, e) => {
    e?.stopPropagation();

    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, initMessage);
      return;
    }

    if (!auth?.currentUser) {
      Alert.alert(
        "Giriş Gerekli",
        "Yerleri kaydetmek için lütfen giriş yapın.",
      );
      return;
    }

    if (!place) {
      console.error("Place is undefined");
      return;
    }

    const placeId = getPlaceUniqueId(place);

    if (!placeId || placeId === "unknown") {
      Alert.alert(
        "Hata",
        "Bu yer kaydedilemiyor. Lütfen başka bir yer deneyin.",
      );
      return;
    }

    const isSaved = isPlaceSaved(place);

    const safePlaceId = String(placeId || "unknown").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const docId = `${auth?.currentUser?.uid}_${safePlaceId}`;

    try {
      if (isSaved) {
        await deleteDoc(doc(requireDb(db), "savedPlaces", docId));
        Alert.alert("Kaldırıldı", "Yer kaydedilenlerden çıkarıldı.");
      } else {
        const savedPlaceData = {
          userId: auth?.currentUser?.uid,
          placeId: placeId,
          name: place.title,
          address: place.description || place.title,
          coordinates: place.coordinates || null,
          photoUrl: place.image || null,
          url: buildMapsUrl(place),
          savedAt: serverTimestamp(),
        };

        await setDoc(doc(requireDb(db), "savedPlaces", docId), savedPlaceData);
        Alert.alert("Kaydedildi", "Yer favorilere eklendi! ❤️");
      }
    } catch (error) {
      console.error("Error saving/removing place:", error);
      Alert.alert("Hata", "İşlem sırasında bir hata oluştu.");
    }
  };

  const renderTripCard = ({ item }) => {
    const saved = isPlaceSaved(item);

    return (
      <TouchableOpacity
        style={{
          borderRadius: 20,
          marginBottom: 18,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 12,
          elevation: 5,
          backgroundColor: "#FFFFFF",
        }}
        onPress={() => Linking.openURL(buildMapsUrl(item))}
        activeOpacity={0.93}
      >
        <ImageBackground
          source={{ uri: item.image }}
          style={{ height: 200, justifyContent: "flex-end" }}
          resizeMode="cover"
        >
          {/* Dark gradient overlay at top (for heart button) */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 80,
              backgroundColor: "rgba(0,0,0,0.25)",
            }}
          />

          {/* Heart save button — top right */}
          {auth?.currentUser && (
            <TouchableOpacity
              onPress={(e) => handleSavePlace(item, e)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: saved
                  ? "rgba(239,68,68,0.9)"
                  : "rgba(255,255,255,0.25)",
                borderWidth: saved ? 0 : 1,
                borderColor: "rgba(255,255,255,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}

          {/* Bottom overlay: title, description, rating, maps link */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 40,
              backgroundColor: "rgba(0,0,0,0.52)",
            }}
          >
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 19,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {item.title}
            </Text>

            <Text
              style={{
                fontFamily: "outfit",
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                marginBottom: item.rating ? 6 : 10,
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            {item.rating && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="star" size={14} color="#F6B100" />
                <Text
                  style={{
                    fontFamily: "outfit-medium",
                    fontSize: 13,
                    color: "#FFFFFF",
                  }}
                >
                  {item.rating.toFixed(1)}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="map-outline" size={13} color="rgba(255,255,255,0.75)" />
              <Text
                style={{
                  fontFamily: "outfit-medium",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                Maps'te Aç →
              </Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_HEADER} />

      {/* Dark header section */}
      <View
        style={{
          backgroundColor: DARK_HEADER,
          paddingTop: 52,
          paddingBottom: 24,
          paddingHorizontal: 24,
          shadowColor: INDIGO,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "outfit-bold",
            fontSize: 28,
            color: "#FFFFFF",
            letterSpacing: 0.3,
          }}
        >
          Keşfet
        </Text>
        <Text
          style={{
            fontFamily: "outfit",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            marginTop: 3,
          }}
        >
          Her yerden ilham alın — dünya seni bekliyor
        </Text>
      </View>

      {/* Search bar — below the dark header, floating */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: -20,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 13,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 8,
          zIndex: 10,
          marginBottom: 16,
        }}
      >
        <TextInput
          placeholder="Destinasyon ara... İstanbul, Tokyo, Bali"
          placeholderTextColor={TEXT_MUTED}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => handleSearch()}
          style={{ flex: 1, fontFamily: "outfit", fontSize: 15, color: TEXT_PRIMARY }}
        />
        <TouchableOpacity
          onPress={() => handleSearch()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: INDIGO,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="search" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Category chips — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {CATEGORY_CHIPS.map((chip) => {
          const isActive = searchText.toLowerCase() === chip.label.toLowerCase();
          return (
            <TouchableOpacity
              key={chip.label}
              onPress={() => handleChipPress(chip.label)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 50,
                backgroundColor: isActive ? INDIGO : "#FFFFFF",
                borderWidth: 1,
                borderColor: isActive ? INDIGO : "#E5E7EB",
                shadowColor: isActive ? INDIGO : "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.25 : 0.06,
                shadowRadius: 6,
                elevation: isActive ? 4 : 1,
              }}
            >
              <Text style={{ fontSize: 14 }}>{chip.icon}</Text>
              <Text
                style={{
                  fontFamily: "outfit-medium",
                  fontSize: 13,
                  color: isActive ? "#FFFFFF" : TEXT_PRIMARY,
                }}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />
    </View>
  );
}
