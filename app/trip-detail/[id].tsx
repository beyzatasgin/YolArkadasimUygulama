import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "../../configs/FirebaseMessages";
import TripMap from "../../components/TripMap";
import TripRating from "../../components/TripRating";
import WeatherCard from "../../components/WeatherCard";
import { useAttractionPins } from "../../hooks/useAttractionPins";
import { cancelTripNotifications } from "../../services/notificationService";
import { getPlaceImageUrl as getPlaceImage } from "../../utils/imageHelper";
import { Colors } from "../../constants/Colors";
import { getInterestLabel } from "../../constants/tripPreferences";
import { useCreateTrip } from "../../hooks/useCreateTrip";

const ACCENT = "#6366F1";
const DARK_BG = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const SUCCESS = "#10B981";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { setTripData } = useCreateTrip();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [placeImageUrl, setPlaceImageUrl] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTripName, setEditTripName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const centerLat = trip?.selectedPlace?.coordinates?.lat
    ? Number(trip.selectedPlace.coordinates.lat)
    : undefined;
  const centerLon = trip?.selectedPlace?.coordinates?.lon
    ? Number(trip.selectedPlace.coordinates.lon)
    : undefined;

  const { pins: attractionPins, loading: pinsLoading } = useAttractionPins(
    trip?.aiPlan?.recommendations ?? null,
    centerLat,
    centerLon,
  );

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
              await deleteDoc(doc(db, "trips", id as string));
              await cancelTripNotifications(id as string).catch(() => {});
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
    setEditTripName(trip.tripName || "");
    setEditNotes(trip.notes || "");
    setEditModalVisible(true);
  }, [trip]);

  const handleShareTrip = useCallback(async () => {
    if (!trip) return;

    const formatDate = (date: Date | null) => {
      if (!date) return "?";
      return new Date(date).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    let message = `✈️ *${trip.tripName}*\n`;
    message += `📍 ${trip.selectedPlace?.name || "Belirtilmemiş"}\n`;
    message += `📅 ${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`;
    if (trip.duration) message += ` (${trip.duration} gün)`;
    message += `\n👥 ${trip.travelers || 1} kişi\n`;

    if (trip.aiPlan?.itinerary?.length) {
      message += `\n📋 *Günlük Plan:*\n`;
      trip.aiPlan.itinerary.forEach((day) => {
        message += `\nGün ${day.day}: ${day.title}\n`;
        day.activities?.slice(0, 3).forEach((act) => {
          message += `  • ${act}\n`;
        });
      });
    }

    if (trip.aiPlan?.recommendations?.tips?.length) {
      message += `\n💡 *İpuçları:*\n`;
      trip.aiPlan.recommendations.tips.slice(0, 3).forEach((tip) => {
        message += `  • ${tip}\n`;
      });
    }

    if (trip.aiPlan?.estimatedCost != null) {
      message += `\n💰 Tahmini Bütçe: ${trip.aiPlan.estimatedCost.toLocaleString("tr-TR")} ₺ (kişi başı)\n`;
    }

    message += `\n🤖 Yol Arkadaşım uygulamasıyla oluşturuldu.`;

    try {
      await Share.share({ message });
    } catch (err) {
      console.error("Paylaşım hatası:", err);
    }
  }, [trip]);

  const handleSaveEdit = useCallback(async () => {
    if (!editTripName.trim()) {
      Alert.alert("Hata", "Seyahat adı boş bırakılamaz.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, "trips", id as string), {
        tripName: editTripName.trim(),
        notes: editNotes.trim(),
      });
      setTrip((prev) => ({
        ...prev,
        tripName: editTripName.trim(),
        notes: editNotes.trim(),
      }));
      setEditModalVisible(false);
      Alert.alert("Kaydedildi", "Seyahat bilgileri güncellendi.");
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      Alert.alert("Hata", "Güncelleme sırasında bir sorun oluştu.");
    } finally {
      setSavingEdit(false);
    }
  }, [editNotes, editTripName, id]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(10,15,30,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleShareTrip}
            style={styles.headerIconBtn}
          >
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleEditTrip}
            style={styles.headerIconBtn}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteTrip}
            style={[styles.headerIconBtn, { backgroundColor: "rgba(239,68,68,0.75)" }]}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, router, handleDeleteTrip, handleEditTrip, handleShareTrip]);

  const getFallbackImageUrl = useCallback(
    (placeName?: string | null) => getPlaceImage(placeName),
    [],
  );

  const getPlaceImageUrl = useCallback(
    (placeName?: string | null) => getPlaceImage(placeName),
    [],
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

      if (data.userId !== auth?.currentUser?.uid) {
        setError("Bu seyahate erişim yetkiniz yok");
        setLoading(false);
        return;
      }

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

  const openInMaps = () => {
    if (trip?.selectedPlace?.coordinates) {
      const { lat, lon } = trip.selectedPlace.coordinates;
      const url =
        trip.selectedPlace.url ||
        `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
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
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={TEXT_MUTED} />
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

  const finalImageUrl =
    placeImageUrl ||
    trip?.selectedPlace?.photoUrl ||
    getFallbackImageUrl(trip?.selectedPlace?.name);

  return (
    <>
      {/* Edit Modal — kept exactly as-is, just minor style refresh */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 28,
              gap: 14,
            }}
          >
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 20,
                color: TEXT_PRIMARY,
                marginBottom: 4,
              }}
            >
              Seyahati Düzenle
            </Text>

            <Text style={{ fontFamily: "outfit-medium", color: TEXT_PRIMARY }}>
              Seyahat Adı
            </Text>
            <TextInput
              value={editTripName}
              onChangeText={setEditTripName}
              placeholder="Seyahat adı"
              placeholderTextColor={TEXT_MUTED}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                fontFamily: "outfit",
                fontSize: 15,
                color: TEXT_PRIMARY,
              }}
            />

            <Text style={{ fontFamily: "outfit-medium", color: TEXT_PRIMARY }}>
              Notlar (isteğe bağlı)
            </Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Seyahate dair notlarınız..."
              placeholderTextColor={TEXT_MUTED}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                fontFamily: "outfit",
                fontSize: 15,
                minHeight: 90,
                textAlignVertical: "top",
                color: TEXT_PRIMARY,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
                disabled={savingEdit}
              >
                <Text style={{ fontFamily: "outfit-medium", color: TEXT_MUTED }}>
                  İptal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: ACCENT,
                  alignItems: "center",
                }}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontFamily: "outfit-medium", color: "#fff" }}>
                    Kaydet
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Image ──────────────────────────────────── */}
        {finalImageUrl && (
          <Image
            source={{ uri: finalImageUrl }}
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.bodyWrapper}>
          {/* ── Trip Name + Status ──────────────────────────── */}
          <View style={{ marginBottom: 20 }}>
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
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor:
                      tripStatus === "Yaklaşan" ? SUCCESS : TEXT_MUTED,
                    marginRight: 6,
                  }}
                />
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

          {/* ── Konum ───────────────────────────────────────── */}
          <InfoCard
            iconName="location"
            iconColor="#6366F1"
            iconBg="#EEF2FF"
            title="Konum"
          >
            <Text style={styles.cardValue}>
              {trip.selectedPlace?.name || "Belirtilmemiş"}
            </Text>
            {trip.selectedPlace?.address && (
              <Text style={styles.cardSubValue}>
                {trip.selectedPlace.address}
              </Text>
            )}
            {trip.selectedPlace?.coordinates && (
              <>
                <TripMap
                  coordinates={trip.selectedPlace.coordinates}
                  title={trip.selectedPlace.name}
                  extraPins={attractionPins}
                />
                {pinsLoading && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={{ fontFamily: "outfit", fontSize: 12, color: "#9CA3AF" }}>
                      Yerler haritaya ekleniyor...
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={openInMaps}
                >
                  <Ionicons name="map-outline" size={18} color={ACCENT} />
                  <Text style={styles.mapButtonText}>
                    Google Maps&apos;te Aç
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </InfoCard>

          {/* ── Hava Durumu ────────────────────────────────── */}
          {trip.selectedPlace?.coordinates && (
            <InfoCard
              iconName="partly-sunny"
              iconColor="#F59E0B"
              iconBg="#FFFBEB"
              title="Hava Durumu"
            >
              <WeatherCard
                latitude={Number(trip.selectedPlace.coordinates.lat)}
                longitude={Number(trip.selectedPlace.coordinates.lon)}
                placeName={trip.selectedPlace.name}
              />
            </InfoCard>
          )}

          {/* ── Tarih ve Süre ───────────────────────────────── */}
          <InfoCard
            iconName="calendar"
            iconColor="#F59E0B"
            iconBg="#FFFBEB"
            title="Tarih ve Süre"
          >
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={TEXT_MUTED} />
              <Text style={styles.infoText}>
                {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
              </Text>
            </View>
            {trip.duration && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={18} color={TEXT_MUTED} />
                <Text style={styles.infoText}>{trip.duration} gün</Text>
              </View>
            )}
          </InfoCard>

          {/* ── Seyahat Bilgileri ───────────────────────────── */}
          <InfoCard
            iconName="people"
            iconColor="#10B981"
            iconBg="#ECFDF5"
            title="Seyahat Bilgileri"
          >
            {trip.travelers && (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={18} color={TEXT_MUTED} />
                <Text style={styles.infoText}>{trip.travelers} kişi</Text>
              </View>
            )}
          </InfoCard>

          {/* ── İlgi Alanları ───────────────────────────────── */}
          {trip.interests && trip.interests.length > 0 && (
            <InfoCard
              iconName="heart"
              iconColor="#EF4444"
              iconBg="#FEF2F2"
              title="İlgi Alanları"
            >
              <View style={styles.interestsContainer}>
                {trip.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>
                      {getInterestLabel(interest)}
                    </Text>
                  </View>
                ))}
              </View>
            </InfoCard>
          )}

          {/* ── Notlar ──────────────────────────────────────── */}
          {trip.notes && (
            <InfoCard
              iconName="document-text"
              iconColor="#8B5CF6"
              iconBg="#F5F3FF"
              title="Notlar"
            >
              <Text style={styles.notesText}>{trip.notes}</Text>
            </InfoCard>
          )}

          {/* ── AI Seyahat Planı ────────────────────────────── */}
          {trip.aiPlan && (
            <InfoCard
              iconName="sparkles"
              iconColor={ACCENT}
              iconBg="#EEF2FF"
              title="AI Seyahat Planı"
            >
              {/* Tahmini Maliyet */}
              {trip.aiPlan.estimatedCost != null && (
                <View style={styles.costBadge}>
                  <Ionicons name="wallet-outline" size={18} color={SUCCESS} />
                  <Text style={styles.costText}>
                    Tahmini Bütçe:{" "}
                    <Text style={{ fontFamily: "outfit-bold" }}>
                      {trip.aiPlan.estimatedCost.toLocaleString("tr-TR")} ₺
                    </Text>
                    {"  "}
                    <Text
                      style={{
                        fontFamily: "outfit",
                        fontSize: 12,
                        color: "#047857",
                      }}
                    >
                      (kişi başı)
                    </Text>
                  </Text>
                </View>
              )}

              {/* Günlük Plan */}
              {trip.aiPlan.itinerary && trip.aiPlan.itinerary.length > 0 && (
                <View style={{ marginTop: 14, gap: 12 }}>
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
                          size={18}
                          color={TEXT_MUTED}
                        />
                      </View>
                      {day.time && (
                        <Text style={styles.dayTime}>{day.time}</Text>
                      )}
                      {day.activities && day.activities.length > 0 && (
                        <View style={{ gap: 6 }}>
                          {day.activities.slice(0, 3).map((activity, actIndex) => (
                            <View key={actIndex} style={styles.activityItem}>
                              <Ionicons
                                name="checkmark-circle"
                                size={15}
                                color={ACCENT}
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

              {/* Öneriler */}
              {trip.aiPlan.recommendations && (
                <View style={{ marginTop: 20, gap: 16 }}>
                  {trip.aiPlan.recommendations.accommodations &&
                    trip.aiPlan.recommendations.accommodations.length > 0 && (
                      <RecommendationGroup
                        emoji="🏨"
                        title="Konaklama Önerileri"
                        items={trip.aiPlan.recommendations.accommodations}
                      />
                    )}

                  {trip.aiPlan.recommendations.restaurants &&
                    trip.aiPlan.recommendations.restaurants.length > 0 && (
                      <RecommendationGroup
                        emoji="🍽️"
                        title="Restoranlar"
                        items={trip.aiPlan.recommendations.restaurants}
                      />
                    )}

                  {trip.aiPlan.recommendations.attractions &&
                    trip.aiPlan.recommendations.attractions.length > 0 && (
                      <RecommendationGroup
                        emoji="📍"
                        title="Görülecek Yerler"
                        items={trip.aiPlan.recommendations.attractions}
                      />
                    )}

                  {/* İpuçları */}
                  {trip.aiPlan.recommendations.tips &&
                    trip.aiPlan.recommendations.tips.length > 0 && (
                      <View>
                        <Text style={styles.recGroupTitle}>💡 İpuçları</Text>
                        <View style={styles.tipsCard}>
                          {trip.aiPlan.recommendations.tips.map(
                            (tip, index) => (
                              <View
                                key={index}
                                style={styles.tipRow}
                              >
                                <Ionicons
                                  name="bulb-outline"
                                  size={15}
                                  color={WARNING}
                                />
                                <Text style={styles.tipText}>{tip}</Text>
                              </View>
                            ),
                          )}
                        </View>
                      </View>
                    )}
                </View>
              )}
            </InfoCard>
          )}

          {/* ── Değerlendirme (geçmiş seyahatler) ─────────── */}
          {tripStatus === "Geçmiş" && (
            <InfoCard
              iconName="star"
              iconColor={WARNING}
              iconBg="#FFFBEB"
              title="Değerlendirme"
            >
              <TripRating
                tripId={trip.id}
                initialRating={trip.rating ?? null}
                initialReview={trip.review ?? null}
                onSaved={(r, rev) =>
                  setTrip((prev) => ({ ...prev, rating: r, review: rev }))
                }
              />
            </InfoCard>
          )}

          {/* ── AI Asistan Butonu ── */}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/ai-chat",
                params: {
                  placeName: trip.selectedPlace?.name || "",
                  startDate: trip.startDate ? new Date(trip.startDate).toLocaleDateString("tr-TR") : "",
                  endDate: trip.endDate ? new Date(trip.endDate).toLocaleDateString("tr-TR") : "",
                  duration: String(trip.duration || ""),
                  travelers: String(trip.travelers || 1),
                  interests: JSON.stringify(trip.interests || []),
                },
              })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginHorizontal: 20,
              marginBottom: 16,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: ACCENT,
              shadowColor: ACCENT,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: "#fff" }}>
              AI Asistan ile Sohbet Et
            </Text>
          </TouchableOpacity>

          {/* ── Footer ──────────────────────────────────────── */}
          <View style={styles.footerRow}>
            <Ionicons name="time-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.footerText}>
              Oluşturulma: {formatDate(trip.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

/* ── Shared sub-components ──────────────────────────────── */

function InfoCard({
  iconName,
  iconColor,
  iconBg,
  title,
  children,
}: {
  iconName: string;
  iconColor: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIconCircle, { backgroundColor: iconBg }]}
        >
          <Ionicons name={iconName as any} size={18} color={iconColor} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function RecommendationGroup({
  emoji,
  title,
  items,
}: {
  emoji: string;
  title: string;
  items: any[];
}) {
  return (
    <View>
      <Text style={styles.recGroupTitle}>
        {emoji} {title}
      </Text>
      <View style={styles.recGroupCard}>
        {items.map((item, index) => {
          const name =
            typeof item === "string" ? item : item.name || "Yer";
          const rating =
            typeof item === "object" ? item.rating : null;
          const url = typeof item === "object" ? item.url : null;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.recRow,
                index < items.length - 1 && styles.recRowBorder,
              ]}
              onPress={() =>
                url
                  ? Linking.openURL(url)
                  : Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
                    )
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.recName}>{name}</Text>
                {rating && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(Number(rating)) ? "star" : "star-outline"}
                        size={11}
                        color={WARNING}
                      />
                    ))}
                    <Text
                      style={{
                        fontFamily: "outfit",
                        fontSize: 11,
                        color: TEXT_MUTED,
                        marginLeft: 3,
                      }}
                    >
                      {rating}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="open-outline" size={15} color={ACCENT} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BODY_BG,
  },
  headerImage: {
    width: "100%",
    height: 250,
  },
  bodyWrapper: {
    padding: 20,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BODY_BG,
  },
  loadingText: {
    marginTop: 14,
    fontFamily: "outfit",
    color: TEXT_MUTED,
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    backgroundColor: BODY_BG,
  },
  errorText: {
    marginTop: 14,
    fontFamily: "outfit",
    color: TEXT_MUTED,
    textAlign: "center",
    fontSize: 15,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: ACCENT,
    borderRadius: 14,
  },
  retryButtonText: {
    fontFamily: "outfit-medium",
    color: "#fff",
    fontSize: 15,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(10,15,30,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  tripName: {
    fontSize: 30,
    fontFamily: "outfit-bold",
    color: TEXT_PRIMARY,
    marginBottom: 10,
    lineHeight: 36,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    fontSize: 13,
  },
  statusBadgeTextUpcoming: {
    color: SUCCESS,
  },
  statusBadgeTextPast: {
    color: TEXT_MUTED,
  },

  /* Cards */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: TEXT_PRIMARY,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubValue: {
    fontSize: 13,
    fontFamily: "outfit",
    color: TEXT_MUTED,
    marginBottom: 10,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
  },
  mapButtonText: {
    fontFamily: "outfit-medium",
    color: ACCENT,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: TEXT_PRIMARY,
    flex: 1,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
  },
  interestTagText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },

  /* Cost badge */
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    gap: 8,
  },
  costText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: "#065F46",
  },

  /* Day cards */
  dayCard: {
    backgroundColor: BODY_BG,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  dayBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 11,
    color: "#fff",
  },
  dayTitle: {
    fontSize: 14,
    fontFamily: "outfit-bold",
    color: TEXT_PRIMARY,
    flex: 1,
  },
  dayTime: {
    fontSize: 12,
    fontFamily: "outfit",
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  activityText: {
    fontSize: 13,
    fontFamily: "outfit",
    color: TEXT_PRIMARY,
    flex: 1,
    lineHeight: 19,
  },
  moreActivitiesText: {
    fontSize: 12,
    fontFamily: "outfit-medium",
    color: ACCENT,
    marginTop: 4,
  },

  /* Recommendation groups */
  recGroupTitle: {
    fontSize: 14,
    fontFamily: "outfit-bold",
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  recGroupCard: {
    backgroundColor: BODY_BG,
    borderRadius: 12,
    overflow: "hidden",
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  recName: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: TEXT_PRIMARY,
  },

  /* Tips card */
  tipsCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: WARNING,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#92400E",
    flex: 1,
    lineHeight: 19,
  },

  /* Footer */
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "outfit",
    color: TEXT_MUTED,
  },
});
