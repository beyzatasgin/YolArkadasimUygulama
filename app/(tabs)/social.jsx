import Ionicons from "@expo/vector-icons/Ionicons";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../configs/FirebaseConfig";
import { Colors } from "../../constants/Colors";

const getFriendshipDocId = (uidA, uidB) => [uidA, uidB].sort().join("_");

export default function SocialTab() {
  const [friends, setFriends] = useState([]);
  const [incomingShares, setIncomingShares] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const currentUid = auth?.currentUser?.uid;

  useEffect(() => {
    if (!db || !currentUid) return;

    const friendshipsRef = collection(db, "friendships");
    const friendsQuery = query(
      friendshipsRef,
      where("users", "array-contains", currentUid),
    );
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      const nextFriends = snapshot.docs
        .map((docSnap) => docSnap.data())
        .map((item) => {
          const friend =
            item.userA?.uid === currentUid ? item.userB : item.userA || {};
          return {
            uid: friend.uid,
            displayName: friend.displayName || "Kullanıcı",
            email: friend.email || "",
            isOnline: !!friend.isOnline,
          };
        })
        .filter((friend) => !!friend.uid);
      setFriends(nextFriends);
    });

    const sharesQuery = query(
      collection(db, "tripShares"),
      where("toUserId", "==", currentUid),
    );
    const unsubscribeShares = onSnapshot(sharesQuery, (snapshot) => {
      const shares = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => {
          const aSec = a?.createdAt?.seconds || 0;
          const bSec = b?.createdAt?.seconds || 0;
          return bSec - aSec;
        });
      setIncomingShares(shares);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeShares();
    };
  }, [currentUid]);

  const friendUidSet = useMemo(
    () => new Set(friends.map((friend) => friend.uid)),
    [friends],
  );

  const handleFindUser = async () => {
    if (!db || !currentUid) return;
    const normalized = searchInput.trim().toLowerCase();
    if (!normalized) {
      Alert.alert("Arama Gerekli", "Lütfen e-posta veya ad soyad girin.");
      return;
    }

    setSearching(true);
    setSearchResult(null);
    try {
      let snapshot;
      if (normalized.includes("@")) {
        const userQuery = query(
          collection(db, "userProfiles"),
          where("searchableEmail", "==", normalized),
          limit(10),
        );
        snapshot = await getDocs(userQuery);
      } else {
        const userQuery = query(
          collection(db, "userProfiles"),
          where("displayNameLower", ">=", normalized),
          where("displayNameLower", "<=", `${normalized}\uf8ff`),
          limit(10),
        );
        snapshot = await getDocs(userQuery);
      }

      let found = snapshot.docs[0]?.data() || null;

      // Fallback: eski kayıtlarda searchableEmail/displayNameLower olmayabilir.
      if (!found) {
        const fallbackSnapshot = await getDocs(
          query(collection(db, "userProfiles"), limit(100)),
        );

        found =
          fallbackSnapshot.docs
            .map((docSnap) => docSnap.data())
            .find((profile) => {
              const email = String(profile?.email || "").toLowerCase();
              const searchableEmail = String(
                profile?.searchableEmail || "",
              ).toLowerCase();
              const displayName = String(profile?.displayName || "").toLowerCase();
              const displayNameLower = String(
                profile?.displayNameLower || "",
              ).toLowerCase();

              if (normalized.includes("@")) {
                return email === normalized || searchableEmail === normalized;
              }

              return (
                displayName.startsWith(normalized) ||
                displayNameLower.startsWith(normalized)
              );
            }) || null;
      }

      if (!found || found.uid === currentUid) {
        setSearchResult(null);
        Alert.alert(
          "Kullanıcı Bulunamadı",
          "Bu bilgiyle eşleşen kullanıcı bulunamadı veya kendinizi arıyorsunuz.",
        );
      } else {
        setSearchResult(found);
      }
      setSearching(false);
    } catch (error) {
      setSearching(false);
      const msg = error?.message || "Kullanıcı aranamadı.";
      Alert.alert(
        "Arama Hatası",
        msg.includes("permission")
          ? "Firestore okuma izni yok. Security rules kontrol edilmeli."
          : msg,
      );
    }
  };

  const handleAddFriend = async () => {
    if (!db || !currentUid || !searchResult?.uid) return;
    if (friendUidSet.has(searchResult.uid)) {
      Alert.alert("Bilgi", "Bu kullanıcı zaten arkadaş listende.");
      return;
    }

    setAddingFriend(true);
    try {
      const me = auth.currentUser;
      const friendDocId = getFriendshipDocId(currentUid, searchResult.uid);
      await setDoc(doc(db, "friendships", friendDocId), {
        users: [currentUid, searchResult.uid],
        userA: {
          uid: currentUid,
          displayName: me?.displayName || "Kullanıcı",
          email: me?.email || "",
          isOnline: true,
        },
        userB: {
          uid: searchResult.uid,
          displayName: searchResult.displayName || "Kullanıcı",
          email: searchResult.email || "",
          isOnline: !!searchResult.isOnline,
        },
        createdAt: serverTimestamp(),
      });
      Alert.alert("Başarılı", "Arkadaş eklendi.");
      setSearchResult(null);
      setSearchInput("");
    } catch (error) {
      Alert.alert("Hata", error?.message || "Arkadaş eklenemedi.");
    } finally {
      setAddingFriend(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.WHITE, padding: 20 }}>
      <Text style={{ fontFamily: "outfit-bold", fontSize: 30, color: Colors.PRIMARY }}>
        Sosyal
      </Text>
      <Text style={{ marginTop: 6, color: Colors.GRAY, fontFamily: "outfit" }}>
        Online arkadaşları gör, yeni arkadaş ekle, paylaşılan rotaları takip et.
      </Text>

      <View
        style={{
          marginTop: 18,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="E-posta veya ad soyad ile ara"
          placeholderTextColor={Colors.GRAY}
          autoCapitalize="none"
          style={{ fontFamily: "outfit", fontSize: 15 }}
        />
        <TouchableOpacity
          onPress={handleFindUser}
          style={{
            marginTop: 10,
            backgroundColor: Colors.PRIMARY,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          {searching ? (
            <ActivityIndicator color={Colors.WHITE} />
          ) : (
            <Text style={{ color: Colors.WHITE, fontFamily: "outfit-medium" }}>
              Kullanıcıyı Bul
            </Text>
          )}
        </TouchableOpacity>
        {searchResult && (
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#F8FAFC",
              borderRadius: 10,
              padding: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "outfit-medium", color: Colors.PRIMARY }}>
                {searchResult.displayName || "Kullanıcı"}
              </Text>
              <Text style={{ fontFamily: "outfit", color: Colors.GRAY }}>
                {searchResult.email || ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleAddFriend}
              disabled={addingFriend}
              style={{
                backgroundColor: "#16A34A",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              {addingFriend ? (
                <ActivityIndicator color={Colors.WHITE} />
              ) : (
                <Text style={{ color: Colors.WHITE, fontFamily: "outfit-medium" }}>
                  Ekle
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text
        style={{
          marginTop: 18,
          marginBottom: 8,
          fontFamily: "outfit-bold",
          fontSize: 20,
          color: Colors.PRIMARY,
        }}
      >
        Arkadaşlar ({friends.length})
      </Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.uid}
        ListEmptyComponent={
          <Text style={{ color: Colors.GRAY, fontFamily: "outfit" }}>
            Henüz arkadaş eklenmedi.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontFamily: "outfit-medium", color: Colors.PRIMARY }}>
                {item.displayName}
              </Text>
              <Text style={{ color: Colors.GRAY, fontFamily: "outfit" }}>
                {item.email}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name="ellipse"
                size={12}
                color={item.isOnline ? "#22C55E" : "#94A3B8"}
              />
              <Text style={{ color: Colors.GRAY, fontFamily: "outfit" }}>
                {item.isOnline ? "Online" : "Çevrimdışı"}
              </Text>
            </View>
          </View>
        )}
        style={{ maxHeight: 210 }}
      />

      <Text
        style={{
          marginTop: 18,
          marginBottom: 8,
          fontFamily: "outfit-bold",
          fontSize: 20,
          color: Colors.PRIMARY,
        }}
      >
        Paylaşılan Rotalar
      </Text>
      <FlatList
        data={incomingShares}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: Colors.GRAY, fontFamily: "outfit" }}>
            Henüz sana rota paylaşılmadı.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              marginBottom: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              padding: 12,
              backgroundColor: "#F8FAFC",
            }}
          >
            <Text style={{ fontFamily: "outfit-medium", color: Colors.PRIMARY }}>
              {item.tripName || "Rota"}
            </Text>
            <Text style={{ fontFamily: "outfit", color: Colors.GRAY, marginTop: 4 }}>
              {item.placeName || "Konum bilgisi yok"}
            </Text>
            <Text style={{ fontFamily: "outfit", color: Colors.GRAY, marginTop: 4 }}>
              Gönderen: {item.fromUserName || "Arkadaşın"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
