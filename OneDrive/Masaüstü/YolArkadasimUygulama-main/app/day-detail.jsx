import Ionicons from "@expo/vector-icons/Ionicons";
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
      // OpenStreetMap URL oluştur
      const query = encodeURIComponent(
        `${placeName}, ${params.placeName || ""}`,
      );
      const osmUrl = placeCoordinates
        ? `https://www.openstreetmap.org/?mlat=${placeCoordinates.lat}&mlon=${placeCoordinates.lon}&zoom=15`
        : `https://www.openstreetmap.org/search?query=${query}`;
      await Linking.openURL(osmUrl);
    } catch (error) {
      console.error("Maps açma hatası:", error);
      Alert.alert("Hata", "Harita açılamadı");
    }
  };

  const searchRestaurantOnMaps = async (restaurantName) => {
    try {
      // OpenStreetMap URL oluştur
      const query = encodeURIComponent(
        `${restaurantName}, ${params.placeName || ""}`,
      );
      const osmUrl = placeCoordinates
        ? `https://www.openstreetmap.org/?mlat=${placeCoordinates.lat}&mlon=${placeCoordinates.lon}&zoom=15`
        : `https://www.openstreetmap.org/search?query=${query}`;
      await Linking.openURL(osmUrl);
    } catch (error) {
      console.error("Maps açma hatası:", error);
      Alert.alert("Hata", "Harita açılamadı");
    }
  };

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
                    // Otel adına göre görsel oluştur
                    const getAccommodationImage = (name) => {
                      const nameLower = name.toLowerCase();
                      if (
                        nameLower.includes("venetian") ||
                        nameLower.includes("venedik")
                      ) {
                        return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80";
                      }
                      if (
                        nameLower.includes("linq") ||
                        nameLower.includes("ferris")
                      ) {
                        return "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80";
                      }
                      return "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=80";
                    };

                    const accommodationName =
                      typeof accommodation === "string"
                        ? accommodation
                        : accommodation.name || "Otel";
                    const accommodationRating =
                      typeof accommodation === "object"
                        ? accommodation.rating
                        : null;
                    const accommodationPrice =
                      typeof accommodation === "object"
                        ? accommodation.price
                        : null;

                    return (
                      <View key={index} style={styles.accommodationCard}>
                        <Image
                          source={{
                            uri: getAccommodationImage(accommodationName),
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
                          {accommodationPrice && (
                            <Text style={styles.accommodationPrice}>
                              {accommodationPrice}
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
                : activity.split(".")[0].trim();
              const activityDescription =
                activity.length > activityTitle.length
                  ? activity.substring(activityTitle.length).trim()
                  : activity;

              // Görsel URL oluştur (aktivite adına göre)
              const getActivityImage = (title) => {
                const titleLower = title.toLowerCase();
                if (
                  titleLower.includes("dam") ||
                  titleLower.includes("baraj")
                ) {
                  return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80";
                }
                if (
                  titleLower.includes("müze") ||
                  titleLower.includes("museum")
                ) {
                  return "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&w=900&q=80";
                }
                if (
                  titleLower.includes("park") ||
                  titleLower.includes("bahçe")
                ) {
                  return "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80";
                }
                return "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80";
              };

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.activityCardNew}
                  onPress={() => hasLocation && searchPlaceOnMaps(activity)}
                >
                  {/* Aktivite Görseli */}
                  <Image
                    source={{ uri: getActivityImage(activityTitle) }}
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
                          <Ionicons name="square" size={16} color="#EF4444" />
                        </View>
                        <Text style={styles.activityDetailText}>
                          Bilet Fiyatı: Yaklaşık ₺
                          {Math.floor(Math.random() * 500) + 100}
                        </Text>
                      </View>

                      {/* Seyahat Süresi */}
                      <View style={styles.activityDetailItem}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={Colors.PRIMARY}
                        />
                        <Text style={styles.activityDetailText}>
                          Seyahat Süresi: {Math.floor(Math.random() * 3) + 1}-
                          {Math.floor(Math.random() * 3) + 3} saat
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
                  onPress={() => searchRestaurantOnMaps(restaurant)}
                >
                  <View style={styles.recommendationHeader}>
                    <Ionicons
                      name="restaurant-outline"
                      size={20}
                      color={Colors.PRIMARY}
                    />
                    <Text style={styles.recommendationText}>{restaurant}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mapLink}
                    onPress={() => searchRestaurantOnMaps(restaurant)}
                  >
                    <Ionicons
                      name="map-outline"
                      size={16}
                      color={Colors.PRIMARY}
                    />
                    <Text style={styles.mapLinkText}>Konum ve Detaylar</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

        {/* Görülecek Yerler */}
        {recommendations?.attractions &&
          recommendations.attractions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={24} color={Colors.PRIMARY} />
                <Text style={styles.sectionTitle}>Görülecek Yerler</Text>
              </View>
              {recommendations.attractions.map((attraction, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recommendationCard}
                  onPress={() => searchPlaceOnMaps(attraction)}
                >
                  <View style={styles.recommendationHeader}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={Colors.PRIMARY}
                    />
                    <Text style={styles.recommendationText}>{attraction}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mapLink}
                    onPress={() => searchPlaceOnMaps(attraction)}
                  >
                    <Ionicons
                      name="map-outline"
                      size={16}
                      color={Colors.PRIMARY}
                    />
                    <Text style={styles.mapLinkText}>Haritada Görüntüle</Text>
                  </TouchableOpacity>
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
                const osmUrl = `https://www.openstreetmap.org/?mlat=${placeCoordinates.lat}&mlon=${placeCoordinates.lon}&zoom=15`;
                Linking.openURL(osmUrl).catch((error) => {
                  console.error("OpenStreetMap açma hatası:", error);
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
