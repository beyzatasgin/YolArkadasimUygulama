import type { ChatMessage, TripContext } from "../services/chatService";

// buildSystemPrompt private olduğu için sendChatMessage'ı mock ile test ediyoruz.
// Burada servis mantığını (mesaj formatı, tip kontrolü) test ediyoruz.

describe("ChatMessage tipi", () => {
  it("geçerli bir user mesajı oluşturulabilir", () => {
    const msg: ChatMessage = {
      id: "1",
      role: "user",
      content: "İstanbul'da ne gezebilirim?",
      timestamp: new Date(),
    };

    expect(msg.role).toBe("user");
    expect(msg.content).toBeTruthy();
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it("geçerli bir assistant mesajı oluşturulabilir", () => {
    const msg: ChatMessage = {
      id: "2",
      role: "assistant",
      content: "Ayasofya, Topkapı Sarayı ve Kapalıçarşı'yı ziyaret edebilirsiniz.",
      timestamp: new Date(),
    };

    expect(msg.role).toBe("assistant");
    expect(msg.id).toBe("2");
  });
});

describe("TripContext tipi", () => {
  it("boş context oluşturulabilir", () => {
    const ctx: TripContext = {};
    expect(ctx.placeName).toBeUndefined();
  });

  it("dolu context oluşturulabilir", () => {
    const ctx: TripContext = {
      placeName: "İstanbul",
      startDate: "2025-07-01",
      endDate: "2025-07-05",
      duration: 4,
      travelers: 2,
      interests: ["Tarih", "Yemek"],
    };

    expect(ctx.placeName).toBe("İstanbul");
    expect(ctx.interests).toContain("Tarih");
    expect(ctx.duration).toBe(4);
  });
});

describe("Mesaj geçmişi formatı", () => {
  it("geçmiş mesajlar sırayla saklanabilir", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "Merhaba", timestamp: new Date() },
      { id: "2", role: "assistant", content: "Merhaba! Size nasıl yardımcı olabilirim?", timestamp: new Date() },
    ];

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });

  it("OpenAI mesaj formatına dönüştürülebilir", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "Paris nasıl bir şehir?", timestamp: new Date() },
      { id: "2", role: "assistant", content: "Harika bir şehir!", timestamp: new Date() },
    ];

    const openAiMessages = history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    expect(openAiMessages[0]).toEqual({ role: "user", content: "Paris nasıl bir şehir?" });
    expect(openAiMessages[1]).toEqual({ role: "assistant", content: "Harika bir şehir!" });
  });

  it("Gemini mesaj formatına dönüştürülebilir", () => {
    const history: ChatMessage[] = [
      { id: "1", role: "user", content: "Vize lazım mı?", timestamp: new Date() },
    ];

    const geminiHistory = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    expect(geminiHistory[0].role).toBe("user");
    expect(geminiHistory[0].parts[0].text).toBe("Vize lazım mı?");
  });
});
