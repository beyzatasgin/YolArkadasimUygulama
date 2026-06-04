import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "../configs/FirebaseConfig";
import {
  FIREBASE_AUTH_INIT_ERROR_TITLE,
  getFirebaseAuthInitErrorMessage,
} from "../configs/FirebaseMessages";
import {
  loadPrivacySettings,
  savePrivacySettings,
} from "../utils/privacySettings";

const ACCENT = "#6366F1";
const DARK_BG = "#0A0F1E";
const BODY_BG = "#F5F7FB";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";
const DANGER = "#EF4444";

export default function Privacy() {
  const navigation = useNavigation();
  const router = useRouter();
  const [dataSharing, setDataSharing] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [locationTracking, setLocationTracking] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadPrivacySettings().then((settings) => {
      if (!mounted) return;
      setDataSharing(settings.dataSharing);
      setAnalytics(settings.analytics);
      setLocationTracking(settings.locationTracking);
      setSettingsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const updateDataSharing = useCallback(async (value) => {
    setDataSharing(value);
    if (settingsLoaded) await savePrivacySettings({ dataSharing: value, analytics, locationTracking });
  }, [analytics, locationTracking, settingsLoaded]);

  const updateAnalytics = useCallback(async (value) => {
    setAnalytics(value);
    if (settingsLoaded) await savePrivacySettings({ dataSharing, analytics: value, locationTracking });
  }, [dataSharing, locationTracking, settingsLoaded]);

  const updateLocationTracking = useCallback(async (value) => {
    setLocationTracking(value);
    if (settingsLoaded) await savePrivacySettings({ dataSharing, analytics, locationTracking: value });
  }, [analytics, dataSharing, settingsLoaded]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleDeleteAccount = async () => {
    if (!auth) {
      Alert.alert(FIREBASE_AUTH_INIT_ERROR_TITLE, getFirebaseAuthInitErrorMessage(firebaseInitError));
      return;
    }
    if (!db) { Alert.alert("Hata", "Veritabanı bağlantısı başlatılamadı."); return; }
    if (!deleteAccountPassword.trim()) { Alert.alert("Hata", "Lütfen şifrenizi girin."); return; }
    if (!auth?.currentUser || !auth?.currentUser?.email) { Alert.alert("Hata", "Kullanıcı bilgisi bulunamadı."); return; }

    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, deleteAccountPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      const q = query(collection(db, "trips"), where("userId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "trips", d.id))));

      await deleteUser(auth.currentUser);
      Alert.alert("Hesap Silindi", "Hesabınız ve tüm verileriniz başarıyla silindi.", [
        { text: "Tamam", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      const msg =
        error.code === "auth/wrong-password" ? "Şifre yanlış. Lütfen doğru şifrenizi girin." :
        error.code === "auth/requires-recent-login" ? "Güvenlik nedeniyle lütfen tekrar giriş yapın." :
        error.message || "Hesap silinirken bir hata oluştu.";
      Alert.alert("Hata", msg);
    } finally {
      setDeleting(false);
      setDeleteAccountPassword("");
      setShowDeleteConfirm(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BODY_BG }}>
      {/* Dark Header */}
      <View style={{ backgroundColor: DARK_BG, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 20 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 22 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark" size={26} color="#fff" />
          </View>
          <View>
            <Text style={{ fontFamily: "outfit-bold", fontSize: 24, color: "#fff", letterSpacing: 0.3 }}>Gizlilik</Text>
            <Text style={{ fontFamily: "outfit", fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Gizlilik ve güvenlik ayarları</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* ── Hesap Güvenliği ─────────────────────────── */}
        <SectionLabel label="Hesap Güvenliği" />
        <View style={cardStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconCircle icon="lock-closed" color={ACCENT} bg="#EEF2FF" />
            <View style={{ flex: 1 }}>
              <Text style={cardItemTitle}>Hesap Güvenliği</Text>
              <Text style={cardItemSub}>{auth?.currentUser?.email || "E-posta adresi"}</Text>
            </View>
            <View style={{ backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontFamily: "outfit-medium", fontSize: 12, color: "#10B981" }}>Aktif</Text>
            </View>
          </View>
        </View>

        {/* ── Veri ve Gizlilik ─────────────────────────── */}
        <SectionLabel label="Veri ve Gizlilik" />
        <View style={cardStyle}>
          <ToggleRow
            icon="share-social-outline"
            iconColor="#6366F1"
            iconBg="#EEF2FF"
            title="Veri Paylaşımı"
            sub="Uygulama iyileştirmeleri için anonim kullanım verisi paylaşımı"
            value={dataSharing}
            onValueChange={updateDataSharing}
          />
          <Divider />
          <ToggleRow
            icon="bar-chart-outline"
            iconColor="#10B981"
            iconBg="#ECFDF5"
            title="Analitik"
            sub="Hangi özelliklerin kullanıldığına dair istatistikler"
            value={analytics}
            onValueChange={updateAnalytics}
          />
          <Divider />
          <ToggleRow
            icon="location-outline"
            iconColor="#F59E0B"
            iconBg="#FFFBEB"
            title="Konum İzni"
            sub="Harita ve rota özellikleri için konum erişimi"
            value={locationTracking}
            onValueChange={updateLocationTracking}
          />
        </View>

        {/* ── Gizlilik Politikası ────────────────────────── */}
        <SectionLabel label="Bilgilendirme" />

        <View style={cardStyle}>
          <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 8 }}>
            Gizlilik Politikası
          </Text>
          <Text style={{ fontFamily: "outfit", fontSize: 14, color: TEXT_MUTED, lineHeight: 22 }}>
            Yol Arkadaşım uygulaması, kullanıcı verilerini yalnızca seyahat planlaması ve uygulama
            işlevselliği için toplar. Kişisel verileriniz üçüncü taraflarla paylaşılmaz.{"\n\n"}
            Toplanan veriler:{"\n"}
            • Hesap bilgileri (ad, e-posta){"\n"}
            • Seyahat planları ve tercihler{"\n"}
            • Uygulama kullanım istatistikleri (anonim){"\n\n"}
            Tüm veriler Firebase altyapısında güvenli şekilde saklanır ve şifrelenir.
            Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir.
          </Text>
        </View>

        <View style={{ ...cardStyle, marginTop: 0 }}>
          <Text style={{ fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 8 }}>
            Kullanım Koşulları
          </Text>
          <Text style={{ fontFamily: "outfit", fontSize: 14, color: TEXT_MUTED, lineHeight: 22 }}>
            Bu uygulama, Bilgisayar Mühendisliği Bitirme Projesi kapsamında geliştirilmiş
            akademik bir çalışmadır.{"\n\n"}
            Uygulamayı kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız:{"\n"}
            • Hesabınızı yalnızca kişisel amaçlarla kullanacağınızı{"\n"}
            • Başkalarının hesaplarına yetkisiz erişim denemeyeceğinizi{"\n"}
            • Paylaştığınız içeriklerin sorumluluğunun size ait olduğunu{"\n\n"}
            Uygulama, AI servisleri (OpenAI / Google Gemini) kullanmakta olup üretilen
            seyahat planları öneri niteliğindedir.
          </Text>
        </View>

        {/* ── Tehlikeli Bölge ────────────────────────────── */}
        <SectionLabel label="Tehlikeli Bölge" danger />

        {!showDeleteConfirm ? (
          <TouchableOpacity
            style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#FECACA", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
            onPress={() =>
              Alert.alert(
                "Hesabı Sil",
                "Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.",
                [
                  { text: "İptal", style: "cancel" },
                  { text: "Devam Et", style: "destructive", onPress: () => setShowDeleteConfirm(true) },
                ],
              )
            }
          >
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="warning-outline" size={22} color={DANGER} />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontFamily: "outfit-medium", fontSize: 15, color: DANGER }}>Hesabı Sil</Text>
              <Text style={{ fontFamily: "outfit", fontSize: 13, color: "#B91C1C", marginTop: 2 }}>Tüm verileriniz kalıcı olarak silinecek</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={DANGER} />
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: "#FECACA", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
            <Text style={{ fontFamily: "outfit-bold", fontSize: 16, color: DANGER, marginBottom: 10 }}>
              Hesabı Silmek İstediğinizden Emin misiniz?
            </Text>
            <Text style={{ fontFamily: "outfit", fontSize: 14, color: TEXT_PRIMARY, marginBottom: 16, lineHeight: 21 }}>
              Hesabınızı silmek için şifrenizi girin. Bu işlem geri alınamaz.
            </Text>
            <TextInput
              value={deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
              placeholder="Şifrenizi girin"
              placeholderTextColor={TEXT_MUTED}
              secureTextEntry
              style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", fontFamily: "outfit", fontSize: 15, backgroundColor: "#FFF5F5", marginBottom: 16, color: TEXT_PRIMARY }}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setShowDeleteConfirm(false); setDeleteAccountPassword(""); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", alignItems: "center" }}
              >
                <Text style={{ fontFamily: "outfit-medium", color: TEXT_MUTED }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleting}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: DANGER, alignItems: "center", opacity: deleting ? 0.7 : 1 }}
              >
                <Text style={{ fontFamily: "outfit-medium", color: "#fff" }}>
                  {deleting ? "Siliniyor..." : "Hesabı Sil"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Helper components ─────────────────────────── */

function SectionLabel({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <Text style={{ fontFamily: "outfit-bold", fontSize: 13, color: danger ? DANGER : TEXT_MUTED, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 24, marginBottom: 10, marginLeft: 4 }}>
      {label}
    </Text>
  );
}

function IconCircle({ icon, color, bg }: { icon: string; color: string; bg: string }) {
  return (
    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 }} />;
}

function ToggleRow({ icon, iconColor, iconBg, title, sub, value, onValueChange }: {
  icon: string; iconColor: string; iconBg: string;
  title: string; sub: string; value: boolean; onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
        <IconCircle icon={icon} color={iconColor} bg={iconBg} />
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={cardItemTitle}>{title}</Text>
          <Text style={cardItemSub}>{sub}</Text>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#D1D5DB", true: ACCENT }} thumbColor="#fff" />
    </View>
  );
}

const cardStyle: any = {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 18,
  marginBottom: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

const cardItemTitle: any = { fontFamily: "outfit-medium", fontSize: 15, color: TEXT_PRIMARY };
const cardItemSub: any = { fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED, marginTop: 2 };
