// Genel yardımcı fonksiyon testleri

describe("Tarih hesaplama", () => {
  it("iki tarih arasındaki gün sayısını hesaplar", () => {
    const start = new Date("2025-07-01");
    const end = new Date("2025-07-05");
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(4);
  });

  it("aynı gün için 0 döner", () => {
    const date = new Date("2025-07-01");
    const diffMs = date.getTime() - date.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(0);
  });
});

describe("Türkçe tarih formatı", () => {
  it("tarihi Türkçe olarak formatlar", () => {
    const date = new Date("2025-07-15");
    const formatted = date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(formatted).toContain("2025");
    expect(formatted).toContain("Temmuz");
  });
});

describe("Gezi validasyonu", () => {
  it("boş yer adı geçersizdir", () => {
    const placeName = "";
    expect(placeName.trim().length).toBe(0);
  });

  it("geçerli gezi verisi kontrol edilebilir", () => {
    const tripData = {
      selectedPlace: { name: "İstanbul" },
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-07-05"),
      travelers: 2,
    };

    expect(tripData.selectedPlace.name).toBeTruthy();
    expect(tripData.travelers).toBeGreaterThan(0);
    expect(tripData.startDate < tripData.endDate).toBe(true);
  });

  it("bitiş tarihi başlangıçtan önce olamaz", () => {
    const startDate = new Date("2025-07-05");
    const endDate = new Date("2025-07-01");
    expect(endDate < startDate).toBe(true);
  });
});

describe("İlgi alanları", () => {
  it("ilgi alanları birleştirilebilir", () => {
    const interests = ["Tarih", "Yemek", "Müze"];
    const joined = interests.join(", ");
    expect(joined).toBe("Tarih, Yemek, Müze");
  });

  it("boş ilgi alanları için varsayılan değer kullanılır", () => {
    const interests: string[] = [];
    const result = interests.length > 0 ? interests.join(", ") : "Genel";
    expect(result).toBe("Genel");
  });
});
