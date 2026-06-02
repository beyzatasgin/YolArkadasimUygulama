import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation } from "expo-router";
import {
  collection,
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
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());
  const [placesConfigAlertShown, setPlacesConfigAlertShown] = useState(false);

  const getGooglePlacesApiKey = () =>
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY ||
    Constants.expoConfig?.extra?.googlePlacesApiKey ||
    Constants.expoConfig?.extra?.googleMapKey ||
    Constants.manifest?.extra?.googlePlacesApiKey;

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
        const savedIds = new Set();
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Place ID'yi ekle
          if (data.placeId) {
            savedIds.add(data.placeId);
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

  const fetchPlaces = async (text, retryCount = 0) => {
    setLoading(true);

    const apiKey = getGooglePlacesApiKey();
    if (!apiKey || apiKey.includes("YOUR_")) {
      console.warn("⚠️ Google Places API key bulunamadı.");
      showDefaultIfEmpty();
      return;
    }

    // Timeout kontrolü için AbortController - 15 saniye (daha uzun timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
          },
          body: JSON.stringify({
            textQuery: text,
            languageCode: "tr",
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId); // Başarılı ise timeout'u temizle

      // Response kontrolü
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          errorBody?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (Array.isArray(data?.places) && data.places.length > 0) {
        const mapped = data.places.map((place, index) => {
          // Place adına göre görsel oluştur
          const getPlaceImageUrl = (placeName) => {
            if (!placeName)
              return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80";

            const cleanName = placeName.split(",")[0].trim().toLowerCase();
            const placeImageMap = {
              istanbul:
                "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80",
              ankara:
                "https://images.unsplash.com/photo-1622542796254-5b9c46ab0d2f?auto=format&fit=crop&w=900&q=80",
              izmir:
                "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=900&q=80",
              antalya:
                "https://images.unsplash.com/photo-1573992554021-93fa646ad55e?auto=format&fit=crop&w=900&q=80",
              paris:
                "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
              london:
                "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
              tokyo:
                "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80",
              "new york":
                "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80",
              barcelona:
                "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80",
              rome: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=900&q=80",
            };

            if (placeImageMap[cleanName]) {
              return placeImageMap[cleanName];
            }

            const travelImages = [
              "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
              "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80",
              "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80",
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
            ];

            let hash = 0;
            for (let i = 0; i < cleanName.length; i++) {
              hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
            }
            return travelImages[Math.abs(hash) % travelImages.length];
          };

          const placeName = place.displayName?.text || "travel";
          const imageUrl = getPlaceImageUrl(placeName);
          const lat = place.location?.latitude;
          const lng = place.location?.longitude;

          return {
            id: place.id || `place-${index}`,
            placeId: place.id,
            title: place.displayName?.text || "Bilinmeyen Yer",
            description:
              place.formattedAddress || "Haritada açmak için dokunun",
            coordinates: {
              lat,
              lon: lng,
            },
            image: imageUrl,
            url: place.googleMapsUri,
          };
        });
        setPlaces(mapped);
      } else {
        showDefaultIfEmpty();
      }
    } catch (error) {
      clearTimeout(timeoutId); // Hata durumunda timeout'u temizle

      // Abort hatası (timeout)
      if (error.name === "AbortError") {
        console.warn(
          "⚠️ Google Places API timeout - istek zamanında tamamlanamadı",
        );

        // Retry mekanizması (maksimum 1 deneme - rate limit'i önlemek için)
        if (retryCount < 1) {
          console.log(
            `🔄 Google Places API retry denemesi ${retryCount + 1}/1...`,
          );
          // Daha uzun bekleme süresi
          setTimeout(() => fetchPlaces(text, retryCount + 1), 3000);
          return;
        }

        console.warn(
          "⚠️ Google Places API yavaş yanıt veriyor. Varsayılan yerler gösteriliyor.",
        );
        showDefaultIfEmpty();
        return;
      }

      // Network hatası
      if (
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch")
      ) {
        console.warn(
          "⚠️ Google Places API network hatası - internet bağlantısını kontrol edin",
        );

        // Retry mekanizması (maksimum 1 deneme - rate limit'i önlemek için)
        if (retryCount < 1) {
          console.log(
            `🔄 Google Places API retry denemesi ${retryCount + 1}/1...`,
          );
          // Network hatalarında daha uzun bekleme
          setTimeout(() => fetchPlaces(text, retryCount + 1), 3000);
          return;
        }
        console.warn(
          "⚠️ İnternet bağlantısı hatası. Varsayılan yerler gösteriliyor.",
        );
        showDefaultIfEmpty();
        return;
      } else {
        const message = error?.message || String(error);
        console.error("❌ Discover search failed:", message);

        const isPermissionIssue =
          message.includes("403") ||
          message.includes("PERMISSION_DENIED") ||
          message.includes("REQUEST_DENIED") ||
          message.includes("API key") ||
          message.includes("not enabled");

        if (isPermissionIssue && !placesConfigAlertShown) {
          setPlacesConfigAlertShown(true);
          Alert.alert(
            "Google Places Ayarı Gerekli",
            "API 403 dönüyor. Places API (New) etkin, billing açık ve API key kısıtları doğru olmalı.",
          );
        }
      }

      showDefaultIfEmpty();
    } finally {
      setLoading(false);
    }
  };

  // Debounce için ref
  const searchTimeoutRef = useRef(null);

  const handleSearch = () => {
    const trimmed = searchText.trim();

    // Önceki timeout'u iptal et
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!trimmed) {
      showDefaultIfEmpty();
      return;
    }

    // 500ms bekle, sonra arama yap (debounce)
    searchTimeoutRef.current = setTimeout(() => {
      fetchPlaces(trimmed);
    }, 500);
  };

  // Component unmount olduğunda timeout'u temizle
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
    // Default places için id veya title kullan
    return String(place.id || place.title || "unknown");
  };

  const isPlaceSaved = (place) => {
    const uniqueId = getPlaceUniqueId(place);
    return savedPlaceIds.has(uniqueId);
  };

  const handleSavePlace = async (place, e) => {
    e?.stopPropagation(); // Parent TouchableOpacity'yi tetikleme

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

    try {
      if (isSaved) {
        // Yeri kaldır
        // Bu basit bir yaklaşım, gerçek uygulamada daha iyi bir yöntem kullanılabilir
        Alert.alert(
          "Bilgi",
          "Yeri kaldırmak için Kaydedilen Yerler sayfasına gidin.",
        );
      } else {
        // Yeri kaydet
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

        // Unique ID oluştur (placeId + userId kombinasyonu)
        // placeId'yi güvenli bir şekilde temizle
        const safePlaceId = String(placeId || "unknown").replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );
        const docId = `${auth?.currentUser?.uid}_${safePlaceId}`;
        await setDoc(doc(db, "savedPlaces", docId), savedPlaceData);

        Alert.alert("Başarılı", "Yer kaydedildi!");
      }
    } catch (error) {
      console.error("Error saving place:", error);
      Alert.alert("Hata", "Yer kaydedilirken bir hata oluştu.");
    }
  };

  const renderTripCard = ({ item }) => {
    const saved = isPlaceSaved(item);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: Colors.WHITE,
          borderRadius: 20,
          marginBottom: 20,
          overflow: "hidden",
          elevation: 2,
        }}
        onPress={() => Linking.openURL(buildMapsUrl(item))}
      >
        <ImageBackground
          source={{ uri: item.image }}
          style={{ height: 190, justifyContent: "flex-end" }}
        >
          <View
            style={{
              padding: 14,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "outfit-bold",
                    fontSize: 18,
                    color: Colors.WHITE,
                  }}
                >
                  {item.title}
                </Text>
                {item.rating && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                    }}
                  >
                    <Ionicons name="star" size={16} color="#F6B100" />
                    <Text style={{ color: Colors.WHITE, marginLeft: 6 }}>
                      {item.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              {auth?.currentUser && (
                <TouchableOpacity
                  onPress={(e) => handleSavePlace(item, e)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: saved
                      ? "rgba(239, 68, 68, 0.9)"
                      : "rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <Ionicons
                    name={saved ? "heart" : "heart-outline"}
                    size={20}
                    color={Colors.WHITE}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ImageBackground>
        <View style={{ padding: 16 }}>
          <Text style={{ fontFamily: "outfit", color: Colors.GRAY }}>
            {item.description}
          </Text>
          <Text
            style={{
              fontFamily: "outfit-medium",
              color: Colors.PRIMARY,
              marginTop: 10,
            }}
          >
            {"Google Maps'te Görüntüle ->"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F5F7FB",
        paddingHorizontal: 25,
        paddingTop: 60,
      }}
    >
      <Text
        style={{
          fontFamily: "outfit-bold",
          fontSize: 32,
          color: Colors.PRIMARY,
        }}
      >
        Keşfet
      </Text>
      <Text
        style={{
          fontFamily: "outfit",
          color: Colors.GRAY,
          marginTop: 6,
          marginBottom: 20,
        }}
      >
        {"Her yerden ilham alın - 'İstanbul', 'Tokyo', 'Bali' deneyin..."}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.WHITE,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <TextInput
          placeholder="Dünya genelinde destinasyon arayın"
          placeholderTextColor={Colors.GRAY}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          style={{ flex: 1, fontFamily: "outfit" }}
        />
        <TouchableOpacity onPress={handleSearch}>
          {loading ? (
            <ActivityIndicator color={Colors.PRIMARY} />
          ) : (
            <Ionicons name="search" size={22} color={Colors.PRIMARY} />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
