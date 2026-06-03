import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { GenerateTripPlanInput, AIPlan, GoogleRecommendations } from "./types";
import { fetchGoogleRecommendations } from "./places";

const formatCandidatesForPrompt = (items: { name: string; rating?: number | null }[]) => {
  if (!items.length) return "- Veri bulunamadı";
  return items
    .slice(0, 3)
    .map((item) => {
      const ratingText = item.rating ? ` | Puan: ${item.rating}` : "";
      return `- ${item.name}${ratingText}`;
    })
    .join("\n");
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

export const buildTripPlanPrompt = (
  input: GenerateTripPlanInput,
  googleRecommendations: GoogleRecommendations | null,
): string => {
  const interests =
    input.interests.length > 0 ? input.interests.join(", ") : "Genel";

  const googleContext = googleRecommendations
    ? `\nGoogle Places verileri (öncelikli kullan):\n\nKonaklama adayları:\n${formatCandidatesForPrompt(googleRecommendations.accommodations)}\n\nRestoran adayları:\n${formatCandidatesForPrompt(googleRecommendations.restaurants)}\n\nGörülecek yer adayları:\n${formatCandidatesForPrompt(googleRecommendations.attractions)}`
    : "";

  return `Sen bir seyahat planlama uzmanısın. Aşağıdaki bilgilere göre detaylı bir seyahat planı oluştur:

Yer: ${input.selectedPlace.name}
Tarih: ${input.startDate} - ${input.endDate}
Süre: ${input.duration} gün
Yolcu Sayısı: ${input.travelers} kişi
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

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI boş yanıt döndü");
  return content;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
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

const isQuotaError = (message: string) =>
  /429|quota|rate limit|resource_exhausted|exceeded/i.test(message);

async function generateWithProvider(
  provider: "openai" | "gemini",
  prompt: string,
  keys: { openai?: string; gemini?: string },
): Promise<string> {
  if (provider === "openai") {
    if (!keys.openai) throw new Error("OpenAI API anahtarı yapılandırılmamış");
    return callOpenAI(prompt, keys.openai);
  }
  if (!keys.gemini) throw new Error("Gemini API anahtarı yapılandırılmamış");
  return callGemini(prompt, keys.gemini);
}

export async function generateTripPlanOnServer(
  input: GenerateTripPlanInput,
  keys: {
    openai?: string;
    gemini?: string;
    googlePlaces?: string;
  },
): Promise<AIPlan> {
  let googleRecommendations: GoogleRecommendations | null = null;

  if (keys.googlePlaces) {
    try {
      googleRecommendations = await fetchGoogleRecommendations(
        keys.googlePlaces,
        input.selectedPlace.name,
        input.selectedPlace.coordinates,
      );
    } catch (error) {
      console.warn("Google Places (server):", error);
    }
  }

  const prompt = buildTripPlanPrompt(input, googleRecommendations);
  const provider = input.provider || "auto";

  let responseText: string;

  if (provider === "openai") {
    responseText = await generateWithProvider("openai", prompt, keys);
  } else if (provider === "gemini") {
    try {
      responseText = await generateWithProvider("gemini", prompt, keys);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (keys.openai && isQuotaError(msg)) {
        responseText = await generateWithProvider("openai", prompt, keys);
      } else {
        throw error;
      }
    }
  } else {
    if (keys.openai) {
      try {
        responseText = await generateWithProvider("openai", prompt, keys);
      } catch (openAiError) {
        if (!keys.gemini) throw openAiError;
        responseText = await generateWithProvider("gemini", prompt, keys);
      }
    } else if (keys.gemini) {
      responseText = await generateWithProvider("gemini", prompt, keys);
    } else {
      throw new Error("AI API anahtarı yapılandırılmamış");
    }
  }

  const aiPlan = parseAIResponse(responseText);

  if (googleRecommendations) {
    aiPlan.recommendations = {
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
    };
  }

  return aiPlan;
}
