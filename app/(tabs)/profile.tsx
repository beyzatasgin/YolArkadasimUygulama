import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRouter } from "expo-router";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  auth,
  db,
  firebaseInitError,
  storage,
} from "../../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../../configs/FirebaseMessages";

const ACCENT = "#6366F1";
const ACCENT_LIGHT = "#EEF2FF";

const menuActions = [
  {
    icon: "bar-chart-outline",
    label: "İstatistikler",
    sub: "Seyahat istatistikleriniz",
    color: "#10B981",
    bg: "#ECFDF5",
    target: "/statistics",
  },
  {
    icon: "heart-outline",
    label: "Kayıtlı Yerler",
    sub: "Favori destinasyonlarınız",
    color: "#EC4899",
    bg: "#FDF2F8",
    target: "/saved-places",
  },
  {
    icon: "people-outline",
    label: "Paylaşılan Seyahatler",
    sub: "Benimle paylaşılan planlar",
    color: "#F59E0B",
    bg: "#FFFBEB",
    target: "/(tabs)/mytrip",
  },
  {
    icon: "shield-checkmark-outline",
    label: "Gizlilik",
    sub: "Gizlilik ve güvenlik ayarları",
    color: "#6366F1",
    bg: "#EEF2FF",
    target: "/privacy",
  },
];

export default function Profile() {
  const navigation = useNavigation();
  const router = useRouter();

  const [fullName, setFullName] = useState(auth?.currentUser?.displayName || "");
  const [photoUri, setPhotoUri] = useState<string | null>(auth?.currentUser?.photoURL || null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [totalTrips, setTotalTrips] = useState(0);

  // Accordion animasyonu
  const accordionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Auth state dinle
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFullName(user.displayName || "");
        setPhotoUri(user.photoURL || null);
      }
    });
    return () => unsub();
  }, []);

  // Seyahatleri çek
  useEffect(() => {
    if (!auth?.currentUser || !db) return;
    const q = query(
      collection(db, "trips"),
      where("userId", "==", auth.currentUser.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming: any[] = [];
      let total = 0;
      snap.forEach((d) => {
        total++;
        const data = d.data();
        const startDate = data.startDate?.toDate
          ? data.startDate.toDate()
          : new Date(data.startDate);
        if (startDate >= today) {
          upcoming.push({ id: d.id, ...data, startDate });
        }
      });
      setTotalTrips(total);
      setUpcomingTrips(upcoming.slice(0, 3));
    }, () => {});
    return () => unsub();
  }, []);

  // Accordion aç/kapat
  const togglePassword = () => {
    const toValue = passwordOpen ? 0 : 1;
    setPasswordOpen(!passwordOpen);
    Animated.timing(accordionAnim, {
      toValue,
      duration: 280,
      useNativeDriver: false,
    }).start();
  };

  const accordionHeight = accordionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 290],
  });

  // Profil fotoğrafı yükle
  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Fotoğraf erişim izni verin.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalPhotoUri(uri);
        setPhotoUri(uri);
      }
    } catch {
      Alert.alert("Hata", "Fotoğraf açılamadı.");
    } finally {
      setPickingImage(false);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    if (!storage || !auth?.currentUser) throw new Error("Storage yok");

    // React Native'de firebase/storage yüklemeleri için iki yaygın tuzak var:
    // 1) uploadString("base64") → dahilen ArrayBuffer'dan Blob oluşturmaya
    //    çalışır, RN'in Blob implementasyonu bunu desteklemez ("Creating blobs
    //    from 'ArrayBuffer' ... are not supported" hatası).
    // 2) fetch(uri).then(r => r.blob()) → RN'in fetch polyfill'i Blob'u doğru
    //    boyut/içerikle oluşturmaz, bu da sunucudan "storage/unknown" hatası
    //    döndürülmesine yol açar.
    // Firebase'in React Native için resmi olarak önerdiği yöntem: blob'u
    // XMLHttpRequest ile almak — bu, RN'in BlobManager'ı üzerinden gerçek/uyumlu
    // bir Blob üretir ve uploadBytes ile sorunsuz çalışır.
    const blob: Blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("Fotoğraf okunamadı (network)"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const photoRef = ref(storage, `profile-photos/${auth.currentUser.uid}/${Date.now()}.jpg`);
    try {
      await uploadBytes(photoRef, blob, { contentType: "image/jpeg" });
    } finally {
      // @ts-expect-error RN Blob'da close metodu bellek temizliği için kullanılır
      if (typeof blob.close === "function") blob.close();
    }

    // getDownloadURL bazen gecikebilir (Storage metadata propagation), 5 kez dene
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        return await getDownloadURL(photoRef);
      } catch (e) {
        if (attempt === 5) throw e;
        await new Promise(r => setTimeout(r, attempt * 700));
      }
    }
    throw new Error("URL alınamadı");
  };

  const handleSaveProfile = async () => {
    const name = editName.trim();
    if (!name) { Alert.alert("Hata", "Ad boş olamaz."); return; }
    if (!auth?.currentUser) return;
    setSaving(true);
    try {
      // Orijinal (uzak) fotoğraf URL'i — yükleme başarısız olursa buna geri dönülür.
      // NOT: photoUri, kullanıcı fotoğraf seçer seçmez yerel dosya URI'sine
      // güncellendiği için (önizleme amacıyla) burada başlangıç değeri olarak
      // kullanılamaz; aksi halde yükleme başarısız olduğunda yerel "file://" URI'si
      // Firebase Auth profiline photoURL olarak kaydedilirdi.
      const originalRemotePhoto = auth.currentUser.photoURL || null;
      let finalPhoto = originalRemotePhoto;
      let photoFailed = false;
      const isNew = localPhotoUri &&
        !localPhotoUri.startsWith("http://") &&
        !localPhotoUri.startsWith("https://");
      let uploadErrorDetail = "";
      if (isNew) {
        setUploadingPhoto(true);
        try { finalPhoto = await uploadPhoto(localPhotoUri!); }
        catch (e: any) {
          photoFailed = true;
          finalPhoto = originalRemotePhoto;
          uploadErrorDetail = e?.code ? `${e.code}` : (e?.message || String(e));
          console.error("[profile] Fotoğraf yükleme hatası:", e);
        }
        finally { setUploadingPhoto(false); }
      }
      await updateProfile(auth.currentUser, {
        displayName: name,
        ...(finalPhoto ? { photoURL: finalPhoto } : {}),
      });
      await reload(auth.currentUser).catch(() => {});
      setFullName(name);
      // Yükleme başarısız olduysa önizleme amacıyla gösterilen yerel fotoğrafı
      // geri al — aksi halde kullanıcı "güncellendi" sanır ama aslında kaydedilmemiştir.
      setPhotoUri(finalPhoto);
      setLocalPhotoUri(null);
      setEditModalVisible(false);
      if (photoFailed) {
        Alert.alert(
          "Uyarı",
          `Fotoğraf yüklenemedi, lütfen tekrar deneyin. İsim güncellendi.${uploadErrorDetail ? `\n\nDetay: ${uploadErrorDetail}` : ""}`
        );
      } else if (isNew) {
        Alert.alert("✅ Kaydedildi", "Profil fotoğrafı başarıyla güncellendi.");
      } else {
        Alert.alert("✅ Kaydedildi", "Profilin güncellendi.");
      }
    } catch (e: any) {
      Alert.alert("Hata", e.code === "auth/requires-recent-login"
        ? "Güvenlik nedeniyle tekrar giriş yap."
        : "Profil güncellenemedi.");
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Hata", "Tüm alanları doldur."); return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalı."); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor."); return;
    }
    if (!auth?.currentUser?.email) return;
    setChangingPassword(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
      Alert.alert("✅ Başarılı", "Şifren değiştirildi.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      togglePassword();
    } catch (e: any) {
      Alert.alert("Hata",
        e.code === "auth/wrong-password" ? "Mevcut şifre yanlış." :
        e.code === "auth/weak-password" ? "Şifre çok zayıf." :
        e.code === "auth/requires-recent-login" ? "Tekrar giriş yapman gerekiyor." :
        "Şifre değiştirilemedi.");
    } finally { setChangingPassword(false); }
  };

  const handleSignOut = () => {
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap", style: "destructive",
        onPress: async () => {
          try { await signOut(auth!); router.replace("/"); }
          catch { Alert.alert("Hata", "Çıkış yapılamadı."); }
        },
      },
    ]);
  };

  const formatDate = (date: any) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <View style={styles.screen}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerGlow} />

        <View style={styles.headerContent}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          {/* İsim & E-posta */}
          <Text style={styles.headerName}>
            {fullName || "Kullanıcı"}
          </Text>
          <Text style={styles.headerEmail}>
            {auth?.currentUser?.email || ""}
          </Text>

          {/* İstatistikler */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Seyahat</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{upcomingTrips.length}</Text>
              <Text style={styles.statLabel}>Yaklaşan</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HESAP ── */}
        <Text style={styles.sectionTitle}>Hesap</Text>
        <TouchableOpacity
          onPress={() => { setEditName(fullName); setEditModalVisible(true); }}
          style={styles.menuRow}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIcon, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="person-outline" size={18} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Profili Düzenle</Text>
            <Text style={styles.menuSub}>Ad ve profil fotoğrafı</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </TouchableOpacity>

        {/* ── ŞİFRE DEĞİŞTİR (Accordion) ── */}
        <TouchableOpacity
          onPress={togglePassword}
          style={styles.menuRow}
          activeOpacity={0.8}
        >
          <View style={[styles.menuIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="lock-closed-outline" size={18} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Şifre Değiştir</Text>
            <Text style={styles.menuSub}>Hesap güvenliği</Text>
          </View>
          <Ionicons
            name={passwordOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color="#D1D5DB"
          />
        </TouchableOpacity>

        <Animated.View style={[styles.accordion, { height: accordionHeight, overflow: "hidden" }]}>
          <View style={styles.accordionContent}>
            {/* Mevcut şifre */}
            <View style={styles.passInput}>
              <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Mevcut şifre"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
                style={styles.passInputText}
              />
              <TouchableOpacity onPress={() => setShowCurrent(p => !p)}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {/* Yeni şifre */}
            <View style={styles.passInput}>
              <Ionicons name="key-outline" size={16} color="#9CA3AF" />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Yeni şifre"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                style={styles.passInputText}
              />
              <TouchableOpacity onPress={() => setShowNew(p => !p)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {/* Tekrar */}
            <View style={styles.passInput}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#9CA3AF" />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Yeni şifre tekrar"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                style={styles.passInputText}
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={handleChangePassword}
              style={styles.passButton}
              disabled={changingPassword}
            >
              {changingPassword
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.passButtonText}>Şifreyi Güncelle</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── MENÜ ── */}
        <Text style={styles.sectionTitle}>Menü</Text>
        <View style={styles.menuCard}>
          {menuActions.map((item, index) => (
            <View key={item.label}>
              {index > 0 && <View style={styles.menuDivider} />}
              <TouchableOpacity
                onPress={() => router.push(item.target as any)}
                style={styles.menuRow}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── ÇIKIŞ ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutButton}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── PROFİL DÜZENLEME MODAL ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Profili Düzenle</Text>

            {/* Avatar seç */}
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.modalAvatar}
              disabled={pickingImage || uploadingPhoto}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.modalAvatarImg} />
              ) : (
                <View style={[styles.modalAvatarImg, styles.avatarFallback]}>
                  <Text style={[styles.avatarInitials, { fontSize: 28 }]}>{initials}</Text>
                </View>
              )}
              <View style={styles.modalAvatarBadge}>
                {pickingImage || uploadingPhoto
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.modalAvatarHint}>Fotoğrafa dokunarak değiştir</Text>

            {/* Ad */}
            <Text style={styles.modalLabel}>Ad Soyad</Text>
            <View style={styles.modalInput}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" />
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Adın ve soyadın"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInputText}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setLocalPhotoUri(null);
                  setPhotoUri(auth?.currentUser?.photoURL || null);
                }}
                style={styles.modalCancel}
                disabled={saving}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.modalSave}
                disabled={saving || uploadingPhoto}
              >
                {saving || uploadingPhoto
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalSaveText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },

  /* Header */
  header: {
    backgroundColor: "#0A0F1E",
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  headerContent: { alignItems: "center" },
  avatarWrapper: { position: "relative", marginBottom: 14 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  avatarFallback: {
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontFamily: "outfit-bold",
    fontSize: 32,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0A0F1E",
  },
  headerName: {
    fontFamily: "outfit-bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerEmail: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    gap: 32,
  },
  statBox: { alignItems: "center" },
  statNum: { fontFamily: "outfit-bold", fontSize: 22, color: "#fff" },
  statLabel: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  /* Body */
  body: { flex: 1 },
  sectionTitle: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: "#111827",
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  seeAll: { fontFamily: "outfit-medium", fontSize: 13, color: ACCENT },

  menuCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },

  /* Trip Card */
  tripCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tripCardLeft: { flex: 1, marginRight: 12 },
  tripName: { fontFamily: "outfit-bold", fontSize: 15, color: "#111827", marginBottom: 4 },
  tripMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  tripMetaText: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF" },
  tripDateBadge: {
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tripDateText: { fontFamily: "outfit-medium", fontSize: 12, color: ACCENT },

  /* Menu Row */
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: { fontFamily: "outfit-medium", fontSize: 15, color: "#111827" },
  menuSub: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", marginTop: 1 },

  /* Accordion */
  accordion: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginTop: -6,
  },
  accordionContent: { padding: 16, paddingTop: 8 },
  passInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    gap: 8,
    backgroundColor: "#FAFAFA",
  },
  passInputText: {
    flex: 1,
    fontFamily: "outfit",
    fontSize: 14,
    color: "#111827",
  },
  passButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  passButtonText: { fontFamily: "outfit-bold", fontSize: 15, color: "#fff" },

  /* Sign Out */
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  signOutText: { fontFamily: "outfit-bold", fontSize: 15, color: "#EF4444" },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
    alignItems: "center",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "outfit-bold",
    fontSize: 20,
    color: "#111827",
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  modalAvatar: { position: "relative", marginBottom: 8 },
  modalAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  modalAvatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalAvatarHint: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: "#6B7280",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    backgroundColor: "#FAFAFA",
    marginBottom: 24,
  },
  modalInputText: {
    flex: 1,
    fontFamily: "outfit",
    fontSize: 15,
    color: "#111827",
  },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  modalCancelText: { fontFamily: "outfit-medium", color: "#6B7280", fontSize: 15 },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  modalSaveText: { fontFamily: "outfit-bold", color: "#fff", fontSize: 15 },
});
