import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOpenAiApiKey, isPlaceholderKey } from "../../configs/env";
import { useCreateTrip } from "../../hooks/useCreateTrip";
import {
  generateTripPlan,
  isQuotaOrRateLimitError,
} from "../../services/tripPlanService";

const ACCENT = "#6366F1";
const DARK_BG = "#0A0F1E";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";

const STEPS = [
  "Destinasyon analiz ediliyor...",
  "Plan oluşturuluyor...",
  "Son rötuşlar...",
];

export default function GenerateAITrip() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useCreateTrip();

  const [generating, setGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState(tripData?.aiPlan || null);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyAvailable, setApiKeyAvailable] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Pulsing animation for the airplane icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace("/create-trip/review-trip");
  }, [navigation, router]);

  useEffect(() => {
    const apiKey = getOpenAiApiKey();
    setApiKeyAvailable(!isPlaceholderKey(apiKey));
  }, []);

  useEffect(() => {
    if (tripData?.aiPlan) {
      setAiPlan(tripData.aiPlan);
      setError(null);
    }
  }, [tripData?.aiPlan]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Step rotation during generation
  useEffect(() => {
    if (!generating) return;
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep((s) => (s + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [generating]);

  // Pulse animation
  useEffect(() => {
    if (!generating) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.88, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [generating]);

  // Success bounce animation
  useEffect(() => {
    if (!aiPlan) return;
    Animated.spring(successAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [aiPlan]);

  const runGeneration = async () => {
    setGenerating(true);
    setError(null);
    if (!tripData?.aiPlan) {
      setAiPlan(null);
    }
    successAnim.setValue(0);
    try {
      const plan = await generateTripPlan(tripData);
      setAiPlan(plan);
      setTripData({ ...tripData, aiPlan: plan });
    } catch (err) {
      const rawMessage = (err as Error)?.message || "";
      const alertMessage = isQuotaOrRateLimitError(rawMessage)
        ? "OpenAI kota limiti doldu. Biraz bekleyip tekrar deneyin."
        : rawMessage || "Plan oluşturulurken bir hata oluştu.";
      setError(alertMessage);
    } finally {
      setGenerating(false);
    }
  };

  const acceptAIPlan = () => {
    if (!aiPlan) return;
    setTripData({ ...tripData, aiPlan });
    router.push("/create-trip/trip-details");
  };

  // ---- Loading / Generating full-screen state ----
  if (generating) {
    return (
      <View style={styles.fullScreenDark}>
        <View style={styles.loadingInner}>
          <Animated.View style={[styles.planeCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="airplane" size={52} color="#fff" />
          </Animated.View>
          <Text style={styles.loadingTitle}>AI Planın Oluşturuluyor...</Text>
          <Text style={styles.loadingStep}>{STEPS[currentStep]}</Text>
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ---- Success full-screen ----
  if (aiPlan && !generating) {
    return (
      <View style={styles.screen}>
        {/* Dark header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Seyahat Planı</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Success hero */}
          <Animated.View style={[styles.successHero, { transform: [{ scale: successAnim }] }]}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Planın Hazır! 🎉</Text>
            <Text style={styles.successSubtitle}>
              {tripData?.selectedPlace?.name || "Destinasyon"} için{" "}
              {tripData?.travelers || 1} kişilik planın oluşturuldu
            </Text>
          </Animated.View>

          {/* Itinerary days */}
          <Text style={styles.sectionTitle}>Günlük Program</Text>
          {aiPlan.itinerary.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dayCard}
              onPress={() => {
                router.push({
                  pathname: "/day-detail",
                  params: {
                    day: JSON.stringify(day),
                    dayNumber: day.day,
                    placeName: tripData?.selectedPlace?.name || "",
                    placeCoordinates: JSON.stringify(
                      tripData?.selectedPlace?.coordinates || {},
                    ),
                    recommendations: JSON.stringify(
                      aiPlan.recommendations || {},
                    ),
                  },
                });
              }}
            >
              <View style={styles.dayCardHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Gün {day.day}</Text>
                </View>
                <Text style={styles.dayTitle} numberOfLines={1}>{day.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </View>
              {day.time && <Text style={styles.dayTime}>{day.time}</Text>}
              <View style={styles.activitiesList}>
                {day.activities.slice(0, 3).map((activity, actIndex) => (
                  <View key={actIndex} style={styles.activityItem}>
                    <Ionicons name="checkmark-circle" size={15} color={ACCENT} />
                    <Text style={styles.activityText} numberOfLines={1}>{activity}</Text>
                  </View>
                ))}
                {day.activities.length > 3 && (
                  <Text style={styles.moreText}>
                    +{day.activities.length - 3} aktivite daha...
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.regenBtn}
              onPress={runGeneration}
              disabled={generating}
            >
              <Ionicons name="refresh" size={18} color={ACCENT} />
              <Text style={styles.regenBtnText}>Yeniden Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptAIPlan}>
              <Text style={styles.acceptBtnText}>Planı Kabul Et</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- Idle / Error state ----
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Seyahat Planı</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.idleHero}>
          <View style={styles.sparkleCircle}>
            <Ionicons name="sparkles" size={44} color={ACCENT} />
          </View>
          <Text style={styles.idleTitle}>AI Seyahat Planı</Text>
          <Text style={styles.idleSubtitle}>
            {tripData?.selectedPlace?.name || "Destinasyon"} için{" "}
            {tripData?.travelers || 1} kişilik, ilgi alanlarınıza özel plan
          </Text>
        </View>

        {/* API key warning */}
        {!apiKeyAvailable && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>API Anahtarı Gerekli</Text>
              <Text style={styles.warningText}>
                .env dosyasına EXPO_PUBLIC_OPENAI_API_KEY ekleyin ve uygulamayı yeniden başlatın.
              </Text>
            </View>
          </View>
        )}

        {/* Error card */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={26} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runGeneration}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryBtnText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, (!apiKeyAvailable) && styles.generateBtnDisabled]}
          onPress={runGeneration}
          disabled={!apiKeyAvailable}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
          <Text style={styles.generateBtnText}>AI Plan Oluştur</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  // Full-screen dark loading state
  fullScreenDark: {
    flex: 1,
    backgroundColor: DARK_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingInner: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  planeCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
  loadingTitle: {
    fontFamily: "outfit-bold",
    fontSize: 22,
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  loadingStep: {
    fontFamily: "outfit",
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    marginBottom: 24,
    minHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: ACCENT,
    width: 22,
  },
  // Shared header
  header: {
    backgroundColor: DARK_BG,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: "#fff",
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 50 },
  // Success hero
  successHero: {
    alignItems: "center",
    marginBottom: 28,
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontFamily: "outfit-bold",
    fontSize: 24,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  successSubtitle: {
    fontFamily: "outfit",
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: "outfit-bold",
    fontSize: 19,
    color: TEXT_PRIMARY,
    marginBottom: 14,
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: ACCENT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  dayBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontFamily: "outfit-bold",
    fontSize: 12,
    color: "#fff",
  },
  dayTitle: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  dayTime: {
    fontFamily: "outfit",
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 10,
  },
  activitiesList: { gap: 8 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activityText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  moreText: {
    fontFamily: "outfit-medium",
    fontSize: 12,
    color: ACCENT,
    fontStyle: "italic",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  regenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
  },
  regenBtnText: {
    fontFamily: "outfit-medium",
    fontSize: 15,
    color: ACCENT,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    backgroundColor: ACCENT,
    borderRadius: 14,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontFamily: "outfit-bold",
    fontSize: 15,
    color: "#fff",
  },
  // Idle state
  idleHero: {
    alignItems: "center",
    marginBottom: 28,
    paddingVertical: 32,
  },
  sparkleCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  idleTitle: {
    fontFamily: "outfit-bold",
    fontSize: 26,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  idleSubtitle: {
    fontFamily: "outfit",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  warningTitle: {
    fontFamily: "outfit-bold",
    fontSize: 15,
    color: "#92400E",
    marginBottom: 4,
  },
  warningText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: "outfit",
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: "#fff",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  generateBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  generateBtnText: {
    fontFamily: "outfit-bold",
    fontSize: 18,
    color: "#fff",
  },
});
