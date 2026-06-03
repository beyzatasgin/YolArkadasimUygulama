import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../configs/FirebaseConfig";
import { getInterestLabel } from "../constants/tripPreferences";

const ACCENT = "#6366F1";
const DARK_BG = "#0A0F1E";
const { width } = Dimensions.get("window");

type TripStat = {
  id: string;
  tripName?: string;
  selectedPlace?: { name?: string };
  startDate?: Date | null;
  endDate?: Date | null;
  duration?: number;
  travelers?: number;
  interests?: string[];
  rating?: number;
  createdAt?: Date;
};

type Stats = {
  totalTrips: number;
  totalDays: number;
  uniqueDestinations: number;
  upcomingTrips: number;
  pastTrips: number;
  averageRating: number | null;
  ratedTrips: number;
  mostVisitedPlace: string | null;
  topInterests: { key: string; label: string; count: number }[];
  longestTrip: { name: string; days: number } | null;
  averageDuration: number;
  tripsPerMonth: { month: string; count: number }[];
  totalTravelers: number;
};

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const computeStats = (trips: TripStat[]): Stats => {
  const past = trips.filter((t) => {
    if (!t.startDate) return false;
    return new Date(t.startDate) < new Date();
  });
  const upcoming = trips.filter((t) => {
    if (!t.startDate) return true;
    return new Date(t.startDate) >= new Date();
  });

  const totalDays = trips.reduce((sum, t) => sum + (t.duration || 0), 0);

  const destinations = trips.map((t) => t.selectedPlace?.name?.split(",")[0].trim()).filter(Boolean);
  const destCount: Record<string, number> = {};
  destinations.forEach((d) => { if (d) destCount[d] = (destCount[d] || 0) + 1; });
  const uniqueDestinations = Object.keys(destCount).length;
  const mostVisitedPlace = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const ratedTrips = trips.filter((t) => t.rating && t.rating > 0);
  const averageRating = ratedTrips.length > 0
    ? Math.round((ratedTrips.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTrips.length) * 10) / 10
    : null;

  const interestCount: Record<string, number> = {};
  trips.forEach((t) => {
    t.interests?.forEach((i) => { interestCount[i] = (interestCount[i] || 0) + 1; });
  });
  const topInterests = Object.entries(interestCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, label: getInterestLabel(key), count }));

  const durations = trips.filter((t) => t.duration && t.duration > 0);
  const longestTrip = durations.length > 0
    ? durations.reduce((max, t) => (t.duration || 0) > (max.duration || 0) ? t : max)
    : null;

  const averageDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, t) => sum + (t.duration || 0), 0) / durations.length)
    : 0;

  // Son 6 ayın verisi
  const now = new Date();
  const tripsPerMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const count = trips.filter((t) => {
      if (!t.createdAt) return false;
      const td = new Date(t.createdAt);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).length;
    return { month: MONTHS[d.getMonth()], count };
  });

  const totalTravelers = trips.reduce((sum, t) => sum + (t.travelers || 1), 0);

  return {
    totalTrips: trips.length,
    totalDays,
    uniqueDestinations,
    upcomingTrips: upcoming.length,
    pastTrips: past.length,
    averageRating,
    ratedTrips: ratedTrips.length,
    mostVisitedPlace,
    topInterests,
    longestTrip: longestTrip ? { name: longestTrip.tripName || longestTrip.selectedPlace?.name || "?", days: longestTrip.duration || 0 } : null,
    averageDuration,
    tripsPerMonth,
    totalTravelers,
  };
};

// Mini bar chart
function BarChart({ data }: { data: { month: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = (width - 80) / data.length - 8;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80 }}>
      {data.map((item, i) => (
        <View key={i} style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontFamily: "outfit-bold", fontSize: 11, color: ACCENT, marginBottom: 4 }}>
            {item.count > 0 ? item.count : ""}
          </Text>
          <View
            style={{
              width: barWidth,
              height: Math.max((item.count / maxCount) * 56, item.count > 0 ? 8 : 3),
              borderRadius: 6,
              backgroundColor: item.count > 0 ? ACCENT : "#E5E7EB",
            }}
          />
          <Text style={{ fontFamily: "outfit", fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
            {item.month}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Yıldız satırı
function StarDisplay({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={16}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

export default function Statistics() {
  const navigation = useNavigation();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!auth?.currentUser || !db) { setLoading(false); return; }

    const q = query(collection(db, "trips"), where("userId", "==", auth.currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const trips: TripStat[] = snap.docs.map((d) => {
        const data = d.data();
        const toDate = (v: any) => v?.toDate ? v.toDate() : v ? new Date(v) : null;
        return {
          id: d.id,
          tripName: data.tripName,
          selectedPlace: data.selectedPlace,
          startDate: toDate(data.startDate),
          endDate: toDate(data.endDate),
          duration: data.duration,
          travelers: data.travelers,
          interests: data.interests,
          rating: data.rating,
          createdAt: toDate(data.createdAt),
        };
      });
      setStats(computeStats(trips));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7FB" }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>İstatistikler</Text>
          <Text style={styles.headerSub}>Seyahat geçmişin bir bakışta</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="bar-chart" size={20} color="#fff" />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : !stats || stats.totalTrips === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Ionicons name="bar-chart-outline" size={80} color="#D1D5DB" />
          <Text style={{ fontFamily: "outfit-bold", fontSize: 20, color: "#9CA3AF", marginTop: 16 }}>
            Henüz istatistik yok
          </Text>
          <Text style={{ fontFamily: "outfit", fontSize: 14, color: "#D1D5DB", textAlign: "center", marginTop: 8 }}>
            Seyahat ekledikçe burada istatistiklerin görünecek
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Ana metrikler — 2x2 grid */}
          <View style={styles.gridRow}>
            <StatCard icon="airplane" label="Toplam Seyahat" value={String(stats.totalTrips)} color="#6366F1" bg="#EEF2FF" />
            <StatCard icon="time" label="Toplam Gün" value={String(stats.totalDays)} color="#10B981" bg="#ECFDF5" />
          </View>
          <View style={styles.gridRow}>
            <StatCard icon="location" label="Destinasyon" value={String(stats.uniqueDestinations)} color="#F59E0B" bg="#FFFBEB" />
            <StatCard icon="people" label="Toplam Yolcu" value={String(stats.totalTravelers)} color="#EC4899" bg="#FDF2F8" />
          </View>

          {/* Yaklaşan / Geçmiş */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Seyahat Durumu</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={[styles.statusBox, { backgroundColor: "#EEF2FF" }]}>
                <Text style={[styles.statusNum, { color: ACCENT }]}>{stats.upcomingTrips}</Text>
                <Text style={styles.statusLabel}>Yaklaşan</Text>
              </View>
              <View style={[styles.statusBox, { backgroundColor: "#F3F4F6" }]}>
                <Text style={[styles.statusNum, { color: "#6B7280" }]}>{stats.pastTrips}</Text>
                <Text style={styles.statusLabel}>Geçmiş</Text>
              </View>
              {stats.averageDuration > 0 && (
                <View style={[styles.statusBox, { backgroundColor: "#ECFDF5" }]}>
                  <Text style={[styles.statusNum, { color: "#10B981" }]}>{stats.averageDuration}</Text>
                  <Text style={styles.statusLabel}>Ort. Gün</Text>
                </View>
              )}
            </View>
          </View>

          {/* Son 6 ay grafiği */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Son 6 Ay</Text>
            <View style={{ marginTop: 16 }}>
              <BarChart data={stats.tripsPerMonth} />
            </View>
          </View>

          {/* En uzun seyahat + en çok gidilen yer */}
          {(stats.longestTrip || stats.mostVisitedPlace) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏆 Rekorlar</Text>
              {stats.longestTrip && (
                <View style={styles.recordRow}>
                  <View style={[styles.recordIcon, { backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="trophy" size={18} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordLabel}>En Uzun Seyahat</Text>
                    <Text style={styles.recordValue} numberOfLines={1}>{stats.longestTrip.name}</Text>
                  </View>
                  <Text style={[styles.recordBadge, { color: ACCENT, backgroundColor: "#EEF2FF" }]}>
                    {stats.longestTrip.days} gün
                  </Text>
                </View>
              )}
              {stats.mostVisitedPlace && (
                <View style={[styles.recordRow, { marginTop: 10 }]}>
                  <View style={[styles.recordIcon, { backgroundColor: "#FFFBEB" }]}>
                    <Ionicons name="star" size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordLabel}>En Çok Gidilen Yer</Text>
                    <Text style={styles.recordValue}>{stats.mostVisitedPlace}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Ortalama puan */}
          {stats.averageRating !== null && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⭐ Değerlendirmeler</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
                <Text style={{ fontFamily: "outfit-bold", fontSize: 40, color: "#F59E0B" }}>
                  {stats.averageRating}
                </Text>
                <View>
                  <StarDisplay rating={stats.averageRating} />
                  <Text style={{ fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                    {stats.ratedTrips} seyahat değerlendirildi
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* İlgi alanları */}
          {stats.topInterests.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>❤️ En Çok İlgilendiğin Alanlar</Text>
              <View style={{ marginTop: 12, gap: 10 }}>
                {stats.topInterests.map((item, i) => {
                  const pct = Math.round((item.count / stats.totalTrips) * 100);
                  const colors = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#3B82F6"];
                  const c = colors[i % colors.length];
                  return (
                    <View key={item.key}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ fontFamily: "outfit-medium", fontSize: 13, color: "#111827" }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontFamily: "outfit", fontSize: 12, color: "#9CA3AF" }}>
                          {item.count} seyahat · %{pct}
                        </Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                        <View style={{ height: 8, width: `${pct}%`, backgroundColor: c, borderRadius: 4 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: DARK_BG,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: "outfit-bold", fontSize: 20, color: "#fff" },
  headerSub: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  gridRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontFamily: "outfit-bold", fontSize: 28 },
  statLabel: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontFamily: "outfit-bold", fontSize: 16, color: "#111827" },
  statusBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  statusNum: { fontFamily: "outfit-bold", fontSize: 26 },
  statusLabel: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  recordIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  recordLabel: { fontFamily: "outfit", fontSize: 12, color: "#9CA3AF" },
  recordValue: { fontFamily: "outfit-bold", fontSize: 15, color: "#111827", marginTop: 2 },
  recordBadge: { fontFamily: "outfit-bold", fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
});
