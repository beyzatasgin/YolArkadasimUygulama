import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import StartNewTripCard from "../../components/MyTrips/StartNewTripCard";
import { auth, db, firebaseInitError } from "../../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../../configs/FirebaseMessages";
import { Colors } from "../../constants/Colors";
import {
  CreateTripContext,
  defaultTripData,
} from "../../context/CreateTripContext";

export default function Mytrip() {
  const router = useRouter();
  const { setTripData } = useContext(CreateTripContext);
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [pastTrips, setPastTrips] = useState([]);

  const handleStartNewTrip = () => {
    // Context'i temizle - yeni seyahat için
    setTripData(defaultTripData);
    router.push("/create-trip/search-place");
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

    // Auth kontrolü - kullanıcı yoksa state'i temizle ve çık
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

    // Firebase'den kullanıcının seyahatlerini çek
    const tripsRef = collection(db, "trips");
    let unsubscribe = null;
    let fallbackUnsubscribe = null;

    try {
      const q = query(
        tripsRef,
        where("userId", "==", auth?.currentUser?.uid),
        orderBy("createdAt", "desc"),
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Kullanıcı hala giriş yapmış mı kontrol et
          if (!auth?.currentUser) {
            console.warn("⚠️ User logged out during snapshot");
            return;
          }

          const trips = [];
          snapshot.forEach((doc) => {
            // Document silinmiş mi kontrol et
            if (!doc.exists()) {
              console.warn("⚠️ Document does not exist:", doc.id);
              return;
            }

            const data = doc.data();

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

            trips.push({
              id: doc.id,
              ...data,
              startDate,
              endDate,
              createdAt,
            });
          });

          // Client-side'da da sırala (ekstra güvenlik için)
          trips.sort((a, b) => {
            const aDate = a.createdAt || new Date(0);
            const bDate = b.createdAt || new Date(0);
            return bDate.getTime() - aDate.getTime(); // desc order
          });

          console.log("✅ Trips loaded:", trips.length);

          // Yaklaşan ve geçmiş seyahatleri ayır
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
              upcoming.push(trip); // Tarih yoksa yaklaşan olarak kabul et
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

          // Composite index hatası için bilgilendirme
          if (error.code === "failed-precondition") {
            console.warn(
              "⚠️ Firestore composite index gerekiyor. Firebase Console'da index oluşturun.",
            );
            // Fallback: Sadece where ile filtrele (orderBy olmadan)
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

                  const trips = [];
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
                  // Client-side sıralama
                  trips.sort((a, b) => {
                    const aDate = a.createdAt || new Date(0);
                    const bDate = b.createdAt || new Date(0);
                    return bDate.getTime() - aDate.getTime();
                  });

                  // Yaklaşan ve geçmiş seyahatleri ayır
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

    // Cleanup function - listener'ları temizle
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
              await deleteDoc(doc(db, "trips", tripId));
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
    // Place görsel URL'i (varsa kullan, yoksa dinamik oluştur)
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

    const placeImageUrl =
      item.selectedPlace?.photoUrl ||
      getPlaceImageUrl(item.selectedPlace?.name);

    return (
      <View
        style={{
          backgroundColor: Colors.WHITE,
          borderRadius: 20,
          marginBottom: 20,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          position: "relative",
        }}
      >
        {/* Silme Butonu */}
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            zIndex: 10,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
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
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Trip detay sayfasına yönlendir
            router.push(`/trip-detail/${item.id}`);
          }}
        >
          {/* Place Image */}
          {placeImageUrl && (
            <Image
              source={{ uri: placeImageUrl }}
              style={{
                width: "100%",
                height: 180,
              }}
              resizeMode="cover"
            />
          )}

          <View style={{ padding: 20 }}>
            {/* Yer Adı */}
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 18,
                color: Colors.PRIMARY,
                marginBottom: 8,
              }}
            >
              {item.selectedPlace?.name || "Bilinmeyen Yer"}
            </Text>

            {/* Tarih */}
            {item.startDate && (
              <Text
                style={{
                  fontFamily: "outfit",
                  fontSize: 14,
                  color: Colors.GRAY,
                  marginBottom: 12,
                }}
              >
                {formatDate(item.startDate)}
              </Text>
            )}

            {/* Friends / Travelers */}
            {item.travelers && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <Ionicons name="people" size={18} color={Colors.PRIMARY} />
                <Text
                  style={{
                    fontFamily: "outfit-medium",
                    fontSize: 14,
                    color: Colors.PRIMARY,
                    marginLeft: 6,
                  }}
                >
                  {item.travelers === 1
                    ? "Yalnız"
                    : item.travelers === 2
                      ? "Arkadaşlar"
                      : `${item.travelers} Kişi`}
                </Text>
              </View>
            )}

            {/* See your plan Button */}
            <TouchableOpacity
              style={{
                backgroundColor: Colors.PRIMARY,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 10,
              }}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/trip-detail/${item.id}`);
              }}
            >
              <Text
                style={{
                  fontFamily: "outfit-medium",
                  fontSize: 16,
                  color: Colors.WHITE,
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
    <View style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View
        style={{
          padding: 25,
          paddingTop: 55,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: "outfit-bold",
            fontSize: 35,
            color: Colors.PRIMARY,
          }}
        >
          Seyahatlerim
        </Text>
        <TouchableOpacity onPress={handleStartNewTrip}>
          <Ionicons name="add-circle" size={50} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
          <Text
            style={{ fontFamily: "outfit", color: Colors.GRAY, marginTop: 10 }}
          >
            Seyahatler yükleniyor...
          </Text>
        </View>
      ) : userTrips.length === 0 ? (
        <ScrollView style={{ flex: 1 }}>
          <StartNewTripCard />
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 25, paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
        >
          {/* What's Next? Section */}
          {upcomingTrips.length > 0 &&
            (() => {
              const nextTrip = upcomingTrips[0]; // En yakın seyahat
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tripStart = nextTrip.startDate
                ? new Date(nextTrip.startDate)
                : today;
              tripStart.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil(
                (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
              );

              return (
                <View style={{ marginBottom: 30 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons
                      name="sparkles"
                      size={24}
                      color={Colors.PRIMARY}
                    />
                    <Text
                      style={{
                        fontFamily: "outfit-bold",
                        fontSize: 22,
                        color: Colors.PRIMARY,
                        marginLeft: 8,
                      }}
                    >
                      Sıradaki Ne?
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/trip-detail/${nextTrip.id}`)}
                    style={{
                      backgroundColor: Colors.PRIMARY,
                      borderRadius: 20,
                      overflow: "hidden",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    {/* Gradient-like background effect */}
                    <View
                      style={{
                        padding: 25,
                        backgroundColor: Colors.PRIMARY,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 15,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: "outfit-bold",
                              fontSize: 24,
                              color: Colors.WHITE,
                              marginBottom: 5,
                            }}
                          >
                            {nextTrip.tripName}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Ionicons
                              name="location"
                              size={18}
                              color={Colors.WHITE}
                            />
                            <Text
                              style={{
                                fontFamily: "outfit-medium",
                                fontSize: 16,
                                color: Colors.WHITE,
                                marginLeft: 6,
                              }}
                            >
                              {nextTrip.selectedPlace?.name || "Bilinmeyen Yer"}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.25)",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "outfit-bold",
                              fontSize: 20,
                              color: Colors.WHITE,
                            }}
                          >
                            {daysUntil}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "outfit",
                              fontSize: 11,
                              color: Colors.WHITE,
                            }}
                          >
                            {daysUntil === 1 ? "Gün" : "Gün"}
                          </Text>
                        </View>
                      </View>

                      {nextTrip.startDate && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 15,
                            backgroundColor: "rgba(255, 255, 255, 0.15)",
                            padding: 12,
                            borderRadius: 12,
                          }}
                        >
                          <Ionicons
                            name="calendar"
                            size={18}
                            color={Colors.WHITE}
                          />
                          <Text
                            style={{
                              fontFamily: "outfit-medium",
                              fontSize: 14,
                              color: Colors.WHITE,
                              marginLeft: 8,
                            }}
                          >
                            {formatDate(nextTrip.startDate)}
                            {nextTrip.endDate &&
                              ` - ${formatDate(nextTrip.endDate)}`}
                          </Text>
                        </View>
                      )}

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          marginTop: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            router.push(`/trip-detail/${nextTrip.id}`)
                          }
                          style={{
                            flex: 1,
                            backgroundColor: Colors.WHITE,
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons
                            name="eye"
                            size={18}
                            color={Colors.PRIMARY}
                          />
                          <Text
                            style={{
                              fontFamily: "outfit-medium",
                              fontSize: 14,
                              color: Colors.PRIMARY,
                            }}
                          >
                            Detayları Gör
                          </Text>
                        </TouchableOpacity>

                        {nextTrip.aiPlan && (
                          <TouchableOpacity
                            onPress={() =>
                              router.push(`/trip-detail/${nextTrip.id}`)
                            }
                            style={{
                              flex: 1,
                              backgroundColor: "rgba(255, 255, 255, 0.2)",
                              paddingVertical: 12,
                              borderRadius: 12,
                              alignItems: "center",
                              flexDirection: "row",
                              justifyContent: "center",
                              gap: 6,
                              borderWidth: 1,
                              borderColor: "rgba(255, 255, 255, 0.3)",
                            }}
                          >
                            <Ionicons
                              name="sparkles"
                              size={18}
                              color={Colors.WHITE}
                            />
                            <Text
                              style={{
                                fontFamily: "outfit-medium",
                                fontSize: 14,
                                color: Colors.WHITE,
                              }}
                            >
                              AI Planı
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })()}

          {/* Yaklaşan Seyahatler (What's Next hariç) */}
          {upcomingTrips.length > 1 && (
            <View style={{ marginBottom: 30 }}>
              <Text
                style={{
                  fontFamily: "outfit-bold",
                  fontSize: 22,
                  color: Colors.PRIMARY,
                  marginBottom: 15,
                }}
              >
                Diğer Yaklaşan Seyahatler
              </Text>
              {upcomingTrips.slice(1).map((trip) => (
                <View key={trip.id}>{renderTripCard({ item: trip })}</View>
              ))}
            </View>
          )}

          {/* Geçmiş Seyahatler */}
          {pastTrips.length > 0 && (
            <View style={{ marginBottom: 30 }}>
              <Text
                style={{
                  fontFamily: "outfit-bold",
                  fontSize: 22,
                  color: Colors.PRIMARY,
                  marginBottom: 15,
                  marginTop: upcomingTrips.length > 0 ? 10 : 0,
                }}
              >
                Geçmiş Seyahatler
              </Text>
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
