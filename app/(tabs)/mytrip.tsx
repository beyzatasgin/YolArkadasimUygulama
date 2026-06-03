import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
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
  ImageBackground,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import StartNewTripCard from "../../components/MyTrips/StartNewTripCard";
import { StarRow } from "../../components/TripRating";
import { cancelTripNotifications } from "../../services/notificationService";
import { getPlaceImageUrl } from "../../utils/imageHelper";
import { auth, db, firebaseInitError } from "../../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../../configs/FirebaseMessages";
import { Colors } from "../../constants/Colors";
import { defaultTripData } from "../../context/CreateTripContext";
import { useCreateTrip } from "../../hooks/useCreateTrip";
import type { TripListItem } from "../../types/trip";
import { requireDb } from "../../utils/firestore";
import { appPush } from "../../utils/router";

const INDIGO = "#6366F1";
const BG = "#F5F7FB";
const DARK_HEADER = "#0A0F1E";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const SUCCESS = "#10B981";
const DANGER = "#EF4444";

export default function Mytrip() {
  const router = useRouter();
  const { setTripData } = useCreateTrip();
  const [userTrips, setUserTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState<TripListItem[]>([]);
  const [pastTrips, setPastTrips] = useState<TripListItem[]>([]);

  const handleStartNewTrip = () => {
    setTripData(defaultTripData);
    appPush(router, "/create-trip/search-place");
  };

  useEffect(() => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, initMessage);
      setUserTrips([]);
      setUpcomingTrips([]);
      setPastTrips([]);
      setLoading(false);
      return;
    }

    if (!auth?.currentUser || !db) {
      setUserTrips([]);
      setUpcomingTrips([]);
      setPastTrips([]);
      setLoading(false);
      return;
    }

    console.log(
      "🔄 Setting up trips listener for user:",
      auth?.currentUser?.uid,
    );

    const tripsRef = collection(db, "trips");
    let unsubscribe: (() => void) | null = null;
    let fallbackUnsubscribe: (() => void) | null = null;

    try {
      const q = query(
        tripsRef,
        where("userId", "==", auth?.currentUser?.uid),
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!auth?.currentUser) {
            console.warn("⚠️ User logged out during snapshot");
            return;
          }

          const trips: TripListItem[] = [];
          snapshot.forEach((doc) => {
            if (!doc.exists()) {
              console.warn("⚠️ Document does not exist:", doc.id);
              return;
            }

            const data = doc.data();

            let startDate: Date | null = null;
            let endDate: Date | null = null;
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

            trips.push({
              id: doc.id,
              ...data,
              startDate,
              endDate,
              createdAt,
            });
          });

          trips.sort((a, b) => {
            const aDate = a.createdAt || new Date(0);
            const bDate = b.createdAt || new Date(0);
            return bDate.getTime() - aDate.getTime();
          });

          console.log("✅ Trips loaded:", trips.length);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const upcoming: TripListItem[] = [];
          const past: TripListItem[] = [];

          trips.forEach((trip) => {
            if (trip.startDate) {
              const tripStart = new Date(trip.startDate);
              tripStart.setHours(0, 0, 0, 0);
              if (tripStart >= today) {
                upcoming.push(trip);
              } else {
                past.push(trip);
              }
            } else {
              upcoming.push(trip);
            }
          });

          setUserTrips(trips);
          setUpcomingTrips(upcoming);
          setPastTrips(past);
          setLoading(false);
        },
        (error) => {
          console.error("❌ Error fetching trips:", error);
          setLoading(false);

          if (error.code === "failed-precondition") {
            console.warn(
              "⚠️ Firestore composite index gerekiyor. Firebase Console'da index oluşturun.",
            );
            if (auth?.currentUser) {
              const fallbackQuery = query(
                tripsRef,
                where("userId", "==", auth?.currentUser?.uid),
              );

              fallbackUnsubscribe = onSnapshot(
                fallbackQuery,
                (fallbackSnapshot) => {
                  if (!auth?.currentUser) {
                    console.warn("⚠️ User logged out during fallback snapshot");
                    return;
                  }

                  const trips: TripListItem[] = [];
                  fallbackSnapshot.forEach((doc) => {
                    if (!doc.exists()) {
                      return;
                    }
                    const data = doc.data();
                    trips.push({
                      id: doc.id,
                      ...data,
                      startDate: data.startDate?.toDate
                        ? data.startDate.toDate()
                        : null,
                      endDate: data.endDate?.toDate
                        ? data.endDate.toDate()
                        : null,
                      createdAt: data.createdAt?.toDate
                        ? data.createdAt.toDate()
                        : new Date(),
                    });
                  });
                  trips.sort((a, b) => {
                    const aDate = a.createdAt || new Date(0);
                    const bDate = b.createdAt || new Date(0);
                    return bDate.getTime() - aDate.getTime();
                  });

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const upcoming = [];
                  const past = [];

                  trips.forEach((trip) => {
                    if (trip.startDate) {
                      const tripStart = new Date(trip.startDate);
                      tripStart.setHours(0, 0, 0, 0);
                      if (tripStart >= today) {
                        upcoming.push(trip);
                      } else {
                        past.push(trip);
                      }
                    } else {
                      upcoming.push(trip);
                    }
                  });

                  setUserTrips(trips);
                  setUpcomingTrips(upcoming);
                  setPastTrips(past);
                  setLoading(false);
                },
                (fallbackError) => {
                  console.error("❌ Fallback query error:", fallbackError);
                  setLoading(false);
                },
              );
            }
          }
        },
      );
    } catch (error) {
      console.error("❌ Error setting up trips query:", error);
      setLoading(false);
    }

    return () => {
      console.log("🧹 Cleaning up trips listeners");
      if (unsubscribe) {
        unsubscribe();
      }
      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
      }
    };
  }, []);

  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteTrip = async (tripId, tripName) => {
    Alert.alert(
      "Seyahati Sil",
      `"${tripName}" seyahatini silmek istediğinizden emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(requireDb(db), "trips", tripId));
              await cancelTripNotifications(tripId).catch(() => {});
              Alert.alert("Başarılı", "Seyahat başarıyla silindi.");
            } catch (error) {
              console.error("Seyahat silme hatası:", error);
              Alert.alert("Hata", "Seyahat silinirken bir hata oluştu.");
            }
          },
        },
      ],
    );
  };

  const renderTripCard = ({ item }) => {
    const placeImageUrl =
      item.selectedPlace?.photoUrl ||
      getPlaceImageUrl(item.selectedPlace?.name);

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          marginBottom: 18,
          overflow: "hidden",
          shadowColor: "#6366F1",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {/* Delete button */}
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            backgroundColor: "rgba(15,15,30,0.6)",
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteTrip(
              item.id,
              item.tripName || item.selectedPlace?.name || "Seyahat",
            );
          }}
        >
          <Ionicons name="trash-outline" size={18} color={DANGER} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/trip-detail/${item.id}`)}
          activeOpacity={0.95}
        >
          {/* Full-width image with gradient overlay */}
          <View style={{ height: 180 }}>
            {placeImageUrl ? (
              <ImageBackground
                source={{ uri: placeImageUrl }}
                style={{ flex: 1, justifyContent: "flex-end" }}
                resizeMode="cover"
              >
                {/* Dark gradient overlay */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 100,
                    backgroundColor: "transparent",
                    // Simulate gradient via layered views
                  }}
                />
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingBottom: 14,
                    paddingTop: 30,
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "outfit-bold",
                      fontSize: 20,
                      color: "#FFFFFF",
                      marginBottom: 4,
                    }}
                    numberOfLines={1}
                  >
                    {item.selectedPlace?.name || "Bilinmeyen Yer"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {item.startDate && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                        <Text style={{ fontFamily: "outfit", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                          {formatDate(item.startDate)}
                        </Text>
                      </View>
                    )}
                    {item.travelers && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.8)" />
                        <Text style={{ fontFamily: "outfit", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                          {item.travelers === 1
                            ? "Yalnız"
                            : item.travelers === 2
                              ? "Arkadaşlar"
                              : `${item.travelers} Kişi`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </ImageBackground>
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#1E2340",
                  justifyContent: "flex-end",
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "outfit-bold",
                    fontSize: 20,
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  {item.selectedPlace?.name || "Bilinmeyen Yer"}
                </Text>
              </View>
            )}
          </View>

          {/* Card bottom */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            {item.rating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <StarRow rating={item.rating} readonly size={14} />
                {item.review ? (
                  <Text
                    style={{ fontFamily: "outfit", fontSize: 12, color: TEXT_MUTED }}
                    numberOfLines={1}
                  >
                    "{item.review}"
                  </Text>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: INDIGO,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/trip-detail/${item.id}`);
              }}
            >
              <Ionicons name="map-outline" size={16} color="#FFFFFF" />
              <Text
                style={{
                  fontFamily: "outfit-medium",
                  fontSize: 15,
                  color: "#FFFFFF",
                }}
              >
                Planını Gör
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_HEADER} />

      {/* Dark header */}
      <View
        style={{
          backgroundColor: DARK_HEADER,
          paddingTop: 52,
          paddingBottom: 22,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          // Glow effect via shadow
          shadowColor: INDIGO,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: "outfit-bold",
              fontSize: 28,
              color: "#FFFFFF",
              letterSpacing: 0.3,
            }}
          >
            Seyahatlerim
          </Text>
          <Text
            style={{
              fontFamily: "outfit",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              marginTop: 2,
            }}
          >
            {userTrips.length > 0
              ? `${userTrips.length} seyahat planlandı`
              : "Maceraya hazır mısın?"}
          </Text>
        </View>

        {/* White circle + button */}
        <TouchableOpacity
          onPress={handleStartNewTrip}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: "#FFFFFF",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: INDIGO,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Ionicons name="add" size={26} color={INDIGO} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={INDIGO} />
          <Text
            style={{ fontFamily: "outfit", color: TEXT_MUTED, marginTop: 10 }}
          >
            Seyahatler yükleniyor...
          </Text>
        </View>
      ) : userTrips.length === 0 ? (
        <ScrollView style={{ flex: 1 }}>
          {/* Enhanced empty state */}
          <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "rgba(99,102,241,0.12)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="airplane-outline" size={44} color={INDIGO} />
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
              Henüz seyahat yok
            </Text>
            <Text
              style={{
                fontFamily: "outfit",
                fontSize: 15,
                color: TEXT_MUTED,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 32,
              }}
            >
              İlk seyahatini planlamak için + butonuna dokun
            </Text>
            <TouchableOpacity
              onPress={handleStartNewTrip}
              style={{
                backgroundColor: INDIGO,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: INDIGO,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={{ fontFamily: "outfit-bold", fontSize: 16, color: "#FFFFFF" }}>
                Yeni Seyahat
              </Text>
            </TouchableOpacity>
          </View>
          <StartNewTripCard />
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingTop: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* "Sıradaki Ne?" — next upcoming trip hero card */}
          {upcomingTrips.length > 0 &&
            (() => {
              const nextTrip = upcomingTrips[0];
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tripStart = nextTrip.startDate
                ? new Date(nextTrip.startDate)
                : today;
              tripStart.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil(
                (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
              );

              const heroBg =
                nextTrip.selectedPlace?.photoUrl ||
                getPlaceImageUrl(nextTrip.selectedPlace?.name);

              return (
                <View style={{ marginBottom: 28 }}>
                  {/* Section label */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="sparkles" size={18} color={INDIGO} />
                    <Text
                      style={{
                        fontFamily: "outfit-bold",
                        fontSize: 18,
                        color: TEXT_PRIMARY,
                        marginLeft: 6,
                      }}
                    >
                      Sıradaki Ne?
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/trip-detail/${nextTrip.id}`)}
                    activeOpacity={0.92}
                    style={{
                      borderRadius: 22,
                      overflow: "hidden",
                      shadowColor: INDIGO,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.3,
                      shadowRadius: 18,
                      elevation: 10,
                    }}
                  >
                    <ImageBackground
                      source={heroBg ? { uri: heroBg } : undefined}
                      style={{ minHeight: 200 }}
                      resizeMode="cover"
                    >
                      {/* Dark indigo overlay */}
                      <View
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: heroBg
                            ? "rgba(10,15,30,0.72)"
                            : "#1B1F3B",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                      />

                      <View style={{ padding: 22, zIndex: 1 }}>
                        {/* Countdown badge */}
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 14 }}>
                          <View
                            style={{
                              backgroundColor: daysUntil === 0 ? SUCCESS : INDIGO,
                              borderRadius: 50,
                              paddingHorizontal: 14,
                              paddingVertical: 6,
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                            <Text
                              style={{
                                fontFamily: "outfit-bold",
                                fontSize: 13,
                                color: "#FFFFFF",
                              }}
                            >
                              {daysUntil === 0
                                ? "Bugün!"
                                : daysUntil === 1
                                  ? "Yarın"
                                  : `${daysUntil} Gün`}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={{
                            fontFamily: "outfit-bold",
                            fontSize: 26,
                            color: "#FFFFFF",
                            marginBottom: 6,
                          }}
                          numberOfLines={1}
                        >
                          {nextTrip.tripName || nextTrip.selectedPlace?.name}
                        </Text>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 }}>
                          <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.75)" />
                          <Text
                            style={{
                              fontFamily: "outfit-medium",
                              fontSize: 15,
                              color: "rgba(255,255,255,0.85)",
                            }}
                          >
                            {nextTrip.selectedPlace?.name || "Bilinmeyen Yer"}
                          </Text>
                        </View>

                        {nextTrip.startDate && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: "rgba(255,255,255,0.12)",
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              marginBottom: 16,
                              alignSelf: "flex-start",
                              gap: 6,
                            }}
                          >
                            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                            <Text
                              style={{
                                fontFamily: "outfit-medium",
                                fontSize: 13,
                                color: "rgba(255,255,255,0.9)",
                              }}
                            >
                              {formatDate(nextTrip.startDate)}
                              {nextTrip.endDate && ` — ${formatDate(nextTrip.endDate)}`}
                            </Text>
                          </View>
                        )}

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => router.push(`/trip-detail/${nextTrip.id}`)}
                            style={{
                              flex: 1,
                              backgroundColor: "#FFFFFF",
                              paddingVertical: 11,
                              borderRadius: 12,
                              alignItems: "center",
                              flexDirection: "row",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <Ionicons name="eye-outline" size={16} color={INDIGO} />
                            <Text
                              style={{
                                fontFamily: "outfit-medium",
                                fontSize: 14,
                                color: INDIGO,
                              }}
                            >
                              Detayları Gör
                            </Text>
                          </TouchableOpacity>

                          {nextTrip.aiPlan && (
                            <TouchableOpacity
                              onPress={() => router.push(`/trip-detail/${nextTrip.id}`)}
                              style={{
                                flex: 1,
                                backgroundColor: "rgba(255,255,255,0.15)",
                                paddingVertical: 11,
                                borderRadius: 12,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 6,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.25)",
                              }}
                            >
                              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                              <Text
                                style={{
                                  fontFamily: "outfit-medium",
                                  fontSize: 14,
                                  color: "#FFFFFF",
                                }}
                              >
                                AI Planı
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              );
            })()}

          {/* Yaklaşan Seyahatler (excluding first) */}
          {upcomingTrips.length > 1 && (
            <View style={{ marginBottom: 28 }}>
              {/* Left-border accent section header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 14,
                  paddingLeft: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: INDIGO,
                }}
              >
                <Text
                  style={{
                    fontFamily: "outfit-bold",
                    fontSize: 18,
                    color: TEXT_PRIMARY,
                  }}
                >
                  Yaklaşan Seyahatler
                </Text>
              </View>
              {upcomingTrips.slice(1).map((trip) => (
                <View key={trip.id}>{renderTripCard({ item: trip })}</View>
              ))}
            </View>
          )}

          {/* Geçmiş Seyahatler */}
          {pastTrips.length > 0 && (
            <View style={{ marginBottom: 30 }}>
              {/* Left-border accent section header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 14,
                  marginTop: upcomingTrips.length > 0 ? 4 : 0,
                  paddingLeft: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: TEXT_MUTED,
                }}
              >
                <Text
                  style={{
                    fontFamily: "outfit-bold",
                    fontSize: 18,
                    color: TEXT_PRIMARY,
                  }}
                >
                  Geçmiş Seyahatler
                </Text>
              </View>
              {pastTrips.map((trip) => (
                <View key={trip.id}>{renderTripCard({ item: trip })}</View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
