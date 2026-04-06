import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { useCallback, useContext, useEffect, useState } from "react";
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
import { auth, db, firebaseInitError } from "../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "../../configs/FirebaseMessages";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { setTripData } = useContext(CreateTripContext);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [placeImageUrl, setPlaceImageUrl] = useState(null);

  const handleDeleteTrip = useCallback(async () => {
    Alert.alert(
      "Seyahati Sil",
      `"${trip?.tripName || "Bu seyahat"}" seyahatini silmek istediğinizden emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "trips", id));
              Alert.alert("Başarılı", "Seyahat başarıyla silindi.", [
                { text: "Tamam", onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error("Seyahat silme hatası:", error);
              Alert.alert("Hata", "Seyahat silinirken bir hata oluştu.");
            }
          },
        },
      ],
    );
  }, [id, router, trip?.tripName]);

  const handleEditTrip = useCallback(() => {
    if (!trip) return;

    // Trip verilerini context'e yükle
    setTripData({
      selectedPlace: trip.selectedPlace,
      startDate: trip.startDate,
      endDate: trip.endDate,
      duration: trip.duration,
      travelers: trip.travelers,
      interests: trip.interests,
      notes: trip.notes,
      aiPlan: trip.aiPlan,
    });

    // Review trip sayfasına git (oradan düzenleme yapılabilir)
    router.push("/create-trip/review-trip");
  }, [router, setTripData, trip]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Seyahat Detayları",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 15 }}>
          <TouchableOpacity onPress={handleEditTrip}>
            <Ionicons name="create-outline" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteTrip}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, router, handleDeleteTrip, handleEditTrip]);

  // Fallback görsel URL oluştur (API key yoksa veya hata durumunda)
  const getFallbackImageUrl = useCallback((placeName) => {
    try {
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
        rize: "https://images.unsplash.com/photo-1573992554021-93fa646ad55e?auto=format&fit=crop&w=900&q=80",
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
  }, []);

  // OpenStreetMap kullanıldığı için görsel çekme API'si yok
  // Sadece fallback görselleri kullanıyoruz
  const getPlaceImageUrl = useCallback(
    (placeName) => {
      return getFallbackImageUrl(placeName);
    },
    [getFallbackImageUrl],
  );

  const fetchTripDetails = useCallback(async () => {
    try {
      setLoading(true);
      const tripRef = doc(db, "trips", id);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        setError("Seyahat bulunamadı");
        setLoading(false);
        return;
      }

      const data = tripSnap.data();

      // Kullanıcı kontrolü
      if (data.userId !== auth?.currentUser?.uid) {
        setError("Bu seyahate erişim yetkiniz yok");
        setLoading(false);
        return;
      }

      // Firestore timestamp'lerini Date'e dönüştür
      let startDate = null;
      let endDate = null;
      let createdAt = new Date();

      if (data.startDate) {
        if (data.startDate.toDate) {
          startDate = data.startDate.toDate();
        } else if (data.startDate.seconds) {
          startDate = new Date(data.startDate.seconds * 1000);
        }
      }

      if (data.endDate) {
        if (data.endDate.toDate) {
          endDate = data.endDate.toDate();
        } else if (data.endDate.seconds) {
          endDate = new Date(data.endDate.seconds * 1000);
        }
      }

      if (data.createdAt) {
        if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          createdAt = new Date(data.createdAt.seconds * 1000);
        }
      }

      const tripData = {
        id: tripSnap.id,
        ...data,
        startDate,
        endDate,
        createdAt,
      };

      setTrip(tripData);

      // Yer bilgisi varsa görsel URL'ini oluştur (OpenStreetMap kullanıldığı için fallback görseller)
      if (tripData.selectedPlace?.name) {
        const imageUrl = getPlaceImageUrl(tripData.selectedPlace.name);
        setPlaceImageUrl(imageUrl);
      } else {
        setPlaceImageUrl(getFallbackImageUrl(""));
      }

      setLoading(false);
    } catch (err) {
      console.error("Trip fetch error:", err);
      setError("Seyahat yüklenirken bir hata oluştu");
      setLoading(false);
    }
  }, [getFallbackImageUrl, getPlaceImageUrl, id]);

  useEffect(() => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      setError(initMessage);
      setLoading(false);
      return;
    }

    if (!id || !auth?.currentUser || !db) {
      setError("Seyahat bulunamadı");
      setLoading(false);
      return;
    }

    fetchTripDetails();
  }, [fetchTripDetails, id]);

  const formatDate = (date) => {
    if (!date) return "Belirtilmemiş";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getInterestLabel = (interestId) => {
    const interestLabels = {
      culture: "Kültür",
      nature: "Doğa",
      adventure: "Macera",
      food: "Yemek",
      shopping: "Alışveriş",
      nightlife: "Gece Hayatı",
      beach: "Plaj",
      history: "Tarih",
    };
    return interestLabels[interestId] || interestId;
  };

  const openInMaps = () => {
    if (trip?.selectedPlace?.coordinates) {
      const { lat, lon } = trip.selectedPlace.coordinates;
      const url =
        trip.selectedPlace.url ||
        `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
      Linking.openURL(url).catch((err) => {
        console.error("Maps açma hatası:", err);
        Alert.alert("Hata", "Harita açılamadı");
      });
    }
  };

  const getTripStatus = () => {
    if (!trip?.startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(trip.startDate);
    tripStart.setHours(0, 0, 0, 0);
    return tripStart >= today ? "Yaklaşan" : "Geçmiş";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.GRAY} />
        <Text style={styles.errorText}>{error || "Seyahat bulunamadı"}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tripStatus = getTripStatus();

  // Görsel URL'ini belirle - önce state'teki, sonra trip'teki photoUrl, son olarak fallback
  const finalImageUrl =
    placeImageUrl ||
    trip?.selectedPlace?.photoUrl ||
    getFallbackImageUrl(trip?.selectedPlace?.name);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Place Image Header */}
        {finalImageUrl && (
          <Image
            source={{ uri: finalImageUrl }}
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}

        {/* Header Section */}
        <View style={[styles.headerSection, { paddingHorizontal: 25 }]}>
          <Text style={styles.tripName}>{trip.tripName}</Text>
          {tripStatus && (
            <View
              style={[
                styles.statusBadge,
                tripStatus === "Yaklaşan"
                  ? styles.statusBadgeUpcoming
                  : styles.statusBadgePast,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  tripStatus === "Yaklaşan"
                    ? styles.statusBadgeTextUpcoming
                    : styles.statusBadgeTextPast,
                ]}
              >
                {tripStatus}
              </Text>
            </View>
          )}
        </View>

        {/* Location Section */}
        <View style={[styles.card, { marginHorizontal: 25 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color={Colors.PRIMARY} />
            <Text style={styles.cardTitle}>Konum</Text>
          </View>
          <Text style={styles.cardValue}>
            {trip.selectedPlace?.name || "Belirtilmemiş"}
          </Text>
          {trip.selectedPlace?.address && (
            <Text style={styles.cardSubValue}>
              {trip.selectedPlace.address}
            </Text>
          )}
          {trip.selectedPlace?.coordinates && (
            <TouchableOpacity style={styles.mapButton} onPress={openInMaps}>
              <Ionicons name="map-outline" size={20} color={Colors.PRIMARY} />
              <Text style={styles.mapButtonText}>Haritada Görüntüle</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date & Duration Section */}
        <View style={[styles.card, { marginHorizontal: 25 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={24} color={Colors.PRIMARY} />
            <Text style={styles.cardTitle}>Tarih ve Süre</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.GRAY} />
            <Text style={styles.infoText}>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </Text>
          </View>
          {trip.duration && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={Colors.GRAY} />
              <Text style={styles.infoText}>{trip.duration} gün</Text>
            </View>
          )}
        </View>

        {/* Travelers Section */}
        <View style={[styles.card, { marginHorizontal: 25 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={24} color={Colors.PRIMARY} />
            <Text style={styles.cardTitle}>Seyahat Bilgileri</Text>
          </View>
          {trip.travelers && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color={Colors.GRAY} />
              <Text style={styles.infoText}>{trip.travelers} kişi</Text>
            </View>
          )}
        </View>

        {/* Interests Section */}
        {trip.interests && trip.interests.length > 0 && (
          <View style={[styles.card, { marginHorizontal: 25 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart" size={24} color={Colors.PRIMARY} />
              <Text style={styles.cardTitle}>İlgi Alanları</Text>
            </View>
            <View style={styles.interestsContainer}>
              {trip.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>
                    {getInterestLabel(interest)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes Section */}
        {trip.notes && (
          <View style={[styles.card, { marginHorizontal: 25 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={24} color={Colors.PRIMARY} />
              <Text style={styles.cardTitle}>Notlar</Text>
            </View>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        )}

        {/* AI Plan Section */}
        {trip.aiPlan && (
          <View style={[styles.card, { marginHorizontal: 25 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="sparkles" size={24} color={Colors.PRIMARY} />
              <Text style={styles.cardTitle}>AI Seyahat Planı</Text>
            </View>
            {trip.aiPlan.itinerary && trip.aiPlan.itinerary.length > 0 && (
              <View style={styles.itinerarySection}>
                {trip.aiPlan.itinerary.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.dayCard}
                    onPress={() => {
                      router.push({
                        pathname: "/day-detail",
                        params: {
                          day: JSON.stringify(day),
                          dayNumber: day.day,
                          placeName: trip.selectedPlace?.name || "",
                          placeCoordinates: JSON.stringify(
                            trip.selectedPlace?.coordinates || {},
                          ),
                          recommendations: JSON.stringify(
                            trip.aiPlan.recommendations || {},
                          ),
                        },
                      });
                    }}
                  >
                    <View style={styles.dayHeader}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>Gün {day.day}</Text>
                      </View>
                      <Text style={styles.dayTitle}>{day.title}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={Colors.GRAY}
                      />
                    </View>
                    {day.time && <Text style={styles.dayTime}>{day.time}</Text>}
                    {day.activities && day.activities.length > 0 && (
                      <View style={styles.activitiesList}>
                        {day.activities
                          .slice(0, 3)
                          .map((activity, actIndex) => (
                            <View key={actIndex} style={styles.activityItem}>
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color={Colors.PRIMARY}
                              />
                              <Text style={styles.activityText}>
                                {activity}
                              </Text>
                            </View>
                          ))}
                        {day.activities.length > 3 && (
                          <Text style={styles.moreActivitiesText}>
                            +{day.activities.length - 3} aktivite daha...
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {trip.aiPlan.recommendations && (
              <View style={styles.recommendationsSection}>
                {trip.aiPlan.recommendations.accommodations &&
                  trip.aiPlan.recommendations.accommodations.length > 0 && (
                    <View style={styles.recommendationGroup}>
                      <Text style={styles.recommendationTitle}>
                        🏨 Konaklama Önerileri
                      </Text>
                      {trip.aiPlan.recommendations.accommodations.map(
                        (acc, index) => {
                          const accName =
                            typeof acc === "string" ? acc : acc.name || "Otel";
                          const accRating =
                            typeof acc === "object" ? acc.rating : null;
                          const accPrice =
                            typeof acc === "object" ? acc.price : null;
                          return (
                            <View key={index} style={{ marginBottom: 4 }}>
                              <Text style={styles.recommendationItem}>
                                • {accName}
                              </Text>
                              {accRating && (
                                <Text
                                  style={[
                                    styles.recommendationItem,
                                    {
                                      fontSize: 12,
                                      marginLeft: 10,
                                      color: Colors.GRAY,
                                    },
                                  ]}
                                >
                                  ⭐ {accRating}{" "}
                                  {accPrice ? `• ${accPrice}` : ""}
                                </Text>
                              )}
                            </View>
                          );
                        },
                      )}
                    </View>
                  )}

                {trip.aiPlan.recommendations.restaurants &&
                  trip.aiPlan.recommendations.restaurants.length > 0 && (
                    <View style={styles.recommendationGroup}>
                      <Text style={styles.recommendationTitle}>
                        🍽️ Restoranlar
                      </Text>
                      {trip.aiPlan.recommendations.restaurants.map(
                        (restaurant, index) => (
                          <Text key={index} style={styles.recommendationItem}>
                            • {restaurant}
                          </Text>
                        ),
                      )}
                    </View>
                  )}

                {trip.aiPlan.recommendations.attractions &&
                  trip.aiPlan.recommendations.attractions.length > 0 && (
                    <View style={styles.recommendationGroup}>
                      <Text style={styles.recommendationTitle}>
                        📍 Görülecek Yerler
                      </Text>
                      {trip.aiPlan.recommendations.attractions.map(
                        (attraction, index) => (
                          <Text key={index} style={styles.recommendationItem}>
                            • {attraction}
                          </Text>
                        ),
                      )}
                    </View>
                  )}

                {trip.aiPlan.recommendations.tips &&
                  trip.aiPlan.recommendations.tips.length > 0 && (
                    <View style={styles.recommendationGroup}>
                      <Text style={styles.recommendationTitle}>
                        💡 İpuçları
                      </Text>
                      {trip.aiPlan.recommendations.tips.map((tip, index) => (
                        <Text key={index} style={styles.recommendationItem}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  )}
              </View>
            )}
          </View>
        )}

        {/* Created Date */}
        <View style={[styles.footerCard, { marginHorizontal: 25 }]}>
          <Ionicons name="time" size={16} color={Colors.GRAY} />
          <Text style={styles.footerText}>
            Oluşturulma: {formatDate(trip.createdAt)}
          </Text>
        </View>
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
    padding: 0,
    paddingTop: 0,
  },
  headerImage: {
    width: "100%",
    height: 250,
    marginBottom: 20,
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
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
  },
  retryButtonText: {
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  headerSection: {
    marginBottom: 25,
  },
  tripName: {
    fontSize: 32,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeUpcoming: {
    backgroundColor: "#ECFDF5",
  },
  statusBadgePast: {
    backgroundColor: "#F3F4F6",
  },
  statusBadgeText: {
    fontFamily: "outfit-medium",
    fontSize: 12,
  },
  statusBadgeTextUpcoming: {
    color: "#10B981",
  },
  statusBadgeTextPast: {
    color: Colors.GRAY,
  },
  card: {
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  cardSubValue: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 10,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  mapButtonText: {
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    flex: 1,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
  },
  interestTagText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: Colors.PRIMARY,
  },
  notesText: {
    fontSize: 15,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    lineHeight: 22,
  },
  itinerarySection: {
    marginTop: 15,
  },
  dayCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  dayBadge: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 12,
    color: Colors.WHITE,
  },
  dayTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    flex: 1,
  },
  dayTime: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 10,
  },
  activitiesList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    flex: 1,
  },
  moreActivitiesText: {
    fontSize: 13,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginTop: 8,
    fontStyle: "italic",
  },
  recommendationsSection: {
    marginTop: 15,
  },
  recommendationGroup: {
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 5,
    lineHeight: 20,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
  },
});
