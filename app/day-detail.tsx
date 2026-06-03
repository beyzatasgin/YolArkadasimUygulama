import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#6366F1";
const DARK_HEADER = "#0A0F1E";
const DARK_CARD = "#131929";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";

export default function DayDetail() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [day, setDay] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [placeCoordinates, setPlaceCoordinates] = useState(null);
  const [placesInfoMap, setPlacesInfoMap] = useState({});
  const [googleDataLoading, setGoogleDataLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const dayNumber = params.dayNumber || "";

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation, dayNumber, handleBack]);

  useEffect(() => {
    try {
      if (params.day) setDay(JSON.parse(params.day));
      if (params.recommendations) setRecommendations(JSON.parse(params.recommendations));
      if (params.placeName) setPlaceName(params.placeName);
      if (params.placeCoordinates) {
        const coords = JSON.parse(params.placeCoordinates);
        if (coords.lat && coords.lon) setPlaceCoordinates(coords);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error parsing params:", error);
      setLoading(false);
    }
  }, [params.day, params.recommendations, params.placeName, params.placeCoordinates]);

  const searchPlaceOnMaps = async (placeName) => {
    try {
      const query = encodeURIComponent(`${placeName}, ${params.placeName || ""}`);
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } catch (error) {
      console.error("Maps açma hatası:", error);
      Alert.alert("Hata", "Harita açılamadı");
    }
  };

  const searchRestaurantOnMaps = async (restaurantName) => {
    try {
      const query = encodeURIComponent(`${restaurantName}, ${params.placeName || ""}`);
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    } catch (error) {
      console.error("Maps açma hatası:", error);
      Alert.alert("Hata", "Harita açılamadı");
    }
  };

  const getGooglePlacesApiKey = () =>
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY ||
    Constants.expoConfig?.extra?.googlePlacesApiKey ||
    Constants.expoConfig?.extra?.googleMapKey ||
    Constants.manifest?.extra?.googlePlacesApiKey;

  const getFallbackTravelImage = (seed) => {
    const images = [
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80",
    ];
    const key = (seed || "travel").toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return images[Math.abs(hash) % images.length];
  };

  const buildGooglePhotoUrl = (photoName, apiKey) => {
    if (!photoName || !apiKey) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&key=${apiKey}`;
  };

  const extractActivityTitle = (activity) => {
    const placeKeywords = activity.match(
      /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)/g,
    );
    const hasLocation = placeKeywords && placeKeywords.length > 0;
    return hasLocation ? placeKeywords[0] : activity.split(".")[0].trim();
  };

  const normalizeListItem = (item, fallbackName) => {
    if (typeof item === "string") return { name: item };
    return item || { name: fallbackName };
  };

  const haversineDistanceKm = (from, to) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(to.lat - from.lat);
    const dLon = toRad(to.lon - from.lon);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const openDistanceSortedRoute = async () => {
    try {
      if (!Array.isArray(recommendations?.attractions)) {
        Alert.alert("Bilgi", "Rota için görülecek yer bulunamadı.");
        return;
      }

      const targets = recommendations.attractions
        .map((item) => normalizeListItem(item, "Mekan"))
        .map((attraction) => {
          const info = placesInfoMap[attraction.name] || attraction;
          const lat = Number(info?.coordinates?.lat);
          const lon = Number(info?.coordinates?.lon);
          return {
            name: info?.name || attraction.name,
            coordinates:
              Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null,
          };
        })
        .filter((item) => item.coordinates);

      if (targets.length === 0) {
        Alert.alert(
          "Bilgi",
          "Görülecek yerlerin koordinatları henüz hazır değil. Birkaç saniye sonra tekrar deneyin.",
        );
        return;
      }

      setRouteLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum İzni Gerekli", "Mesafeye göre rota için konum izni vermeniz gerekiyor.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const start = { lat: current.coords.latitude, lon: current.coords.longitude };

      const remaining = [...targets];
      const ordered = [];
      let cursor = start;

      while (remaining.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        remaining.forEach((candidate, index) => {
          const distance = haversineDistanceKm(cursor, candidate.coordinates);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });
        const [nearest] = remaining.splice(nearestIndex, 1);
        ordered.push(nearest);
        cursor = nearest.coordinates;
      }

      const limitedOrdered = ordered.slice(0, 10);
      const destination = limitedOrdered[limitedOrdered.length - 1];
      const waypoints = limitedOrdered.slice(0, -1);

      if (!destination) {
        Alert.alert("Bilgi", "Rota oluşturulamadı.");
        return;
      }

      const originParam = `${start.lat},${start.lon}`;
      const destinationParam = `${destination.coordinates.lat},${destination.coordinates.lon}`;
      const waypointParam = waypoints
        .map((item) => `${item.coordinates.lat},${item.coordinates.lon}`)
        .join("|");

      const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destinationParam)}&travelmode=driving${waypointParam ? `&waypoints=${encodeURIComponent(waypointParam)}` : ""}`;
      await Linking.openURL(routeUrl);

      if (ordered.length > 10) {
        Alert.alert("Bilgi", "Google Maps waypoint sınırı nedeniyle ilk 10 durakla rota açıldı.");
      }
    } catch (error) {
      console.error("Rota oluşturma hatası:", error);
      Alert.alert("Hata", "Mesafeye göre rota oluşturulamadı.");
    } finally {
      setRouteLoading(false);
    }
  };

  useEffect(() => {
    const fetchGoogleDetails = async () => {
      if (loading) return;
      const apiKey = getGooglePlacesApiKey();
      if (!apiKey || apiKey.includes("YOUR_")) return;

      const namesSet = new Set();

      if (Array.isArray(day?.activities)) {
        day.activities.forEach((activity) => {
          const title = extractActivityTitle(activity);
          if (title) namesSet.add(title);
        });
      }
      if (Array.isArray(recommendations?.accommodations)) {
        recommendations.accommodations.slice(0, 2).forEach((item) => {
          const acc = normalizeListItem(item, "Otel");
          if (acc.name) namesSet.add(acc.name);
        });
      }
      if (Array.isArray(recommendations?.restaurants)) {
        recommendations.restaurants.forEach((item) => {
          const rest = normalizeListItem(item, "Restoran");
          if (rest.name) namesSet.add(rest.name);
        });
      }
      if (Array.isArray(recommendations?.attractions)) {
        recommendations.attractions.forEach((item) => {
          const attr = normalizeListItem(item, "Mekan");
          if (attr.name) namesSet.add(attr.name);
        });
      }

      const names = Array.from(namesSet).slice(0, 16);
      if (names.length === 0) return;

      setGoogleDataLoading(true);
      try {
        const results = await Promise.all(
          names.map(async (name) => {
            const queryText = `${name}, ${placeName || params.placeName || ""}`;
            const response = await fetch(
              `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-FieldMask":
                    "places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount,places.photos.name,places.location",
                },
                body: JSON.stringify({ textQuery: queryText, languageCode: "tr", maxResultCount: 1 }),
              },
            );
            if (!response.ok) return [name, null];
            const data = await response.json();
            const place = data?.places?.[0];
            if (!place) return [name, null];
            return [
              name,
              {
                name: place.displayName?.text || name,
                address: place.formattedAddress || null,
                rating: place.rating || null,
                totalReviews: place.userRatingCount || null,
                url: place.googleMapsUri || null,
                photoUrl: buildGooglePhotoUrl(place.photos?.[0]?.name, apiKey),
                coordinates:
                  Number.isFinite(place.location?.latitude) && Number.isFinite(place.location?.longitude)
                    ? { lat: place.location.latitude, lon: place.location.longitude }
                    : null,
              },
            ];
          }),
        );
        const infoMap = {};
        results.forEach(([name, info]) => { if (info) infoMap[name] = info; });
        setPlacesInfoMap(infoMap);
      } catch (error) {
        console.warn("Google detayları alınamadı:", error?.message || error);
      } finally {
        setGoogleDataLoading(false);
      }
    };

    fetchGoogleDetails();
  }, [
    day?.activities,
    loading,
    params.placeName,
    placeName,
    recommendations?.accommodations,
    recommendations?.attractions,
    recommendations?.restaurants,
  ]);

  // ---- Loading ----
  if (loading) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // ---- Error ----
  if (!day) {
    return (
      <View style={styles.fullScreen}>
        <Ionicons name="alert-circle" size={48} color={TEXT_MUTED} />
        <Text style={styles.errorText}>Gün bilgisi bulunamadı</Text>
        <TouchableOpacity style={styles.errorBackBtn} onPress={() => router.back()}>
          <Text style={styles.errorBackBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Custom dark header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {dayNumber ? `Gün ${dayNumber}` : "Gün Detayları"}
          </Text>
          {placeName ? <Text style={styles.headerSub}>{placeName}</Text> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Google loading pill */}
        {googleDataLoading && (
          <View style={styles.googleLoadingPill}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.googleLoadingText}>Google Places verileri yükleniyor...</Text>
          </View>
        )}

        {/* Day header card */}
        <View style={styles.dayHeaderCard}>
          <View style={styles.dayHeaderTop}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>Gün {day.day}</Text>
            </View>
            {day.time && (
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.timeText}>{day.time}</Text>
              </View>
            )}
          </View>
          <Text style={styles.dayCardTitle}>{day.title}</Text>
        </View>

        {/* Accommodation horizontal scroll */}
        {recommendations?.accommodations && recommendations.accommodations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed" size={20} color={ACCENT} />
              <Text style={styles.sectionTitle}>Konaklama Önerileri</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendations.accommodations.slice(0, 2).map((accommodation, index) => {
                const accommodationItem = normalizeListItem(accommodation, "Otel");
                const accommodationName = accommodationItem.name || "Otel";
                const googleInfo = placesInfoMap[accommodationName];
                const accommodationRating = googleInfo?.rating || accommodationItem.rating || null;
                const accommodationAddress = googleInfo?.address || accommodationItem.address || null;
                const accommodationImage =
                  googleInfo?.photoUrl || accommodationItem.photoUrl || getFallbackTravelImage(accommodationName);

                return (
                  <View key={index} style={styles.accommodationCard}>
                    <Image source={{ uri: accommodationImage }} style={styles.accommodationImage} resizeMode="cover" />
                    <View style={styles.accommodationContent}>
                      <Text style={styles.accommodationName} numberOfLines={2}>{accommodationName}</Text>
                      {accommodationRating && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={14} color="#F59E0B" />
                          <Text style={styles.ratingText}>{accommodationRating}</Text>
                        </View>
                      )}
                      {accommodationAddress && (
                        <Text style={styles.accommodationAddress} numberOfLines={2}>{accommodationAddress}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Activities */}
        {day.activities && day.activities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="compass" size={20} color={ACCENT} />
              <Text style={styles.sectionTitle}>Günün Aktiviteleri</Text>
            </View>
            {day.activities.map((activity, index) => {
              const placeKeywords = activity.match(
                /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)/g,
              );
              const hasLocation = placeKeywords && placeKeywords.length > 0;
              const activityTitle = hasLocation ? placeKeywords[0] : extractActivityTitle(activity);
              const activityDescription =
                activity.length > activityTitle.length
                  ? activity.substring(activityTitle.length).trim()
                  : activity;
              const googleInfo = placesInfoMap[activityTitle];

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.activityCard}
                  onPress={() => hasLocation && searchPlaceOnMaps(activity)}
                  activeOpacity={0.88}
                >
                  <Image
                    source={{ uri: googleInfo?.photoUrl || getFallbackTravelImage(activityTitle) }}
                    style={styles.activityImage}
                    resizeMode="cover"
                  />
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityCardTitle}>{activityTitle}</Text>
                    <Text style={styles.activityCardDesc} numberOfLines={2}>
                      {activityDescription || activity}
                    </Text>
                    <View style={styles.activityMeta}>
                      <View style={styles.activityMetaItem}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.activityMetaText}>
                          {googleInfo?.rating ? googleInfo.rating : "—"}
                        </Text>
                      </View>
                      <View style={styles.activityMetaItem}>
                        <Ionicons name="location-outline" size={14} color={TEXT_MUTED} />
                        <Text style={styles.activityMetaAddress} numberOfLines={1}>
                          {googleInfo?.address || "Adres yükleniyor..."}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.mapsBtn}
                      onPress={() => hasLocation && searchPlaceOnMaps(activity)}
                    >
                      <Ionicons name="map" size={14} color="#fff" />
                      <Text style={styles.mapsBtnText}>Haritada Gör</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Restaurants */}
        {recommendations?.restaurants && recommendations.restaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="restaurant" size={20} color={ACCENT} />
              <Text style={styles.sectionTitle}>Restoran Önerileri</Text>
            </View>
            {recommendations.restaurants.map((restaurant, index) => {
              const restaurantItem = normalizeListItem(restaurant, "Restoran");
              const restaurantName = restaurantItem.name || "Restoran";
              const googleInfo = placesInfoMap[restaurantName];
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.listCard}
                  onPress={() => {
                    if (googleInfo?.url) { Linking.openURL(googleInfo.url); return; }
                    searchRestaurantOnMaps(restaurantName);
                  }}
                >
                  <View style={styles.listCardAccent} />
                  <View style={styles.listCardContent}>
                    <Text style={styles.listCardName}>{restaurantName}</Text>
                    {(googleInfo?.address || restaurantItem.address) && (
                      <Text style={styles.listCardAddress} numberOfLines={2}>
                        {googleInfo?.address || restaurantItem.address}
                      </Text>
                    )}
                    {(googleInfo?.rating || restaurantItem.rating) && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.ratingText}>{googleInfo?.rating || restaurantItem.rating}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.mapTextLink}
                      onPress={() => {
                        if (googleInfo?.url) { Linking.openURL(googleInfo.url); return; }
                        searchRestaurantOnMaps(restaurantName);
                      }}
                    >
                      <Ionicons name="map-outline" size={14} color={ACCENT} />
                      <Text style={styles.mapTextLinkText}>Haritada Gör</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Attractions */}
        {recommendations?.attractions && recommendations.attractions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithAction}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color={ACCENT} />
                <Text style={styles.sectionTitle}>Görülecek Yerler</Text>
              </View>
              <TouchableOpacity
                style={[styles.routeBtn, (routeLoading || googleDataLoading) && styles.routeBtnDisabled]}
                onPress={openDistanceSortedRoute}
                disabled={routeLoading || googleDataLoading}
              >
                {routeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={15} color="#fff" />
                    <Text style={styles.routeBtnText}>Rota Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {recommendations.attractions.map((attraction, index) => {
              const attractionItem = normalizeListItem(attraction, "Mekan");
              const attractionName = attractionItem.name || "Mekan";
              const googleInfo = placesInfoMap[attractionName];
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.listCard}
                  onPress={() => {
                    if (googleInfo?.url) { Linking.openURL(googleInfo.url); return; }
                    searchPlaceOnMaps(attractionName);
                  }}
                >
                  <View style={styles.listCardAccent} />
                  <View style={styles.listCardContent}>
                    <Text style={styles.listCardName}>{attractionName}</Text>
                    {(googleInfo?.address || attractionItem.address) && (
                      <Text style={styles.listCardAddress} numberOfLines={2}>
                        {googleInfo?.address || attractionItem.address}
                      </Text>
                    )}
                    {(googleInfo?.rating || attractionItem.rating) && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.ratingText}>{googleInfo?.rating || attractionItem.rating}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.mapTextLink}
                      onPress={() => {
                        if (googleInfo?.url) { Linking.openURL(googleInfo.url); return; }
                        searchPlaceOnMaps(attractionName);
                      }}
                    >
                      <Ionicons name="map-outline" size={14} color={ACCENT} />
                      <Text style={styles.mapTextLinkText}>Haritada Gör</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tips */}
        {recommendations?.tips && recommendations.tips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>İpuçları</Text>
            </View>
            <View style={styles.tipsCard}>
              {recommendations.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipDot}>
                    <Ionicons name="information-circle" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location map button */}
        {placeCoordinates && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.locationCard}
              onPress={() => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${placeCoordinates.lat},${placeCoordinates.lon}`;
                Linking.openURL(mapsUrl).catch((error) => {
                  console.error("Google Maps açma hatası:", error);
                  Alert.alert("Hata", "Harita açılamadı");
                });
              }}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Bölge Haritası</Text>
                <Text style={styles.locationSub}>
                  {placeName || "Seyahat bölgesi"} haritasını görüntüle
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BODY_BG,
  },
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BODY_BG,
    padding: 30,
  },
  loadingText: {
    marginTop: 14,
    fontFamily: "outfit",
    fontSize: 16,
    color: TEXT_MUTED,
  },
  errorText: {
    marginTop: 14,
    fontFamily: "outfit",
    fontSize: 16,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  errorBackBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: ACCENT,
    borderRadius: 12,
  },
  errorBackBtnText: {
    fontFamily: "outfit-medium",
    color: "#fff",
    fontSize: 15,
  },
  // Header
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
  headerSub: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 50 },
  // Google loading pill
  googleLoadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 14,
  },
  googleLoadingText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: ACCENT,
  },
  // Day header card
  dayHeaderCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  dayHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 13,
    color: "#fff",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  timeText: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  dayCardTitle: {
    fontFamily: "outfit-bold",
    fontSize: 22,
    color: "#fff",
  },
  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  // Route button
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  routeBtnDisabled: { opacity: 0.55, shadowOpacity: 0, elevation: 0 },
  routeBtnText: {
    fontFamily: "outfit-bold",
    fontSize: 13,
    color: "#fff",
  },
  // Accommodation
  horizontalScroll: {
    paddingRight: 16,
  },
  accommodationCard: {
    width: 270,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  accommodationImage: {
    width: "100%",
    height: 140,
  },
  accommodationContent: {
    padding: 14,
  },
  accommodationName: {
    fontFamily: "outfit-bold",
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  accommodationAddress: {
    fontFamily: "outfit",
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  // Activity cards
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  activityImage: {
    width: "100%",
    height: 200,
  },
  activityCardContent: {
    padding: 16,
  },
  activityCardTitle: {
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  activityCardDesc: {
    fontFamily: "outfit",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 12,
  },
  activityMeta: { gap: 6, marginBottom: 12 },
  activityMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activityMetaText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  activityMetaAddress: {
    fontFamily: "outfit",
    fontSize: 13,
    color: TEXT_MUTED,
    flex: 1,
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  mapsBtnText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: "#fff",
  },
  // Restaurant / Attraction list cards
  listCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  listCardAccent: {
    width: 4,
    backgroundColor: ACCENT,
  },
  listCardContent: {
    flex: 1,
    padding: 14,
  },
  listCardName: {
    fontFamily: "outfit-bold",
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  listCardAddress: {
    fontFamily: "outfit",
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 5,
  },
  mapTextLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  mapTextLinkText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },
  // Tips
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  tipDot: {
    marginTop: 1,
  },
  tipText: {
    fontFamily: "outfit",
    fontSize: 14,
    color: "#78350F",
    flex: 1,
    lineHeight: 20,
  },
  // Location map card
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: DARK_CARD,
    padding: 18,
    borderRadius: 14,
  },
  locationInfo: { flex: 1 },
  locationTitle: {
    fontFamily: "outfit-bold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 3,
  },
  locationSub: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
});
