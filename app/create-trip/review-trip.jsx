import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useContext, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function ReviewTrip() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/create-trip/select-date");
  }, [navigation, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "Seyahati İncele",
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ paddingHorizontal: 6, paddingVertical: 6 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [handleGoBack, navigation]);

  // Tarih formatı
  const formatDate = (date) => {
    if (!date) return "Seçilmedi";
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Devam et - Trip Details sayfasına git
  const handleContinue = () => {
    if (!tripData?.selectedPlace) {
      Alert.alert("Hata", "Lütfen bir yer seçin");
      router.push("/create-trip/search-place");
      return;
    }

    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert("Hata", "Lütfen seyahat tarihlerini seçin");
      router.push("/create-trip/select-date");
      return;
    }

    router.push("/create-trip/trip-details");
  };

  // Düzenle butonları
  const handleEditPlace = () => {
    router.push("/create-trip/search-place");
  };

  const handleEditDate = () => {
    router.push("/create-trip/select-date");
  };

  const parseAIResponse = (data) => {
    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      throw new Error("AI yanıtı alınamadı");
    }

    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    let aiPlan;
    try {
      aiPlan = JSON.parse(jsonText);
    } catch (_parseError) {
      throw new Error("AI yanıtı parse edilemedi. Lütfen tekrar deneyin.");
    }

    if (!aiPlan.itinerary || !Array.isArray(aiPlan.itinerary)) {
      throw new Error("Geçersiz plan formatı");
    }

    return aiPlan;
  };

  const handleGenerateAIPlan = async () => {
    if (!tripData?.selectedPlace) {
      Alert.alert("Hata", "Lütfen önce bir yer seçin");
      router.push("/create-trip/search-place");
      return;
    }

    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert("Hata", "Lütfen seyahat tarihlerini seçin");
      router.push("/create-trip/select-date");
      return;
    }

    setGeneratingAI(true);

    try {
      const apiKey =
        process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
        Constants.expoConfig?.extra?.openaiApiKey ||
        Constants.manifest?.extra?.openaiApiKey;

      if (!apiKey || apiKey.trim().length === 0 || apiKey.includes("YOUR_")) {
        throw new Error(
          "OpenAI API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.",
        );
      }

      const placeName = tripData.selectedPlace.name;
      const startDate = formatDate(tripData.startDate);
      const endDate = formatDate(tripData.endDate);
      const duration = tripData.duration || 1;

      const prompt = `Sen bir seyahat planlama uzmanısın. Aşağıdaki bilgilere göre detaylı bir seyahat planı oluştur:

Yer: ${placeName}
Tarih: ${startDate} - ${endDate}
Süre: ${duration} gün

Lütfen aşağıdaki JSON formatında bir seyahat planı oluştur:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Gün başlığı",
      "activities": ["Aktivite 1", "Aktivite 2", "Aktivite 3", "Aktivite 4"],
      "time": "Sabah - Akşam"
    }
  ],
  "recommendations": {
    "accommodations": [
      {"name": "Otel adı 1", "rating": 4.5, "price": "₺500-₺1000/gece"}
    ],
    "restaurants": ["Restoran önerisi 1", "Restoran önerisi 2"],
    "attractions": ["Görülecek yer 1", "Görülecek yer 2"],
    "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
  },
  "estimatedCost": null
}

Sadece JSON formatında cevap ver, başka açıklama yapma.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          `API hatası: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const aiPlan = parseAIResponse(data);

      setTripData({
        ...tripData,
        aiPlan,
      });
      router.push("/create-trip/generate-ai-trip");
    } catch (error) {
      Alert.alert(
        "AI Plan Hatası",
        error?.message || "Plan oluşturulurken bir hata oluştu.",
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Seyahatinizi Gözden Geçirin</Text>
        <Text style={styles.subtitle}>
          Tüm bilgilerinizi kontrol edin ve gerekirse düzenleyin
        </Text>

        {/* Yer Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="location" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>Yer</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditPlace}
              style={styles.editButton}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={Colors.PRIMARY}
              />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          {tripData?.selectedPlace ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {tripData.selectedPlace.name}
              </Text>
              <Text style={styles.infoSubtitle}>
                {tripData.selectedPlace.address}
              </Text>
              {tripData.selectedPlace.url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(tripData.selectedPlace.url)}
                  style={styles.linkButton}
                >
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={Colors.PRIMARY}
                  />
                  <Text style={styles.linkText}>Haritada Görüntüle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Yer seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Tarih Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="calendar" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>Tarih</Text>
            </View>
            <TouchableOpacity
              onPress={handleEditDate}
              style={styles.editButton}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={Colors.PRIMARY}
              />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          {tripData?.startDate && tripData?.endDate ? (
            <View style={styles.infoCard}>
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Başlangıç</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(tripData.startDate)}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Colors.GRAY} />
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Bitiş</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(tripData.endDate)}
                  </Text>
                </View>
              </View>
              {tripData.duration && (
                <View style={styles.durationBadge}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={Colors.PRIMARY}
                  />
                  <Text style={styles.durationText}>
                    {tripData.duration} gün
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Tarih seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Özet Kartı */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seyahat Özeti</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="location-outline" size={18} color={Colors.GRAY} />
            <Text style={styles.summaryText}>
              {tripData?.selectedPlace?.name || "Yer seçilmedi"}
            </Text>
          </View>
          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.GRAY} />
              <Text style={styles.summaryText}>
                {formatDate(tripData.startDate)} -{" "}
                {formatDate(tripData.endDate)}
              </Text>
            </View>
          )}
          {tripData?.duration && (
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={18} color={Colors.GRAY} />
              <Text style={styles.summaryText}>
                {tripData.duration} gün seyahat
              </Text>
            </View>
          )}
        </View>

        {/* AI Generate Butonu */}
        <TouchableOpacity
          style={[
            styles.aiButton,
            (!tripData?.selectedPlace ||
              !tripData?.startDate ||
              generatingAI) &&
              styles.aiButtonDisabled,
          ]}
          onPress={handleGenerateAIPlan}
          disabled={
            !tripData?.selectedPlace || !tripData?.startDate || generatingAI
          }
        >
          {generatingAI ? (
            <>
              <ActivityIndicator
                size="small"
                color={Colors.WHITE}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.aiButtonText}>Plan Oluşturuluyor...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={24} color={Colors.WHITE} />
              <Text style={styles.aiButtonText}>AI ile Plan Oluştur</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Devam Et Butonu */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!tripData?.selectedPlace || !tripData?.startDate) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!tripData?.selectedPlace || !tripData?.startDate}
        >
          <Text style={styles.continueButtonText}>Detayları Tamamla</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.WHITE} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  content: {
    padding: 25,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0F9FF",
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  infoCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    textDecorationLine: "underline",
  },
  emptyCard: {
    backgroundColor: "#FEE2E2",
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#991B1B",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  summaryCard: {
    backgroundColor: "#F0F9FF",
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    flex: 1,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.GRAY,
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
    marginRight: 10,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "#8B5CF6",
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 15,
    gap: 10,
  },
  aiButtonDisabled: {
    backgroundColor: Colors.GRAY,
    opacity: 0.5,
  },
  aiButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
});
