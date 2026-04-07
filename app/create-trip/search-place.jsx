import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
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
  FlatList,
  ImageBackground,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "./../../context/CreateTripContext";
export default function SearchPlace() {
  const navigation = useNavigation();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [searchText, setSearchText] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [placesConfigAlertShown, setPlacesConfigAlertShown] = useState(false);
  const router = useRouter();

  const getGooglePlacesApiKey = () =>
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY ||
    Constants.expoConfig?.extra?.googlePlacesApiKey ||
    Constants.expoConfig?.extra?.googleMapKey ||
    Constants.manifest?.extra?.googlePlacesApiKey;

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/mytrip");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "Yer Ara",
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

  // 🔹 Yer arama - Google Places API (New) autocomplete
  const searchPlaces = async (text, retryCount = 0) => {
    if (text.length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);

    const apiKey = getGooglePlacesApiKey();
    if (!apiKey || apiKey.includes("YOUR_")) {
      console.warn("⚠️ Google Places API key bulunamadı.");
      setPredictions([]);
      setLoading(false);
      return;
    }

    // Timeout kontrolü için AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    try {
      const autoCompleteResponse = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
          },
          body: JSON.stringify({
            input: text,
            languageCode: "tr",
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!autoCompleteResponse.ok) {
        const errorBody = await autoCompleteResponse.json().catch(() => ({}));
        const errorMessage =
          errorBody?.error?.message ||
          `HTTP error! status: ${autoCompleteResponse.status}`;
        throw new Error(errorMessage);
      }

      const data = await autoCompleteResponse.json();

      if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
        const formattedPredictions = data.suggestions
          .map((item) => item.placePrediction)
          .filter(Boolean)
          .map((place) => {
            const fullText = place.text?.text || "Bilinmeyen";
            const [main, ...rest] = fullText.split(",");
            return {
              place_id: place.placeId,
              description: fullText,
              structured_formatting: {
                main_text: main?.trim() || "Bilinmeyen",
                secondary_text: rest.join(",").trim(),
              },
            };
          });

        setPredictions(formattedPredictions);
      } else {
        setPredictions([]);
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
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }

        // Timeout sonrası kullanıcıya bilgi ver
        setPredictions([]);
        console.warn(
          "⚠️ Google Places API yavaş yanıt veriyor. Lütfen daha sonra tekrar deneyin.",
        );
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
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }

        // Network hatası sonrası kullanıcıya bilgi ver
        setPredictions([]);
        console.warn(
          "⚠️ İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.",
        );
        return;
      } else {
        const message = error?.message || String(error);
        console.error("❌ Google Places API hatası:", message);

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
            "API 403 dönüyor. Google Cloud'da Places API (New) etkin ve faturalandırma açık olmalı. Ayrıca API key kısıtlarını kontrol edin.",
          );
        }
      }

      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search - kullanıcı yazmayı bitirdikten 500ms sonra arama yap
  const handleSearchChange = (text) => {
    setSearchText(text);

    // Önceki timeout'u iptal et
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Boş ise hemen temizle
    if (text.length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    // Rate limiting: son aramadan en az 1 saniye geçmiş olmalı
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    const minDelay = 1000; // 1 saniye minimum bekleme

    if (timeSinceLastSearch < minDelay) {
      // Çok yakın zamanda arama yapıldı, debounce ile bekle
      const delay = minDelay - timeSinceLastSearch + 500; // Ekstra 500ms debounce
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, delay);
      setSearchTimeout(timeout);
    } else {
      // Yeterli süre geçmiş, debounce ile arama yap
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, 500); // 500ms debounce
      setSearchTimeout(timeout);
    }
  };

  // Component unmount olduğunda timeout'u temizle
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Google Places fotoğrafı yoksa fallback görsel kullan
  const getPlaceImageUrl = (placeName) => {
    return getFallbackImageUrl(placeName);
  };

  // Fallback görsel URL oluştur (API key yoksa veya hata durumunda)
  const getFallbackImageUrl = (placeName) => {
    try {
      const cleanName =
        placeName?.split(",")[0].trim().toLowerCase() || "travel";
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
    } catch (_error) {
      return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80";
    }
  };

  // 🔹 Seçilen yerin detaylarını çek - Google Places API (New) details
  const fetchPlaceDetails = async (placeId, lat, lon, retryCount = 0) => {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey || apiKey.includes("YOUR_")) {
      console.warn("⚠️ Google Places API key bulunamadı.");
      return;
    }

    // Timeout kontrolü için AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?languageCode=tr&key=${apiKey}`,
        {
          headers: {
            "X-Goog-FieldMask":
              "id,displayName,formattedAddress,location,googleMapsUri,rating,userRatingCount,regularOpeningHours.openNow,photos.name",
          },
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

      const place = await response.json();

      if (place && !place.error) {
        const latitude = place.location?.latitude ?? parseFloat(lat || 0);
        const longitude = place.location?.longitude ?? parseFloat(lon || 0);
        const googleMapsUrl =
          place.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

        const placeName = place.displayName?.text || "Bilinmeyen Yer";
        const photoName = place.photos?.[0]?.name;
        const photoUrl = photoName
          ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&key=${apiKey}`
          : getPlaceImageUrl(placeName);

        const details = {
          name: placeName,
          address: place.formattedAddress || "Adres bilgisi yok",
          coordinates: {
            lat: latitude,
            lon: longitude,
          },
          url: googleMapsUrl,
          photoUrl,
          rating: place.rating || null,
          totalReviews: place.userRatingCount || null,
          isOpenNow: place.regularOpeningHours?.openNow ?? null,
        };

        setSelectedPlace(details);
        console.log("📍 Detaylı yer bilgisi:", details);
        console.log("📸 Görsel URL:", photoUrl);
      } else {
        throw new Error(place?.error?.message || "Yer bilgisi alınamadı");
      }
    } catch (error) {
      clearTimeout(timeoutId); // Hata durumunda timeout'u temizle

      // Abort hatası (timeout)
      if (error.name === "AbortError") {
        console.warn(
          "⚠️ Google Places API timeout - yer detayları zamanında alınamadı",
        );

        // Retry mekanizması (maksimum 2 deneme)
        if (retryCount < 2) {
          console.log(
            `🔄 Google Places API retry denemesi ${retryCount + 1}/2...`,
          );
          setTimeout(
            () => fetchPlaceDetails(placeId, lat, lon, retryCount + 1),
            1000,
          );
          return;
        }
      }

      // Network hatası
      if (
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch")
      ) {
        console.warn(
          "⚠️ Google Places API network hatası - yer detayları alınamadı",
        );

        // Retry mekanizması (maksimum 2 deneme)
        if (retryCount < 2) {
          console.log(
            `🔄 Google Places API retry denemesi ${retryCount + 1}/2...`,
          );
          setTimeout(
            () => fetchPlaceDetails(placeId, lat, lon, retryCount + 1),
            2000,
          );
          return;
        }

        // Fallback: Koordinatlardan basit bilgi oluştur
        const fallbackDetails = {
          name: "Seçilen Konum",
          address: `${lat}, ${lon}`,
          coordinates: {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
          },
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
          photoUrl: getPlaceImageUrl("travel"),
          rating: null,
          totalReviews: null,
          isOpenNow: null,
        };
        setSelectedPlace(fallbackDetails);
        console.log("📍 Fallback yer bilgisi kullanılıyor:", fallbackDetails);
      } else {
        console.error("❌ Google Places API hatası:", error.message || error);
      }
    }
  };

  const selectPlace = (prediction) => {
    setSearchText(prediction.description);
    setPredictions([]);
    fetchPlaceDetails(prediction.place_id, null, null);
  };

  // Seçilen yeri context'e kaydet ve tarih seçimine geç
  const handlePlaceSelection = () => {
    if (!selectedPlace) {
      Alert.alert("Hata", "Lütfen bir yer seçin");
      return;
    }

    console.log("📍 Yer seçildi:", selectedPlace);

    // Seyahat verilerini güncelle
    const updatedTripData = {
      ...tripData,
      selectedPlace: selectedPlace,
    };

    console.log("💾 Context güncelleniyor:", updatedTripData);
    setTripData(updatedTripData);

    // Tarih seçim sayfasına geç
    console.log("➡️ select-date sayfasına yönlendiriliyor...");
    router.push("/create-trip/select-date");
  };

  return (
    <View
      style={{
        padding: 25,
        paddingTop: 24,
        backgroundColor: Colors.WHITE,
        height: "100%",
      }}
    >
      <View style={{ position: "relative" }}>
        <TextInput
          placeholder="Yer ara..."
          value={searchText}
          onChangeText={handleSearchChange}
          style={{
            padding: 15,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: Colors.GRAY,
            fontSize: 16,
            backgroundColor: "#FFFFFF",
          }}
        />

        {loading && (
          <View style={{ position: "absolute", right: 15, top: 15 }}>
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          </View>
        )}
      </View>

      {/* 🔹 Autocomplete Sonuçları */}
      {predictions.length > 0 && (
        <View style={{ marginTop: 10, maxHeight: 300 }}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectPlace(item)}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.GRAY,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: Colors.PRIMARY,
                    fontFamily: "outfit-medium",
                  }}
                >
                  {item.structured_formatting?.main_text || item.description}
                </Text>
                {item.structured_formatting?.secondary_text && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: Colors.GRAY,
                      marginTop: 4,
                      fontFamily: "outfit",
                    }}
                  >
                    {item.structured_formatting.secondary_text}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 🔹 Seçilen yerin detay bilgisi */}
      {selectedPlace && (
        <View
          style={{
            marginTop: 20,
            borderRadius: 16,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: Colors.GRAY,
          }}
        >
          <ImageBackground
            source={{
              uri:
                selectedPlace.photoUrl ||
                getFallbackImageUrl(selectedPlace.name),
            }}
            style={{
              width: "100%",
              height: 220,
              justifyContent: "flex-end",
            }}
            imageStyle={{ opacity: 0.8 }}
          >
            <View
              style={{
                padding: 15,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "outfit-bold",
                  color: Colors.WHITE,
                }}
              >
                {selectedPlace.name}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.WHITE,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {selectedPlace.address}
              </Text>
            </View>
          </ImageBackground>

          <View style={{ padding: 16, backgroundColor: "#FAFAFA", gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontFamily: "outfit", color: Colors.GRAY }}>
                Google Maps
              </Text>
            </View>

            {!!selectedPlace.url && (
              <TouchableOpacity
                onPress={() => Linking.openURL(selectedPlace.url)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name="navigate-circle"
                  size={20}
                  color={Colors.PRIMARY}
                />
                <Text
                  style={{
                    fontFamily: "outfit-medium",
                    color: Colors.PRIMARY,
                    textDecorationLine: "underline",
                  }}
                >
                  {"Google Maps'te Görüntüle"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={{
                marginTop: 10,
                padding: 15,
                backgroundColor: Colors.PRIMARY,
                borderRadius: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handlePlaceSelection}
            >
              <Text
                style={{
                  color: Colors.WHITE,
                  fontSize: 16,
                  fontFamily: "outfit-medium",
                  marginRight: 10,
                }}
              >
                Devam Et
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
