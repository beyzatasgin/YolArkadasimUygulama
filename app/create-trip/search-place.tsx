import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import {
  useCallback,
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
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCreateTrip } from "../../hooks/useCreateTrip";
import { autocompletePlaces } from "../../services/placesService";

const ACCENT = "#6366F1";
const ACCENT_LIGHT = "#818CF8";
const DARK_HEADER = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const TOTAL_STEPS = 6;
const CURRENT_STEP = 1;

const POPULAR_DESTINATIONS = [
  { label: "İstanbul", icon: "business-outline" },
  { label: "Paris", icon: "wine-outline" },
  { label: "Tokyo", icon: "partly-sunny-outline" },
  { label: "Bali", icon: "leaf-outline" },
  { label: "Roma", icon: "earth-outline" },
];

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

export default function SearchPlace() {
  const navigation = useNavigation();
  const { tripData, setTripData } = useCreateTrip();
  const [searchText, setSearchText] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [placesConfigAlertShown, setPlacesConfigAlertShown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
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
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const suggestions = await autocompletePlaces(text);
      clearTimeout(timeoutId);

      if (suggestions.length > 0) {
        const formattedPredictions = suggestions.map((place) => {
          const fullText = place.text || "Bilinmeyen";
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
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        console.warn("⚠️ Google Places API timeout - istek zamanında tamamlanamadı");
        if (retryCount < 1) {
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }
        setPredictions([]);
        return;
      }

      if (
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch")
      ) {
        console.warn("⚠️ Google Places API network hatası");
        if (retryCount < 1) {
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }
        setPredictions([]);
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
            "API 403 dönüyor. Google Cloud'da Places API (New) etkin ve faturalandırma açık olmalı.",
          );
        }
      }

      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (text.length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    const minDelay = 1000;

    if (timeSinceLastSearch < minDelay) {
      const delay = minDelay - timeSinceLastSearch + 500;
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, delay);
      setSearchTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, 500);
      setSearchTimeout(timeout);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const getPlaceImageUrl = (placeName) => getFallbackImageUrl(placeName);

  const getFallbackImageUrl = (placeName) => {
    try {
      const cleanName = placeName?.split(",")[0].trim().toLowerCase() || "travel";
      const placeImageMap = {
        istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80",
        ankara: "https://images.unsplash.com/photo-1622542796254-5b9c46ab0d2f?auto=format&fit=crop&w=900&q=80",
        izmir: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=900&q=80",
        antalya: "https://images.unsplash.com/photo-1573992554021-93fa646ad55e?auto=format&fit=crop&w=900&q=80",
        paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
        london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
        tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80",
        "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80",
        barcelona: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80",
        rome: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=900&q=80",
      };

      if (placeImageMap[cleanName]) return placeImageMap[cleanName];

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

  const fetchPlaceDetails = async (placeId, lat, lon, retryCount = 0) => {
    const apiKey = getGooglePlacesApiKey();
    if (!apiKey || apiKey.includes("YOUR_")) {
      console.warn("⚠️ Google Places API key bulunamadı.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody?.error?.message || `HTTP error! status: ${response.status}`;
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
          coordinates: { lat: latitude, lon: longitude },
          url: googleMapsUrl,
          photoUrl,
          rating: place.rating || null,
          totalReviews: place.userRatingCount || null,
          isOpenNow: place.regularOpeningHours?.openNow ?? null,
        };

        setSelectedPlace(details);
      } else {
        throw new Error(place?.error?.message || "Yer bilgisi alınamadı");
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        if (retryCount < 2) {
          setTimeout(() => fetchPlaceDetails(placeId, lat, lon, retryCount + 1), 1000);
          return;
        }
      }

      if (
        error.message?.includes("Network request failed") ||
        error.message?.includes("Failed to fetch")
      ) {
        if (retryCount < 2) {
          setTimeout(() => fetchPlaceDetails(placeId, lat, lon, retryCount + 1), 2000);
          return;
        }

        const fallbackDetails = {
          name: "Seçilen Konum",
          address: `${lat}, ${lon}`,
          coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
          photoUrl: getPlaceImageUrl("travel"),
          rating: null,
          totalReviews: null,
          isOpenNow: null,
        };
        setSelectedPlace(fallbackDetails);
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

  const handlePlaceSelection = () => {
    if (!selectedPlace) {
      Alert.alert("Hata", "Lütfen bir yer seçin");
      return;
    }

    const updatedTripData = { ...tripData, selectedPlace };
    setTripData(updatedTripData);
    router.push("/create-trip/select-date");
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
              Nereye Gidiyorsun?
            </Text>
            <Text style={{ fontFamily: "outfit", fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>
              Adım {CURRENT_STEP} / {TOTAL_STEPS}
            </Text>
          </View>
        </View>
        <ProgressBar current={CURRENT_STEP} total={TOTAL_STEPS} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Search Card */}
        <View style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 3,
          marginBottom: 20,
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            borderWidth: 2,
            borderColor: inputFocused ? ACCENT_LIGHT : "transparent",
            borderRadius: 16,
          }}>
            <Ionicons name="location-outline" size={20} color={inputFocused ? ACCENT : TEXT_MUTED} style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Şehir veya ülke ara..."
              placeholderTextColor={TEXT_MUTED}
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={{
                flex: 1,
                paddingVertical: 16,
                fontSize: 15,
                fontFamily: "outfit",
                color: TEXT_PRIMARY,
              }}
            />
            {loading ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : searchText.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchText(""); setPredictions([]); setSelectedPlace(null); }}>
                <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Autocomplete results inside card */}
          {predictions.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
              {predictions.map((item, index) => (
                <TouchableOpacity
                  key={item.place_id}
                  onPress={() => selectPlace(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: index < predictions.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}>
                    <Ionicons name="location" size={16} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "outfit-medium", fontSize: 14, color: TEXT_PRIMARY }}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    {item.structured_formatting?.secondary_text ? (
                      <Text style={{ fontFamily: "outfit", fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Popular Destinations */}
        {!selectedPlace && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: TEXT_MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Popüler Destinasyonlar
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {POPULAR_DESTINATIONS.map((dest) => (
                <TouchableOpacity
                  key={dest.label}
                  onPress={() => {
                    setSearchText(dest.label);
                    handleSearchChange(dest.label);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    backgroundColor: "#FFFFFF",
                    borderRadius: 30,
                    borderWidth: 1.5,
                    borderColor: "#E5E7EB",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <Ionicons name={dest.icon as any} size={14} color={ACCENT} />
                  <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: TEXT_PRIMARY }}>
                    {dest.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Selected Place Card */}
        {selectedPlace && (
          <View style={{
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 12,
            elevation: 5,
          }}>
            <ImageBackground
              source={{ uri: selectedPlace.photoUrl || getFallbackImageUrl(selectedPlace.name) }}
              style={{ width: "100%", height: 200, justifyContent: "flex-end" }}
              imageStyle={{ opacity: 0.85 }}
            >
              <View style={{ padding: 16, backgroundColor: "rgba(10,15,30,0.6)" }}>
                <Text style={{ fontSize: 20, fontFamily: "outfit-bold", color: "#FFFFFF" }}>
                  {selectedPlace.name}
                </Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }} numberOfLines={2}>
                  {selectedPlace.address}
                </Text>
              </View>
            </ImageBackground>

            <View style={{ padding: 16, gap: 12 }}>
              {!!selectedPlace.url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedPlace.url)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="navigate-circle" size={18} color={ACCENT} />
                  <Text style={{ fontFamily: "outfit-medium", color: ACCENT, fontSize: 14, textDecorationLine: "underline" }}>
                    {"Google Maps'te Görüntüle"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  backgroundColor: ACCENT,
                  borderRadius: 14,
                  gap: 8,
                }}
                onPress={handlePlaceSelection}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "outfit-medium" }}>
                  Devam Et
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
