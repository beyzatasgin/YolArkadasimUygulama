import { GoogleGenerativeAI } from "@google/generative-ai";
import { httpsCallable } from "firebase/functions";
import {
  getAiProvider,
  getGeminiApiKey,
  getOpenAiApiKey,
  isPlaceholderKey,
  shouldUseApiProxy,
} from "../configs/env";
import { getFirebaseFunctions } from "../configs/firebaseFunctions";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type TripContext = {
  placeName?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: number;
  interests?: string[];
};

const buildSystemPrompt = (tripContext?: TripContext): string => {
  const base = `Sen "Yol Arkadaşım" uygulamasının yapay zeka seyahat asistanısın.
Kullanıcılara seyahat planlaması, destinasyonlar, vize bilgisi, para birimi, hava durumu,
kültürel ipuçları, ulaşım ve konaklama konularında yardım ediyorsun.
Cevaplarını Türkçe ver, samimi ve yardımsever ol. Kısa ve öz cevaplar ver.`;

  if (!tripContext?.placeName) return base;

  return `${base}

Kullanıcı şu an için bir seyahat planlamış:
- Destinasyon: ${tripContext.placeName}
- Tarih: ${tripContext.startDate || "?"} - ${tripContext.endDate || "?"}
- Süre: ${tripContext.duration || "?"} gün
- Kişi sayısı: ${tripContext.travelers || 1}
- İlgi alanları: ${tripContext.interests?.join(", ") || "Genel"}

Bu seyahate özel sorularda bu bilgileri göz önünde bulundur.`;
};

async function callOpenAIChat(
  messages: { role: string; content: string }[],
  apiKey: string,
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err?.error?.message || `OpenAI hatası: ${response.status}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI boş yanıt döndü");
  return content;
}

async function callGeminiChat(
  history: { role: string; parts: { text: string }[] }[],
  userMessage: string,
  apiKey: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const text = result.response.text();
  if (!text) throw new Error("Gemini boş yanıt döndü");
  return text;
}

export async function sendChatMessage(
  userMessage: string,
  history: ChatMessage[],
  tripContext?: TripContext,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(tripContext);
  const provider = getAiProvider();
  const openAiKey = getOpenAiApiKey();
  const geminiKey = getGeminiApiKey();

  // OpenAI formatında mesaj geçmişi
  const openAiMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Gemini formatında geçmiş
  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (provider === "openai" || (provider === "auto" && !isPlaceholderKey(openAiKey))) {
    try {
      return await callOpenAIChat(openAiMessages, openAiKey);
    } catch (e) {
      if (provider === "auto" && !isPlaceholderKey(geminiKey)) {
        return await callGeminiChat(
          [{ role: "user", parts: [{ text: systemPrompt }] }, ...geminiHistory],
          userMessage,
          geminiKey,
        );
      }
      throw e;
    }
  }

  if (!isPlaceholderKey(geminiKey)) {
    return await callGeminiChat(
      [{ role: "user", parts: [{ text: systemPrompt }] }, ...geminiHistory],
      userMessage,
      geminiKey,
    );
  }

  throw new Error("AI API anahtarı bulunamadı");
}
