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
import { Colors } from "../constants/Colors";

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
      headerShown: true,
      headerTransparent: true,
      headerTitle: dayNumber ? `Gün ${dayNumber} Detayları` : "Gün Detayları",
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, dayNumber, handleBack]);

  useEffect(() => {
    try {
      if (params.day) {
        setDay(JSON.parse(params.day));
      }
      if (params.recommendations) {
        setRecommendations(JSON.parse(params.recommendations));
      }
      if (params.placeName) {
        setPlaceName(params.placeName);
      }
      if (params.placeCoordinates) {
        const coords = JSON.parse(params.placeCoordinates);
        if (coords.lat && coords.lon) {
          setPlaceCoordinates(coords);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error parsing params:", error);
      setLoading(false);
    }
  }, [
    params.day,
    params.recommendations,
    params.placeName,
    params.placeCoordinates,
  ]);

  const searchPlaceOnMaps = async (placeName) => {
    try {
      const query = encodeURIComponent(
        `${placeName}, ${params.placeName || ""}`,
      );
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      await Linking.openURL(mapsUrl);
    } catch (error) {
      console.error("Maps açma hatası:", error);
      Alert.alert("Hata", "Harita açılamadı");
    }
  };

  const searchRestaurantOnMaps = async (restaurantName) => {
    try {
      const query = encodeURIComponent(
        `${restaurantName}, ${params.placeName || ""}`,
      );
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      await Linking.openURL(mapsUrl);
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
              Number.isFinite(lat) && Number.isFinite(lon)
                ? { lat, lon }
                : null,
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
        Alert.alert(
          "Konum İzni Gerekli",
          "Mesafeye göre rota için konum izni vermeniz gerekiyor.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const start = {
        lat: current.coords.latitude,
        lon: current.coords.longitude,
      };

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
        Alert.alert(
          "Bilgi",
          "Google Maps waypoint sınırı nedeniyle ilk 10 durakla rota açıldı.",
        );
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
                body: JSON.stringify({
                  textQuery: queryText,
                  languageCode: "tr",
                  maxResultCount: 1,
                }),
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
                  Number.isFinite(place.location?.latitude) &&
                  Number.isFinite(place.location?.longitude)
                    ? {
                        lat: place.location.latitude,
                        lon: place.location.longitude,
                      }
                    : null,
              },
            ];
          }),
        );

        const infoMap = {};
        results.forEach(([name, info]) => {
          if (info) infoMap[name] = info;
        });
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!day) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.GRAY} />
        <Text style={styles.errorText}>Gün bilgisi bulunamadı</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {googleDataLoading && (
          <Text style={styles.googleLoadingText}>
            Google Places verileri getiriliyor...
          </Text>
        )}

        {/* Plan Details Başlığı */}
        <View style={styles.planDetailsHeader}>
          <Ionicons name="leaf" size={24} color={Colors.PRIMARY} />
          <Text style={styles.planDetailsTitle}>Plan Detayları</Text>
        </View>

        {/* Gün Başlığı */}
        <Text style={styles.dayNumberTitle}>Gün {day.day}</Text>

        {/* Otel/Konaklama Önerileri */}
        {recommendations?.accommodations &&
          recommendations.accommodations.length > 0 && (
            <View style={styles.accommodationsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.accommodationsScroll}
              >
                {recommendations.accommodations
                  .slice(0, 2)
                  .map((accommodation, index) => {
                    const accommodationItem = normalizeListItem(
                      accommodation,
                      "Otel",
                    );
                    const accommodationName = accommodationItem.name || "Otel";
                    const googleInfo = placesInfoMap[accommodationName];
                    const accommodationRating =
                      googleInfo?.rating || accommodationItem.rating || null;
                    const accommodationAddress =
                      googleInfo?.address || accommodationItem.address || null;
                    const accommodationImage =
                      googleInfo?.photoUrl ||
                      accommodationItem.photoUrl ||
                      getFallbackTravelImage(accommodationName);

                    return (
                      <View key={index} style={styles.accommodationCard}>
                        <Image
                          source={{
                            uri: accommodationImage,
                          }}
                          style={styles.accommodationImage}
                          resizeMode="cover"
                        />
                        <View style={styles.accommodationContent}>
                          <Text
                            style={styles.accommodationName}
                            numberOfLines={2}
                          >
                            {accommodationName}
                          </Text>
                          {accommodationRating && (
                            <View style={styles.accommodationRating}>
                              <Ionicons name="star" size={16} color="#F59E0B" />
                              <Text style={styles.accommodationRatingText}>
                                {accommodationRating}
                              </Text>
                            </View>
                          )}
                          {accommodationAddress && (
                            <Text
                              style={styles.accommodationPrice}
                              numberOfLines={2}
                            >
                              {accommodationAddress}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            </View>
          )}

        {/* Aktiviteler - Görseldeki Tasarıma Göre */}
        {day.activities && day.activities.length > 0 ? (
          <View style={styles.activitiesSection}>
            {day.activities.map((activity, index) => {
              // Aktivite adından yer adını çıkarmaya çalış
              const placeKeywords = activity.match(
                /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)/g,
              );
              const hasLocation = placeKeywords && placeKeywords.length > 0;

              // Aktivite adından başlık çıkar (ilk büyük harfli kelime grubu)
              const activityTitle = hasLocation
                ? placeKeywords[0]
                : extractActivityTitle(activity);
              const activityDescription =
                activity.length > activityTitle.length
                  ? activity.substring(activityTitle.length).trim()
                  : activity;
              const googleInfo = placesInfoMap[activityTitle];

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.activityCardNew}
                  onPress={() => hasLocation && searchPlaceOnMaps(activity)}
                >
                  {/* Aktivite Görseli */}
                  <Image
                    source={{
                      uri:
                        googleInfo?.photoUrl ||
                        getFallbackTravelImage(activityTitle),
                    }}
                    style={styles.activityImage}
                    resizeMode="cover"
                  />

                  <View style={styles.activityCardContent}>
                    {/* Başlık */}
                    <Text style={styles.activityCardTitle}>
                      {activityTitle}
                    </Text>

                    {/* Açıklama */}
                    <Text
                      style={styles.activityCardDescription}
                      numberOfLines={2}
                    >
                      {activityDescription || activity}
                    </Text>

                    {/* Detaylar */}
                    <View style={styles.activityDetails}>
                      {/* Bilet Fiyatı */}
                      <View style={styles.activityDetailItem}>
                        <View style={styles.priceIcon}>
                          <Ionicons
                            name="star-outline"
                            size={16}
                            color={Colors.PRIMARY}
                          />
                        </View>
                        <Text style={styles.activityDetailText}>
                          Google Puanı: {googleInfo?.rating || "Bilinmiyor"}
                        </Text>
                      </View>

                      {/* Google adresi */}
                      <View style={styles.activityDetailItem}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={Colors.PRIMARY}
                        />
                        <Text
                          style={styles.activityDetailText}
                          numberOfLines={1}
                        >
                          {googleInfo?.address || "Adres bilgisi yüklenemedi"}
                        </Text>
                        <TouchableOpacity
                          style={styles.planeIcon}
                          onPress={() =>
                            hasLocation && searchPlaceOnMaps(activity)
                          }
                        >
                          <Ionicons
                            name="airplane"
                            size={18}
                            color={Colors.PRIMARY}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>Aktivite bulunamadı</Text>
        )}

        {/* Restoran Önerileri */}
        {recommendations?.restaurants &&
          recommendations.restaurants.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={24} color={Colors.PRIMARY} />
                <Text style={styles.sectionTitle}>Restoran Önerileri</Text>
              </View>
              {recommendations.restaurants.map((restaurant, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recommendationCard}
                  onPress={() => {
                    const restaurantItem = normalizeListItem(
                      restaurant,
                      "Restoran",
                    );
                    const name = restaurantItem.name || "Restoran";
                    const googleInfo = placesInfoMap[name];
                    if (googleInfo?.url) {
                      Linking.openURL(googleInfo.url);
                      return;
                    }
                    searchRestaurantOnMaps(name);
                  }}
                >
                  {(() => {
                    const restaurantItem = normalizeListItem(
                      restaurant,
                      "Restoran",
                    );
                    const restaurantName = restaurantItem.name || "Restoran";
                    const googleInfo = placesInfoMap[restaurantName];
                    return (
                      <>
                        <View style={styles.recommendationHeader}>
                          <Ionicons
                            name="restaurant-outline"
                            size={20}
                            color={Colors.PRIMARY}
                          />
                          <Text style={styles.recommendationText}>
                            {restaurantName}
                          </Text>
                        </View>
                        {(googleInfo?.address || restaurantItem.address) && (
                          <Text
                            style={styles.recommendationMeta}
                            numberOfLines={2}
                          >
                            {googleInfo?.address || restaurantItem.address}
                          </Text>
                        )}
                        {(googleInfo?.rating || restaurantItem.rating) && (
                          <Text style={styles.recommendationMeta}>
                            Puan: {googleInfo?.rating || restaurantItem.rating}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.mapLink}
                          onPress={() => {
                            if (googleInfo?.url) {
                              Linking.openURL(googleInfo.url);
                              return;
                            }
                            searchRestaurantOnMaps(restaurantName);
                          }}
                        >
                          <Ionicons
                            name="map-outline"
                            size={16}
                            color={Colors.PRIMARY}
                          />
                          <Text style={styles.mapLinkText}>
                            Konum ve Detaylar
                          </Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* Görülecek Yerler */}
        {recommendations?.attractions &&
          recommendations.attractions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithAction}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="location" size={24} color={Colors.PRIMARY} />
                  <Text style={styles.sectionTitle}>Görülecek Yerler</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.routeButton,
                    (routeLoading || googleDataLoading) &&
                      styles.routeButtonDisabled,
                  ]}
                  onPress={openDistanceSortedRoute}
                  disabled={routeLoading || googleDataLoading}
                >
                  {routeLoading ? (
                    <ActivityIndicator size="small" color={Colors.WHITE} />
                  ) : (
                    <>
                      <Ionicons
                        name="navigate"
                        size={16}
                        color={Colors.WHITE}
                      />
                      <Text style={styles.routeButtonText}>
                        Mesafeye Göre Rota
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {recommendations.attractions.map((attraction, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recommendationCard}
                  onPress={() => {
                    const attractionItem = normalizeListItem(
                      attraction,
                      "Mekan",
                    );
                    const attractionName = attractionItem.name || "Mekan";
                    const googleInfo = placesInfoMap[attractionName];
                    if (googleInfo?.url) {
                      Linking.openURL(googleInfo.url);
                      return;
                    }
                    searchPlaceOnMaps(attractionName);
                  }}
                >
                  {(() => {
                    const attractionItem = normalizeListItem(
                      attraction,
                      "Mekan",
                    );
                    const attractionName = attractionItem.name || "Mekan";
                    const googleInfo = placesInfoMap[attractionName];
                    return (
                      <>
                        <View style={styles.recommendationHeader}>
                          <Ionicons
                            name="location-outline"
                            size={20}
                            color={Colors.PRIMARY}
                          />
                          <Text style={styles.recommendationText}>
                            {attractionName}
                          </Text>
                        </View>
                        {(googleInfo?.address || attractionItem.address) && (
                          <Text
                            style={styles.recommendationMeta}
                            numberOfLines={2}
                          >
                            {googleInfo?.address || attractionItem.address}
                          </Text>
                        )}
                        {(googleInfo?.rating || attractionItem.rating) && (
                          <Text style={styles.recommendationMeta}>
                            Puan: {googleInfo?.rating || attractionItem.rating}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.mapLink}
                          onPress={() => {
                            if (googleInfo?.url) {
                              Linking.openURL(googleInfo.url);
                              return;
                            }
                            searchPlaceOnMaps(attractionName);
                          }}
                        >
                          <Ionicons
                            name="map-outline"
                            size={16}
                            color={Colors.PRIMARY}
                          />
                          <Text style={styles.mapLinkText}>
                            Haritada Görüntüle
                          </Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* İpuçları */}
        {recommendations?.tips && recommendations.tips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>İpuçları</Text>
            </View>
            <View style={styles.tipsCard}>
              {recommendations.tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={Colors.PRIMARY}
                  />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Genel Konum */}
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
              <Ionicons name="navigate" size={24} color={Colors.PRIMARY} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Bölge Haritası</Text>
                <Text style={styles.locationSubtitle}>
                  {placeName || "Seyahat bölgesi"} haritasını görüntüle
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.GRAY} />
            </TouchableOpacity>
          </View>
        )}
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
    paddingTop: 75,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.WHITE,
  },
  loadingText: {
    marginTop: 15,
    fontFamily: "outfit",
    color: Colors.GRAY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: Colors.WHITE,
  },
  errorText: {
    marginTop: 15,
    fontFamily: "outfit",
    color: Colors.GRAY,
    textAlign: "center",
    fontSize: 16,
  },
  googleLoadingText: {
    fontSize: 13,
    fontFamily: "outfit-medium",
    color: Colors.GRAY,
    marginBottom: 10,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
  },
  backButtonText: {
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  recommendationMeta: {
    fontSize: 13,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginTop: 2,
  },
  headerCard: {
    backgroundColor: Colors.PRIMARY,
    padding: 25,
    borderRadius: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  dayBadge: {
    backgroundColor: Colors.WHITE,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  dayBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: Colors.PRIMARY,
  },
  dayTitle: {
    fontSize: 24,
    fontFamily: "outfit-bold",
    color: Colors.WHITE,
    textAlign: "center",
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timeText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: Colors.WHITE,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  routeButtonDisabled: {
    opacity: 0.6,
  },
  routeButtonText: {
    color: Colors.WHITE,
    fontFamily: "outfit-medium",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  activityCard: {
    backgroundColor: "#F8F9FA",
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  activityText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    flex: 1,
  },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  mapLinkText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  recommendationCard: {
    backgroundColor: "#F0F9FF",
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    flex: 1,
  },
  tipsCard: {
    backgroundColor: "#FEF3C7",
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#78350F",
    flex: 1,
    lineHeight: 20,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  locationInfo: {
    flex: 1,
    marginLeft: 15,
  },
  locationTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    fontStyle: "italic",
  },
  planDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  planDetailsTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  dayNumberTitle: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 25,
  },
  activitiesSection: {
    marginBottom: 30,
  },
  activityCardNew: {
    backgroundColor: Colors.WHITE,
    borderRadius: 15,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityImage: {
    width: "100%",
    height: 200,
  },
  activityCardContent: {
    padding: 18,
  },
  activityCardTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 8,
  },
  activityCardDescription: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 15,
    lineHeight: 20,
  },
  activityDetails: {
    gap: 10,
  },
  activityDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceIcon: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activityDetailText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    flex: 1,
  },
  planeIcon: {
    marginLeft: "auto",
    padding: 4,
  },
  accommodationsSection: {
    marginBottom: 30,
  },
  accommodationsScroll: {
    marginHorizontal: -25,
    paddingHorizontal: 25,
  },
  accommodationCard: {
    width: 280,
    backgroundColor: Colors.WHITE,
    borderRadius: 15,
    marginRight: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  accommodationImage: {
    width: "100%",
    height: 150,
  },
  accommodationContent: {
    padding: 15,
  },
  accommodationName: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 8,
  },
  accommodationRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  accommodationRatingText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  accommodationPrice: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.GRAY,
  },
});
