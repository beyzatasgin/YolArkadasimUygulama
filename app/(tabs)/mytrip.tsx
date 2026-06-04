import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Calendar, LocaleConfig } from "react-native-calendars";
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

// Türkçe takvim ayarları
LocaleConfig.locales["tr"] = {
  monthNames: ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],
  monthNamesShort: ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"],
  dayNames: ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"],
  dayNamesShort: ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"],
  today: "Bugün",
};
LocaleConfig.defaultLocale = "tr";

// Her seyahate farklı renk ata (döngüsel)
const TRIP_COLORS = ["#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899","#84CC16"];

function toYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function Mytrip() {
  const router = useRouter();
  const { setTripData } = useCreateTrip();
  const [userTrips, setUserTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState<TripListItem[]>([]);
  const [pastTrips, setPastTrips] = useState<TripListItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sharedTrips, setSharedTrips] = useState<TripListItem[]>([]);

  // Takvim için renkli period işaretleri
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    userTrips.forEach((trip, idx) => {
      if (!trip.startDate) return;
      const color = TRIP_COLORS[idx % TRIP_COLORS.length];
      const start = new Date(trip.startDate);
      const end = trip.endDate ? new Date(trip.endDate) : start;
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      let cur = new Date(start);
      while (cur <= end) {
        const key = toYMD(cur);
        const isStart = cur.getTime() === start.getTime();
        const isEnd   = cur.getTime() === end.getTime();
        const existing = marks[key]?.periods ?? [];
        marks[key] = {
          periods: [
            ...existing,
            { startingDay: isStart, endingDay: isEnd, color },
          ],
        };
        cur = addDays(cur, 1);
      }
    });
    // Seçili gün vurgusu
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] ?? {}),
        selected: true,
        selectedColor: INDIGO,
      };
    }
    // Bugün
    const todayKey = toYMD(new Date());
    if (!marks[todayKey]) {
      marks[todayKey] = { today: true };
    }
    return marks;
  }, [userTrips, selectedDate]);

  // Seçili güne ait seyahatler
  const tripsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return userTrips.filter((trip) => {
      if (!trip.startDate) return false;
      const start = new Date(trip.startDate);
      const end   = trip.endDate ? new Date(trip.endDate) : start;
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return sel >= start && sel <= end;
    });
  }, [selectedDate, userTrips]);

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
              console.warn("⚠️ Document does not exist:", (doc as any).id);
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

  // Benimle paylaşılan seyahatler (başkasının sharedWith listesinde e-posta var)
  useEffect(() => {
    const email = auth?.currentUser?.email;
    if (!email || !db) return;
    const q = query(
      collection(db, "trips"),
      where("sharedWith", "array-contains", email),
    );
    const unsub = onSnapshot(q, (snap) => {
      const trips: TripListItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        trips.push({
          id: d.id,
          ...data,
          startDate: data.startDate?.toDate?.() ?? (data.startDate?.seconds ? new Date(data.startDate.seconds * 1000) : null),
          endDate:   data.endDate?.toDate?.()   ?? (data.endDate?.seconds   ? new Date(data.endDate.seconds   * 1000) : null),
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        });
      });
      setSharedTrips(trips);
    }, () => {});
    return () => unsub();
  }, []);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteTrip = async (tripId: string, tripName: string) => {
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

  const renderTripCard = ({ item }: { item: TripListItem }) => {
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

        {/* Butonlar */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* AI Chat Butonu */}
          <TouchableOpacity
            onPress={() => router.push("/ai-chat")}
            style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: INDIGO,
              justifyContent: "center", alignItems: "center",
              shadowColor: INDIGO, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
            }}
          >
            <Ionicons name="sparkles" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Takvim / Liste Toggle */}
          <TouchableOpacity
            onPress={() => setViewMode(v => v === "list" ? "calendar" : "list")}
            style={{
              width: 46, height: 46, borderRadius: 23,
              backgroundColor: viewMode === "calendar" ? "#fff" : "rgba(255,255,255,0.15)",
              justifyContent: "center", alignItems: "center",
              borderWidth: viewMode === "calendar" ? 0 : 1,
              borderColor: "rgba(255,255,255,0.25)",
            }}
          >
            <Ionicons
              name={viewMode === "calendar" ? "list-outline" : "calendar-outline"}
              size={22}
              color={viewMode === "calendar" ? INDIGO : "#fff"}
            />
          </TouchableOpacity>

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
        </ScrollView>
      ) : viewMode === "calendar" ? (
        /* ── TAKVİM GÖRÜNÜMÜ ── */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Calendar
            markingType="multi-period"
            markedDates={markedDates}
            onDayPress={(day) =>
              setSelectedDate(prev => prev === day.dateString ? null : day.dateString)
            }
            theme={{
              backgroundColor: "#fff",
              calendarBackground: "#fff",
              textSectionTitleColor: TEXT_MUTED,
              selectedDayBackgroundColor: INDIGO,
              selectedDayTextColor: "#fff",
              todayTextColor: INDIGO,
              dayTextColor: TEXT_PRIMARY,
              textDisabledColor: "#D1D5DB",
              dotColor: INDIGO,
              arrowColor: INDIGO,
              monthTextColor: TEXT_PRIMARY,
              textDayFontFamily: "outfit",
              textMonthFontFamily: "outfit-bold",
              textDayHeaderFontFamily: "outfit-medium",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
            style={{ marginHorizontal: 4 }}
          />

          {/* Renk lejantı */}
          {userTrips.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
              <Text style={{ fontFamily: "outfit-bold", fontSize: 13, color: TEXT_MUTED, marginBottom: 4 }}>
                SEYAHATLER
              </Text>
              {userTrips.map((trip, idx) => (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push(`/trip-detail/${trip.id}`)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: "#fff", borderRadius: 12, padding: 12,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
                  }}
                >
                  <View style={{
                    width: 12, height: 12, borderRadius: 3,
                    backgroundColor: TRIP_COLORS[idx % TRIP_COLORS.length],
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "outfit-medium", fontSize: 14, color: TEXT_PRIMARY }} numberOfLines={1}>
                      {trip.tripName || trip.selectedPlace?.name || "Seyahat"}
                    </Text>
                    {trip.startDate && (
                      <Text style={{ fontFamily: "outfit", fontSize: 12, color: TEXT_MUTED }}>
                        {formatDate(trip.startDate)}{trip.endDate ? ` — ${formatDate(trip.endDate)}` : ""}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Seçili güne ait seyahatler */}
          {selectedDate && (
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 10 }}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
              {tripsOnSelectedDate.length === 0 ? (
                <Text style={{ fontFamily: "outfit", fontSize: 14, color: TEXT_MUTED }}>
                  Bu tarihte planlanmış seyahat yok.
                </Text>
              ) : (
                tripsOnSelectedDate.map((trip, idx) => {
                  const tripIdx = userTrips.findIndex(t => t.id === trip.id);
                  const color = TRIP_COLORS[tripIdx % TRIP_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={trip.id}
                      onPress={() => router.push(`/trip-detail/${trip.id}`)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12,
                        backgroundColor: "#fff", borderRadius: 14, padding: 14,
                        marginBottom: 10, borderLeftWidth: 4, borderLeftColor: color,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY }} numberOfLines={1}>
                          {trip.tripName || trip.selectedPlace?.name || "Seyahat"}
                        </Text>
                        <Text style={{ fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>
                          {trip.selectedPlace?.name}
                          {trip.duration ? ` • ${trip.duration} gün` : ""}
                          {trip.travelers ? ` • ${trip.travelers} kişi` : ""}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={22} color={color} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
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

                        <TouchableOpacity
                          onPress={() => router.push(`/trip-detail/${nextTrip.id}`)}
                          style={{
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
          {/* Benimle Paylaşılan */}
          {sharedTrips.length > 0 && (
            <View style={{ marginBottom: 30 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: "#8B5CF6" }}>
                <Ionicons name="people-outline" size={18} color="#8B5CF6" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: "outfit-bold", fontSize: 18, color: TEXT_PRIMARY }}>
                  Benimle Paylaşılan
                </Text>
              </View>
              {sharedTrips.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push(`/trip-detail/${trip.id}`)}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    borderLeftWidth: 4,
                    borderLeftColor: "#8B5CF6",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="airplane-outline" size={22} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY }} numberOfLines={1}>
                      {trip.tripName || trip.selectedPlace?.name || "Seyahat"}
                    </Text>
                    <Text style={{ fontFamily: "outfit", fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                      {trip.selectedPlace?.name}
                      {trip.startDate ? ` • ${formatDate(trip.startDate)}` : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
