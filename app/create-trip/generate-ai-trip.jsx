import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function GenerateAITrip() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [generating, setGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [error, setError] = useState(null);
  const [apiKeyAvailable, setApiKeyAvailable] = useState(false);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/create-trip/review-trip");
  }, [navigation, router]);

  useEffect(() => {
    // API key kontrolü - hem process.env hem de Constants.manifest.extra'dan oku
    const apiKey =
      process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
      Constants.expoConfig?.extra?.openaiApiKey ||
      Constants.manifest?.extra?.openaiApiKey;
    const isValid =
      apiKey && apiKey.trim().length > 0 && !apiKey.includes("YOUR_");
    setApiKeyAvailable(isValid);

    if (!isValid) {
      console.warn(
        "⚠️ OpenAI API key bulunamadı. Lütfen .env dosyasına EXPO_PUBLIC_OPENAI_API_KEY ekleyin.",
      );
    }
  }, []);

  useEffect(() => {
    if (tripData?.aiPlan) {
      setAiPlan(tripData.aiPlan);
      setError(null);
    }
  }, [tripData?.aiPlan]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "AI ile Seyahat Planı Oluştur",
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

  // AI yanıtını parse et ve validate et
  const parseAIResponse = (data) => {
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error("AI yanıtı alınamadı");
    }

    // JSON'u extract et (markdown code block varsa temizle)
    let jsonText = responseText.trim();

    // Markdown code block'ları temizle
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    // JSON parse et
    let aiPlan;
    try {
      aiPlan = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse hatası:", parseError);
      console.log("Raw response:", responseText);
      throw new Error("AI yanıtı parse edilemedi. Lütfen tekrar deneyin.");
    }

    // Planı validate et
    if (!aiPlan.itinerary || !Array.isArray(aiPlan.itinerary)) {
      throw new Error("Geçersiz plan formatı");
    }

    return aiPlan;
  };

  // AI ile seyahat planı oluştur
  const generateAIPlan = async () => {
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

    setGenerating(true);
    setError(null);
    setAiPlan(null);

    try {
      // API key'i farklı kaynaklardan oku
      const apiKey =
        process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
        Constants.expoConfig?.extra?.openaiApiKey ||
        Constants.manifest?.extra?.openaiApiKey;

      if (!apiKey || apiKey.trim().length === 0 || apiKey.includes("YOUR_")) {
        throw new Error(
          "OpenAI API anahtarı bulunamadı. Lütfen .env dosyasına EXPO_PUBLIC_OPENAI_API_KEY ekleyin ve uygulamayı yeniden başlatın.",
        );
      }

      // Seyahat bilgilerini hazırla
      const placeName = tripData.selectedPlace.name;
      const startDate = formatDate(tripData.startDate);
      const endDate = formatDate(tripData.endDate);
      const duration = tripData.duration || 1;
      const travelers = tripData.travelers || 1;
      const interests =
        tripData.interests && tripData.interests.length > 0
          ? tripData.interests.join(", ")
          : "Genel";

      // OpenAI API için prompt oluştur
      const prompt = `Sen bir seyahat planlama uzmanısın. Aşağıdaki bilgilere göre detaylı bir seyahat planı oluştur:

Yer: ${placeName}
Tarih: ${startDate} - ${endDate}
Süre: ${duration} gün
Yolcu Sayısı: ${travelers} kişi
İlgi Alanları: ${interests}

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
      {"name": "Otel adı 1", "rating": 4.5, "price": "₺500-₺1000/gece"},
      {"name": "Otel adı 2", "rating": 4.0, "price": "₺300-₺600/gece"}
    ],
    "restaurants": ["Restoran önerisi 1", "Restoran önerisi 2", "Restoran önerisi 3"],
    "attractions": ["Görülecek yer 1", "Görülecek yer 2", "Görülecek yer 3"],
    "tips": ["İpucu 1", "İpucu 2", "İpucu 3", "İpucu 4"]
  },
  "estimatedCost": null
}

Sadece JSON formatında cevap ver, başka açıklama yapma. Her gün için 4-5 aktivite öner. Öneriler ${placeName} için gerçekçi ve uygulanabilir olsun.`;

      console.log("🤖 OpenAI API çağrılıyor...");

      // OpenAI API çağrısı - GPT-3.5-turbo modeli kullanılıyor
      const modelName = "gpt-3.5-turbo";
      const apiUrl = "https://api.openai.com/v1/chat/completions";

      console.log("📡 API URL:", apiUrl);
      console.log("🔑 API Key uzunluğu:", apiKey ? apiKey.length : 0);
      console.log("🤖 Model:", modelName);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.message ||
          `API hatası: ${response.status} ${response.statusText}`;

        console.error("❌ API Hatası:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          message: errorMessage,
        });

        // API key geçersizse veya başka hata varsa
        if (
          errorMessage.includes("Invalid API key") ||
          errorMessage.includes("API key not valid") ||
          errorMessage.includes("incorrect API key")
        ) {
          throw new Error(
            "OpenAI API anahtarı geçersiz. Lütfen .env dosyasındaki EXPO_PUBLIC_OPENAI_API_KEY değerini kontrol edin.",
          );
        }

        // Diğer hatalar için
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ OpenAI API yanıtı alındı:", data);

      // OpenAI API yanıtını parse et ve validate et
      const aiPlan = parseAIResponse(data);
      setAiPlan(aiPlan);
    } catch (err) {
      console.error("AI Plan generation error:", err);

      // Daha detaylı hata mesajı
      let errorMessage = "Seyahat planı oluşturulurken bir hata oluştu.";

      if (err.message) {
        if (err.message.includes("API anahtarı")) {
          errorMessage = err.message;
        } else if (err.message.includes("API hatası")) {
          errorMessage = `API hatası: ${err.message}. Lütfen API anahtarınızı kontrol edin.`;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // AI planını kabul et ve trip-details'a geç
  const acceptAIPlan = () => {
    if (!aiPlan) return;

    // AI planını context'e kaydet
    const updatedTripData = {
      ...tripData,
      aiPlan: aiPlan,
    };

    setTripData(updatedTripData);
    router.push("/create-trip/trip-details");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={48} color={Colors.PRIMARY} />
          <Text style={styles.title}>AI ile Seyahat Planı Oluştur</Text>
          <Text style={styles.subtitle}>
            Yapay zeka, seçtiğiniz yer ve tarihe göre size özel bir seyahat
            planı hazırlayacak
          </Text>
        </View>

        {/* API Key Warning */}
        {!apiKeyAvailable && !aiPlan && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color="#F59E0B" />
            <Text style={styles.warningTitle}>API Anahtarı Gerekli</Text>
            <Text style={styles.warningText}>
              OpenAI API kullanmak için API anahtarı gereklidir.{"\n\n"}
              1. Proje kök dizininde .env dosyası oluşturun{"\n"}
              2. EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here ekleyin{"\n"}
              3. Uygulamayı yeniden başlatın (npm start -- --clear){"\n\n"}
              API anahtarı almak için:{"\n"}
              https://platform.openai.com/api-keys
            </Text>
          </View>
        )}

        {/* Generate Button */}
        {!aiPlan && (
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!apiKeyAvailable || generating) && styles.generateButtonDisabled,
            ]}
            onPress={generateAIPlan}
            disabled={!apiKeyAvailable || generating}
          >
            {generating ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={Colors.WHITE}
                  style={{ marginRight: 10 }}
                />
                <Text style={styles.generateButtonText}>
                  Plan Oluşturuluyor...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={24} color={Colors.WHITE} />
                <Text style={styles.generateButtonText}>AI Plan Oluştur</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={generateAIPlan}
            >
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Plan Results */}
        {aiPlan && (
          <View style={styles.resultsContainer}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.successTitle}>Planınız Hazır!</Text>
            </View>

            {/* Günlük Program */}
            <View style={styles.section}>
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
                  <View style={styles.dayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayNumber}>Gün {day.day}</Text>
                    </View>
                    <Text style={styles.dayTitle}>{day.title}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={Colors.GRAY}
                    />
                  </View>
                  <Text style={styles.dayTime}>{day.time}</Text>
                  <View style={styles.activitiesList}>
                    {day.activities.slice(0, 3).map((activity, actIndex) => (
                      <View key={actIndex} style={styles.activityItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={Colors.PRIMARY}
                        />
                        <Text style={styles.activityText}>{activity}</Text>
                      </View>
                    ))}
                    {day.activities.length > 3 && (
                      <Text style={styles.moreActivitiesText}>
                        +{day.activities.length - 3} aktivite daha...
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Öneriler */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Öneriler</Text>

              {aiPlan.recommendations.accommodations &&
                aiPlan.recommendations.accommodations.length > 0 && (
                  <View style={styles.recommendationCard}>
                    <Ionicons name="bed" size={24} color={Colors.PRIMARY} />
                    <Text style={styles.recommendationTitle}>
                      Konaklama Önerileri
                    </Text>
                    {aiPlan.recommendations.accommodations.map((acc, index) => {
                      const accName =
                        typeof acc === "string" ? acc : acc.name || "Otel";
                      const accRating =
                        typeof acc === "object" ? acc.rating : null;
                      const accPrice =
                        typeof acc === "object" ? acc.price : null;
                      return (
                        <View key={index} style={{ marginBottom: 8 }}>
                          <Text style={styles.recommendationText}>
                            • {accName}
                          </Text>
                          {accRating && (
                            <Text
                              style={[
                                styles.recommendationText,
                                { fontSize: 12, marginLeft: 10 },
                              ]}
                            >
                              ⭐ {accRating} {accPrice ? `• ${accPrice}` : ""}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

              <View style={styles.recommendationCard}>
                <Ionicons name="restaurant" size={24} color={Colors.PRIMARY} />
                <Text style={styles.recommendationTitle}>Restoranlar</Text>
                {aiPlan.recommendations.restaurants.map((rec, index) => (
                  <Text key={index} style={styles.recommendationText}>
                    • {typeof rec === "string" ? rec : rec?.name || "Restoran"}
                  </Text>
                ))}
              </View>

              <View style={styles.recommendationCard}>
                <Ionicons name="location" size={24} color={Colors.PRIMARY} />
                <Text style={styles.recommendationTitle}>Görülecek Yerler</Text>
                {aiPlan.recommendations.attractions.map((rec, index) => (
                  <Text key={index} style={styles.recommendationText}>
                    • {typeof rec === "string" ? rec : rec?.name || "Mekan"}
                  </Text>
                ))}
              </View>

              <View style={styles.recommendationCard}>
                <Ionicons name="bulb" size={24} color={Colors.PRIMARY} />
                <Text style={styles.recommendationTitle}>İpuçları</Text>
                {aiPlan.recommendations.tips.map((tip, index) => (
                  <Text key={index} style={styles.recommendationText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            </View>

            {/* Tahmini Maliyet */}
            {aiPlan.estimatedCost && (
              <View style={styles.costCard}>
                <Ionicons name="wallet" size={24} color={Colors.PRIMARY} />
                <Text style={styles.costLabel}>Tahmini Maliyet</Text>
                <Text style={styles.costAmount}>
                  {new Intl.NumberFormat("tr-TR", {
                    style: "currency",
                    currency: "TRY",
                    minimumFractionDigits: 0,
                  }).format(aiPlan.estimatedCost)}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={generateAIPlan}
              >
                <Ionicons name="refresh" size={20} color={Colors.PRIMARY} />
                <Text style={styles.regenerateButtonText}>Yeniden Oluştur</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={acceptAIPlan}
              >
                <Text style={styles.acceptButtonText}>Planı Kabul Et</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginTop: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.GRAY,
    textAlign: "center",
    lineHeight: 22,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginBottom: 30,
    gap: 10,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#991B1B",
    marginTop: 10,
    marginBottom: 15,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EF4444",
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  resultsContainer: {
    marginTop: 20,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginTop: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  dayCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  dayBadge: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: "outfit-bold",
    color: Colors.WHITE,
  },
  dayTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    flex: 1,
  },
  dayTime: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 15,
  },
  activitiesList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    flex: 1,
  },
  moreActivitiesText: {
    fontSize: 13,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginTop: 8,
    fontStyle: "italic",
  },
  recommendationCard: {
    backgroundColor: "#F0F9FF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginTop: 10,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 5,
    lineHeight: 20,
  },
  costCard: {
    backgroundColor: "#F0F9FF",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 30,
  },
  costLabel: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginTop: 10,
    marginBottom: 5,
  },
  costAmount: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    borderRadius: 15,
    gap: 8,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  warningCard: {
    backgroundColor: "#FEF3C7",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  warningTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: "#92400E",
    marginTop: 10,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: "#78350F",
    lineHeight: 20,
  },
});
