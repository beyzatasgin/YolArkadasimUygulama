import { GoogleGenerativeAI } from "@google/generative-ai";
import { httpsCallable } from "firebase/functions";
import {
  getAiProvider,
  getGeminiApiKey,
  getGooglePlacesApiKey,
  getOpenAiApiKey,
  isPlaceholderKey,
  shouldUseApiProxy,
} from "../configs/env";
import { getFirebaseFunctions } from "../configs/firebaseFunctions";
import type { AIPlan, AIProvider, GenerateTripPlanRequest } from "../types/ai";
import type { TripData } from "../types/trip";

const formatDateTr = (date: TripData["startDate"]): string => {
  if (!date) return "Seçilmedi";
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const toIsoDate = (date: TripData["startDate"]): string => {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString();
};

const buildGooglePhotoUrl = (photoName: string | undefined, apiKey: string) => {
  if (!photoName || !apiKey) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&key=${apiKey}`;
};

type PlaceRecommendation = {
  name: string;
  address?: string;
  rating?: number | null;
  totalReviews?: number | null;
  url?: string | null;
  photoUrl?: string | null;
};

const fetchGooglePlacesByQuery = async (
  apiKey: string,
  textQuery: string,
  coordinates?: { lat: number; lon: number } | null,
  maxResultCount = 3,
): Promise<PlaceRecommendation[]> => {
  const response = await fetch(
    `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount,places.photos.name",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "tr",
        maxResultCount,
        ...(coordinates?.lat != null && coordinates?.lon != null
          ? {
              locationBias: {
                circle: {
                  center: {
                    latitude: Number(coordinates.lat),
                    longitude: Number(coordinates.lon),
                  },
                  radius: 25000,
                },
              },
            }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      errorBody?.error?.message ||
        `Google Places API hatası: ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: { name?: string }[];
    }[];
  };

  if (!Array.isArray(data?.places)) return [];

  const results: PlaceRecommendation[] = [];
  for (const place of data.places) {
    const name = place.displayName?.text;
    if (!name) continue;
    results.push({
      name,
      address: place.formattedAddress || "Adres bilgisi yok",
      rating: place.rating ?? null,
      totalReviews: place.userRatingCount ?? null,
      url: place.googleMapsUri ?? null,
      photoUrl: buildGooglePhotoUrl(place.photos?.[0]?.name, apiKey),
    });
  }
  return results;
};

const formatCandidatesForPrompt = (items: PlaceRecommendation[]) => {
  if (!items.length) return "- Veri bulunamadı";
  return items
    .slice(0, 3)
    .map((item) => {
      const ratingText = item.rating ? ` | Puan: ${item.rating}` : "";
      return `- ${item.name}${ratingText}`;
    })
    .join("\n");
};

const buildPrompt = (
  tripData: TripData,
  googleRecommendations: {
    accommodations: PlaceRecommendation[];
    restaurants: PlaceRecommendation[];
    attractions: PlaceRecommendation[];
  } | null,
): string => {
  const placeName = tripData.selectedPlace!.name;
  const startDate = formatDateTr(tripData.startDate);
  const endDate = formatDateTr(tripData.endDate);
  const duration = tripData.duration || 1;
  const travelers = tripData.travelers || 1;
  const interests =
    tripData.interests?.length > 0 ? tripData.interests.join(", ") : "Genel";

  const googleContext = googleRecommendations
    ? `\nGoogle Places verileri (öncelikli kullan):\n\nKonaklama adayları:\n${formatCandidatesForPrompt(googleRecommendations.accommodations)}\n\nRestoran adayları:\n${formatCandidatesForPrompt(googleRecommendations.restaurants)}\n\nGörülecek yer adayları:\n${formatCandidatesForPrompt(googleRecommendations.attractions)}`
    : "";

  return `Sen bir seyahat planlama uzmanısın. Aşağıdaki bilgilere göre detaylı bir seyahat planı oluştur:

Yer: ${placeName}
Tarih: ${startDate} - ${endDate}
Süre: ${duration} gün
Yolcu Sayısı: ${travelers} kişi
İlgi Alanları: ${interests}
${googleContext}

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
      {"name": "Otel adı 1", "rating": 4.5, "address": "Adres bilgisi", "url": "Google Maps linki", "photoUrl": "Fotoğraf URL"}
    ],
    "restaurants": [{"name": "Restoran önerisi 1", "rating": 4.4, "address": "Adres bilgisi", "url": "Google Maps linki", "photoUrl": "Fotoğraf URL"}],
    "attractions": [{"name": "Görülecek yer 1", "rating": 4.6, "address": "Adres bilgisi", "url": "Google Maps linki", "photoUrl": "Fotoğraf URL"}],
    "tips": ["İpucu 1", "İpucu 2", "İpucu 3"]
  },
  "estimatedCost": 5000
}

Kurallar:
- Sadece JSON formatında cevap ver, başka açıklama yapma.
- Eğer Google Places verisi verildiyse, recommendations alanlarında bu listedeki gerçek mekan adlarını kullan.
- activities içinde de mümkün olduğunca gerçek mekan isimleri kullan.
- İlgi alanlarına uygun aktiviteler öner.
- estimatedCost alanına kişi başı toplam tahmini harcamayı Türk Lirası (₺) cinsinden sayısal olarak yaz (örn: 8500). Konaklama, yemek ve ulaşım dahil kaba bir tahmin yap.`;
};

export const parseAIResponse = (responseText: string): AIPlan => {
  if (!responseText) {
    throw new Error("AI yanıtı alınamadı");
  }

  let jsonText = responseText.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/```\n?/g, "");
  }

  const aiPlan = JSON.parse(jsonText) as AIPlan;

  if (!aiPlan.itinerary || !Array.isArray(aiPlan.itinerary)) {
    throw new Error("Geçersiz plan formatı");
  }

  return aiPlan;
};

export const isQuotaOrRateLimitError = (message = ""): boolean =>
  /429|quota|rate limit|retry|resource_exhausted/i.test(message);

const fetchGoogleRecommendationsClient = async (tripData: TripData) => {
  const googlePlacesApiKey = getGooglePlacesApiKey();
  if (isPlaceholderKey(googlePlacesApiKey)) return null;

  const placeName = tripData.selectedPlace!.name;
  const coordinates = tripData.selectedPlace?.coordinates;

  const [accommodations, restaurants, attractions] = await Promise.all([
    fetchGooglePlacesByQuery(
      googlePlacesApiKey,
      `${placeName} otel konaklama`,
      coordinates,
    ),
    fetchGooglePlacesByQuery(
      googlePlacesApiKey,
      `${placeName} en iyi restoran`,
      coordinates,
    ),
    fetchGooglePlacesByQuery(
      googlePlacesApiKey,
      `${placeName} gezilecek yer`,
      coordinates,
    ),
  ]);

  return { accommodations, restaurants, attractions };
};

const mergeGoogleIntoPlan = (
  aiPlan: AIPlan,
  googleRecommendations: {
    accommodations: PlaceRecommendation[];
    restaurants: PlaceRecommendation[];
    attractions: PlaceRecommendation[];
  },
): AIPlan => ({
  ...aiPlan,
  recommendations: {
    ...(aiPlan.recommendations || {}),
    accommodations: googleRecommendations.accommodations,
    restaurants: googleRecommendations.restaurants,
    attractions: googleRecommendations.attractions,
    tips: Array.isArray(aiPlan.recommendations?.tips)
      ? aiPlan.recommendations.tips
      : [
          "Mekanların çalışma saatlerini gitmeden önce kontrol edin.",
          "Rezervasyon gerektiren mekanlar için erken plan yapın.",
        ],
  },
});

async function callOpenAIDirect(prompt: string): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (isPlaceholderKey(apiKey)) {
    throw new Error(
      "OpenAI API anahtarı bulunamadı. EXPO_PUBLIC_OPENAI_API_KEY ekleyin veya API proxy kullanın.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string; type?: string };
    };
    const rawMessage =
      errorData.error?.message ||
      `API hatası: ${response.status} ${response.statusText}`;

    if (
      response.status === 429 ||
      /quota|exceeded/i.test(rawMessage) ||
      errorData.error?.type === "insufficient_quota"
    ) {
      throw new Error("OpenAI kota limiti doldu.");
    }

    throw new Error(rawMessage);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI boş yanıt döndü");
  return content;
}

async function callGeminiDirect(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (isPlaceholderKey(apiKey)) {
    throw new Error(
      "Gemini API anahtarı bulunamadı. EXPO_PUBLIC_GEMINI_API_KEY ekleyin veya API proxy kullanın.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { temperature: 0.7 },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text) throw new Error("Gemini boş yanıt döndü");
  return text;
}

async function generateWithProviderDirect(
  provider: AIProvider,
  prompt: string,
): Promise<string> {
  if (provider === "openai") {
    return callOpenAIDirect(prompt);
  }
  if (provider === "gemini") {
    return callGeminiDirect(prompt);
  }

  if (!isPlaceholderKey(getOpenAiApiKey())) {
    try {
      return await callOpenAIDirect(prompt);
    } catch (openAiError) {
      if (!isPlaceholderKey(getGeminiApiKey())) {
        return callGeminiDirect(prompt);
      }
      throw openAiError;
    }
  }

  return callGeminiDirect(prompt);
}

const toGenerateRequest = (tripData: TripData): GenerateTripPlanRequest => ({
  selectedPlace: {
    name: tripData.selectedPlace!.name,
    coordinates: tripData.selectedPlace?.coordinates ?? null,
  },
  startDate: toIsoDate(tripData.startDate),
  endDate: toIsoDate(tripData.endDate),
  duration: tripData.duration || 1,
  travelers: tripData.travelers || 1,
  interests: tripData.interests || [],
  provider: getAiProvider(),
});

async function generateTripPlanViaProxy(
  tripData: TripData,
): Promise<AIPlan> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<GenerateTripPlanRequest, { aiPlan: AIPlan }>(
    functions,
    "generateTripPlan",
  );

  const result = await callable(toGenerateRequest(tripData));
  if (!result.data?.aiPlan) {
    throw new Error("Sunucudan geçerli plan alınamadı");
  }
  return result.data.aiPlan;
}

async function generateTripPlanDirect(tripData: TripData): Promise<AIPlan> {
  const googleRecommendations = await fetchGoogleRecommendationsClient(tripData);
  const prompt = buildPrompt(tripData, googleRecommendations);
  const responseText = await generateWithProviderDirect(
    getAiProvider(),
    prompt,
  );
  const aiPlan = parseAIResponse(responseText);

  if (googleRecommendations) {
    return mergeGoogleIntoPlan(aiPlan, googleRecommendations);
  }

  return aiPlan;
}

export async function generateTripPlan(tripData: TripData): Promise<AIPlan> {
  if (!tripData?.selectedPlace) {
    throw new Error("Lütfen önce bir yer seçin");
  }

  if (!tripData?.startDate || !tripData?.endDate) {
    throw new Error("Lütfen seyahat tarihlerini seçin");
  }

  if (shouldUseApiProxy()) {
    try {
      return await generateTripPlanViaProxy(tripData);
    } catch (proxyError) {
      console.warn(
        "API proxy başarısız, doğrudan istemci moduna düşülüyor:",
        proxyError,
      );
      const hasDirectKey =
        !isPlaceholderKey(getOpenAiApiKey()) ||
        !isPlaceholderKey(getGeminiApiKey());
      if (!hasDirectKey) {
        throw proxyError;
      }
    }
  }

  return generateTripPlanDirect(tripData);
}
