import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
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
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../configs/FirebaseMessages";
import { Colors } from "../constants/Colors";

export default function SavedPlaces() {
  const navigation = useNavigation();
  const router = useRouter();
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "Kaydedilen Yerler",
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  useEffect(() => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, initMessage);
      setLoading(false);
      return;
    }

    if (!auth?.currentUser || !db) {
      setLoading(false);
      return;
    }

    const savedPlacesRef = collection(db, "savedPlaces");
    const q = query(
      savedPlacesRef,
      where("userId", "==", auth?.currentUser?.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const places = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          places.push({
            id: doc.id,
            ...data,
            savedAt: data.savedAt?.toDate ? data.savedAt.toDate() : new Date(),
          });
        });
        // Client-side'da tarihe göre sırala
        places.sort((a, b) => {
          const aDate = a.savedAt || new Date(0);
          const bDate = b.savedAt || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        setSavedPlaces(places);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching saved places:", error);
        // Composite index hatası için fallback
        if (error.code === "failed-precondition") {
          console.warn(
            "⚠️ Firestore composite index gerekiyor. Sadece userId ile filtreleme yapılıyor.",
          );
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleDeletePlace = async (placeId) => {
    Alert.alert(
      "Yeri Kaldır",
      "Bu yeri kaydedilenlerden kaldırmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "savedPlaces", placeId));
            } catch (error) {
              console.error("Error deleting place:", error);
              Alert.alert("Hata", "Yer kaldırılırken bir hata oluştu.");
            }
          },
        },
      ],
    );
  };

  const openInMaps = (place) => {
    if (place.coordinates) {
      const { lat, lon } = place.coordinates;
      const url =
        place.url ||
        `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
      Linking.openURL(url).catch((err) => {
        console.error("Maps açma hatası:", err);
        Alert.alert("Hata", "Harita açılamadı");
      });
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.WHITE,
        }}
      >
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text
          style={{ fontFamily: "outfit", color: Colors.GRAY, marginTop: 10 }}
        >
          Yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={{ padding: 25, paddingTop: 75 }}>
        {savedPlaces.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 100,
            }}
          >
            <Ionicons name="heart-outline" size={80} color={Colors.GRAY} />
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 24,
                color: Colors.PRIMARY,
                marginTop: 20,
                marginBottom: 10,
              }}
            >
              Henüz Kaydedilen Yer Yok
            </Text>
            <Text
              style={{
                fontFamily: "outfit",
                fontSize: 16,
                color: Colors.GRAY,
                textAlign: "center",
                marginBottom: 30,
              }}
            >
              Keşfet sayfasından beğendiğiniz yerleri kaydedebilirsiniz
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/discover")}
              style={{
                paddingHorizontal: 30,
                paddingVertical: 15,
                backgroundColor: Colors.PRIMARY,
                borderRadius: 15,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons name="globe" size={20} color={Colors.WHITE} />
              <Text
                style={{
                  color: Colors.WHITE,
                  fontFamily: "outfit-medium",
                  fontSize: 16,
                }}
              >
                Keşfet Sayfasına Git
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text
              style={{
                fontFamily: "outfit",
                fontSize: 14,
                color: Colors.GRAY,
                marginBottom: 20,
              }}
            >
              {savedPlaces.length} kaydedilen yer
            </Text>

            {savedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
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
                }}
                onPress={() => openInMaps(place)}
              >
                {/* Place Image */}
                {place.photoUrl && (
                  <Image
                    source={{ uri: place.photoUrl }}
                    style={{
                      width: "100%",
                      height: 180,
                    }}
                    resizeMode="cover"
                  />
                )}

                <View style={{ padding: 20 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "outfit-bold",
                          fontSize: 20,
                          color: Colors.PRIMARY,
                          marginBottom: 5,
                        }}
                      >
                        {place.name}
                      </Text>
                      {place.address && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 5,
                          }}
                        >
                          <Ionicons
                            name="location"
                            size={16}
                            color={Colors.GRAY}
                          />
                          <Text
                            style={{
                              fontFamily: "outfit",
                              fontSize: 14,
                              color: Colors.GRAY,
                              marginLeft: 5,
                              flex: 1,
                            }}
                          >
                            {place.address}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeletePlace(place.id)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: "#FEE2E2",
                      }}
                    >
                      <Ionicons name="heart" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {place.savedAt && (
                    <Text
                      style={{
                        fontFamily: "outfit",
                        fontSize: 12,
                        color: Colors.GRAY,
                        marginTop: 5,
                      }}
                    >
                      {formatDate(place.savedAt)} tarihinde kaydedildi
                    </Text>
                  )}

                  <TouchableOpacity
                    onPress={() => openInMaps(place)}
                    style={{
                      marginTop: 15,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: "#F0F9FF",
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="map-outline"
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
                      Haritada Görüntüle
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
