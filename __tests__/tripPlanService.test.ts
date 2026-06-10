// Firebase ve dış bağımlılıkları mockla
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(),
  })),
}));
jest.mock("../configs/env", () => ({
  getAiProvider: jest.fn(() => "auto"),
  getGeminiApiKey: jest.fn(() => "test-key"),
  getOpenAiApiKey: jest.fn(() => "test-key"),
  isPlaceholderKey: jest.fn(() => false),
  shouldUseApiProxy: jest.fn(() => false),
  getGooglePlacesApiKey: jest.fn(() => "test-key"),
}));
jest.mock("../configs/firebaseFunctions", () => ({
  getFirebaseFunctions: jest.fn(),
}));

import { isQuotaOrRateLimitError, parseAIResponse } from "../services/tripPlanService";

describe("parseAIResponse", () => {
  it("geçerli JSON planı parse eder", () => {
    const validPlan = JSON.stringify({
      itinerary: [
        {
          day: 1,
          title: "İstanbul'u Keşfet",
          activities: ["Ayasofya", "Topkapı Sarayı"],
          time: "Sabah - Akşam",
          meals: { breakfast: "Simit", lunch: "Balık ekmek", dinner: "Kebap" },
        },
      ],
      recommendations: {
        accommodations: [],
        restaurants: [],
        attractions: [],
        tips: ["Müze kartı alın"],
      },
      packingList: [],
    });

    const result = parseAIResponse(validPlan);
    expect(result.itinerary).toHaveLength(1);
    expect(result.itinerary[0].day).toBe(1);
    expect(result.itinerary[0].title).toBe("İstanbul'u Keşfet");
  });

  it("```json ... ``` bloğundan JSON çıkarır", () => {
    const wrappedPlan = `\`\`\`json
{
  "itinerary": [{"day": 1, "title": "Test", "activities": [], "time": "Sabah", "meals": {"breakfast": "", "lunch": "", "dinner": ""}}],
  "recommendations": {"accommodations": [], "restaurants": [], "attractions": [], "tips": []},
  "packingList": []
}
\`\`\``;

    const result = parseAIResponse(wrappedPlan);
    expect(result.itinerary[0].day).toBe(1);
  });

  it("boş yanıt gelince hata fırlatır", () => {
    expect(() => parseAIResponse("")).toThrow("AI yanıtı alınamadı");
  });

  it("itinerary alanı yoksa hata fırlatır", () => {
    const invalidPlan = JSON.stringify({ packingList: [] });
    expect(() => parseAIResponse(invalidPlan)).toThrow("Geçersiz plan formatı");
  });

  it("geçersiz JSON gelince hata fırlatır", () => {
    expect(() => parseAIResponse("bu json değil")).toThrow();
  });
});

describe("isQuotaOrRateLimitError", () => {
  it("429 içeren mesajı tanır", () => {
    expect(isQuotaOrRateLimitError("Error 429: Too Many Requests")).toBe(true);
  });

  it("quota kelimesini tanır", () => {
    expect(isQuotaOrRateLimitError("You exceeded your quota")).toBe(true);
  });

  it("rate limit kelimesini tanır", () => {
    expect(isQuotaOrRateLimitError("rate limit exceeded")).toBe(true);
  });

  it("resource_exhausted kelimesini tanır", () => {
    expect(isQuotaOrRateLimitError("RESOURCE_EXHAUSTED")).toBe(true);
  });

  it("normal hata mesajını tanımaz", () => {
    expect(isQuotaOrRateLimitError("Network hatası")).toBe(false);
  });

  it("boş string için false döner", () => {
    expect(isQuotaOrRateLimitError("")).toBe(false);
  });
});
