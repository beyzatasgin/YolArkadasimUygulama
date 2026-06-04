/**
 * Salt-okunur paylaşım sayfası.
 * Giriş gerektirmez — isPublic=true veya sharedWith içindeki kullanıcılar görebilir.
 */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../configs/FirebaseConfig";
import { getPlaceImageUrl } from "../../utils/imageHelper";
import { getInterestLabel } from "../../constants/tripPreferences";

const ACCENT      = "#6366F1";
const DARK_BG     = "#0A0F1E";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED   = "#9CA3AF";
const SUCCESS      = "#10B981";
const WARNING      = "#F59E0B";

export default function SharedTripScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: "",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(10,15,30,0.55)", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  useEffect(() => {
    if (!id || !db) { setError("Seyahat bulunamadı."); setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "trips", id as string));
        if (!snap.exists()) { setError("Bu seyahat mevcut değil ya da paylaşım kapatılmış."); setLoading(false); return; }
        const data = snap.data();
        if (!data.isPublic && !data.sharedWith?.length) {
          setError("Bu seyahat herkese açık değil."); setLoading(false); return;
        }
        const startDate = data.startDate?.toDate?.() ?? (data.startDate?.seconds ? new Date(data.startDate.seconds * 1000) : null);
        const endDate   = data.endDate?.toDate?.()   ?? (data.endDate?.seconds   ? new Date(data.endDate.seconds * 1000)   : null);
        setTrip({ id: snap.id, ...data, startDate, endDate });
        setImageUrl(data.selectedPlace?.photoUrl ?? getPlaceImageUrl(data.selectedPlace?.name));
      } catch {
        setError("Seyahat yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View>
  );
  if (error || !trip) return (
    <View style={s.center}>
      <Ionicons name="lock-closed-outline" size={52} color={TEXT_MUTED} />
      <Text style={s.errorText}>{error ?? "Seyahat bulunamadı."}</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backBtnText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Hero resim */}
      {imageUrl && <Image source={{ uri: imageUrl }} style={s.hero} resizeMode="cover" />}

      <View style={s.body}>
        {/* Paylaşım rozeti */}
        <View style={s.sharedBadge}>
          <Ionicons name="share-social-outline" size={14} color={ACCENT} />
          <Text style={s.sharedBadgeText}>Yol Arkadaşım ile paylaşıldı</Text>
        </View>

        <Text style={s.tripName}>{trip.tripName || trip.selectedPlace?.name}</Text>

        {/* Temel bilgiler */}
        <View style={s.card}>
          <Row icon="location-outline"   label={trip.selectedPlace?.name ?? "—"} />
          <Row icon="calendar-outline"   label={`${fmt(trip.startDate)} — ${fmt(trip.endDate)}`} />
          {trip.duration  && <Row icon="time-outline"    label={`${trip.duration} gün`} />}
          {trip.travelers && <Row icon="people-outline"  label={`${trip.travelers} kişi`} />}
          {trip.aiPlan?.estimatedCost != null && (
            <Row icon="wallet-outline"
              label={`Tahmini bütçe: ${trip.aiPlan.estimatedCost.toLocaleString("tr-TR")} ₺ (kişi başı)`}
              color={SUCCESS}
            />
          )}
        </View>

        {/* İlgi alanları */}
        {trip.interests?.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>İlgi Alanları</Text>
            <View style={s.tagsRow}>
              {trip.interests.map((i: string) => (
                <View key={i} style={s.tag}><Text style={s.tagText}>{getInterestLabel(i)}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Günlük plan */}
        {trip.aiPlan?.itinerary?.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Günlük Program</Text>
            {trip.aiPlan.itinerary.map((day: any) => (
              <View key={day.day} style={s.dayRow}>
                <View style={s.dayBadge}><Text style={s.dayBadgeText}>Gün {day.day}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dayTitle}>{day.title}</Text>
                  {day.activities?.slice(0, 3).map((act: string, i: number) => (
                    <View key={i} style={s.actRow}>
                      <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
                      <Text style={s.actText}>{act}</Text>
                    </View>
                  ))}
                  {day.activities?.length > 3 && (
                    <Text style={s.moreText}>+{day.activities.length - 3} aktivite daha...</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* İpuçları */}
        {trip.aiPlan?.recommendations?.tips?.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>💡 İpuçları</Text>
            {trip.aiPlan.recommendations.tips.map((tip: string, i: number) => (
              <View key={i} style={s.tipRow}>
                <Ionicons name="bulb-outline" size={14} color={WARNING} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notlar */}
        {trip.notes && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Notlar</Text>
            <Text style={s.notesText}>{trip.notes}</Text>
          </View>
        )}

        {/* CTA */}
        <View style={s.cta}>
          <Ionicons name="airplane-outline" size={22} color={ACCENT} />
          <Text style={s.ctaText}>Yol Arkadaşım ile kendi seyahatini planla!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Row({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={16} color={color ?? TEXT_MUTED} />
      <Text style={[s.rowText, color && { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#F5F7FB" },
  center:          { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  hero:            { width: "100%", height: 260 },
  body:            { padding: 20, gap: 14, paddingBottom: 50 },
  sharedBadge:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sharedBadgeText: { fontFamily: "outfit-medium", fontSize: 12, color: ACCENT },
  tripName:        { fontFamily: "outfit-bold", fontSize: 26, color: TEXT_PRIMARY },
  card:            { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardTitle:       { fontFamily: "outfit-bold", fontSize: 15, color: TEXT_PRIMARY, marginBottom: 4 },
  row:             { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText:         { fontFamily: "outfit", fontSize: 14, color: TEXT_PRIMARY, flex: 1 },
  tagsRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag:             { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText:         { fontFamily: "outfit-medium", fontSize: 12, color: ACCENT },
  dayRow:          { flexDirection: "row", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dayBadge:        { backgroundColor: ACCENT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  dayBadgeText:    { fontFamily: "outfit-bold", fontSize: 11, color: "#fff" },
  dayTitle:        { fontFamily: "outfit-bold", fontSize: 14, color: TEXT_PRIMARY, marginBottom: 4 },
  actRow:          { flexDirection: "row", alignItems: "center", gap: 6 },
  actText:         { fontFamily: "outfit", fontSize: 13, color: TEXT_MUTED, flex: 1 },
  moreText:        { fontFamily: "outfit-medium", fontSize: 12, color: ACCENT, marginTop: 2 },
  tipRow:          { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipText:         { fontFamily: "outfit", fontSize: 13, color: TEXT_PRIMARY, flex: 1, lineHeight: 19 },
  notesText:       { fontFamily: "outfit", fontSize: 14, color: TEXT_PRIMARY, lineHeight: 21 },
  cta:             { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 16, marginTop: 8 },
  ctaText:         { fontFamily: "outfit-medium", fontSize: 14, color: ACCENT, flex: 1 },
  errorText:       { fontFamily: "outfit-medium", fontSize: 15, color: TEXT_MUTED, textAlign: "center" },
  backBtn:         { backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText:     { fontFamily: "outfit-bold", fontSize: 14, color: "#fff" },
});
