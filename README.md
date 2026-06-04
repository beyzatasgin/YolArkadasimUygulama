# ✈️ Yol Arkadaşım

**Yapay Zeka Destekli Kişisel Seyahat Planlama Uygulaması**

Yol Arkadaşım, kullanıcıların destinasyon seçerek tarih ve ilgi alanlarını belirlemesiyle yapay zeka aracılığıyla kişiselleştirilmiş günlük seyahat planları oluşturabildiği bir mobil uygulamadır. Bilgisayar Mühendisliği Bitirme Projesi kapsamında geliştirilmiştir.

---

## 📱 Ekran Görüntüleri

| Giriş | Seyahatlerim | AI Chat | İstatistikler |
|-------|-------------|---------|--------------|
| Koyu tema, animasyonlu | Yaklaşan & geçmiş ayrımı | Seyahat asistanı | Grafik & metrikler |

---

## 🚀 Özellikler

### 🤖 Yapay Zeka Entegrasyonu
- **OpenAI GPT-4o-mini** ile ayrıntılı günlük seyahat planı oluşturma
- **Google Gemini 2.0 Flash** yedek AI sağlayıcısı (OpenAI kota dolunca otomatik geçiş)
- Kişi sayısı, ilgi alanları ve süreye göre kişiselleştirilmiş öneriler
- Kişi başı **tahmini bütçe** hesaplama (₺)

### 💬 AI Seyahat Asistanı
- Seyahat hakkında **sohbet tabanlı** sorular sorma
- Vize, para birimi, hava, ulaşım, kültür gibi konularda anlık yanıt
- Seyahate özel bağlamsal sorular (destinasyon, tarih, ilgi alanları)
- "Vize gerekiyor mu?", "Yerel yemekler neler?" gibi **hızlı soru chips'leri**
- **Sohbet geçmişi Firestore'a kaydedilir** — uygulama kapanınca silinmez, kaldığı yerden devam eder
- Sohbeti temizleme butonu ile geçmiş sıfırlanabilir

### 🌤️ Hava Durumu
- Destinasyonun **anlık hava durumu** ve **7 günlük tahmini** (seyahat detay sayfasında)
- **Open-Meteo API** — ücretsiz, API key gerektirmez, koordinat tabanlı
- Türkçe hava durumu açıklamaları ve rüzgar hızı
- Günlük maks/min sıcaklık + WMO ikon gösterimi

### 🗺️ Destinasyon & Harita
- **Google Places API (New)** ile otomatik tamamlamalı yer arama
- Gerçek Google verileriyle konaklama, restoran ve gezilecek yer önerileri
- Öneri kartlarından doğrudan **Google Maps** açma
- İnteraktif harita görünümü (`react-native-maps`)
- **Harita pinleri**: AI planındaki restoranlar, turistik yerler ve konaklama noktaları haritada farklı renk pinlerle gösterilir
- **Nominatim (OpenStreetMap)** ile ücretsiz geocoding — pin'e tıklayınca yer adı balonu çıkar

### ✈️ Alternatif Plan Önerisi
- Mevcut AI planını **tek tıkla yeniden oluşturma**
- 4 farklı mod: **Bütçemi Düşür** · **Daha Kültürel** · **Maceraya Hazırlan** · **Aile Dostu**
- Her mod AI'ya özel yönerge göndererek farklı odaklı plan üretir
- Yeni plan Firestore'a kaydedilir ve anında uygulanır

### 🍽️ Günlük Yemek Önerileri
- AI planında her gün için **kahvaltı, öğle ve akşam yemeği** önerisi
- Destinasyona özgü yerel lezzetlere öncelik verilir
- Her öneriye tıklayınca Google Maps'te arama yapılır

### 📅 Seyahat Yönetimi
- 6 adımlı sezgisel seyahat oluşturma akışı
- Yaklaşan / geçmiş seyahat ayrımı ve geri sayım
- Seyahat adı ve notlarını düzenleme (in-place modal)
- Seyahati **WhatsApp, e-posta ve mesaj** uygulamalarına paylaşma

### 🔔 Akıllı Bildirimler
- Seyahat başlamadan **1 gün önce** saat 09:00 hatırlatıcı
- **Seyahat günü** sabah 08:00 hatırlatıcı
- Seyahat silinince bildirimler otomatik iptal edilir

### ⭐ Değerlendirme Sistemi
- Geçmiş seyahatlere **1–5 yıldız** puanlama
- Metin yorumu ekleme
- Puanlar seyahat listesinde gösterilir

### 📊 Seyahat İstatistikleri
- Toplam seyahat, gün, destinasyon ve yolcu sayısı
- **Son 6 ay** seyahat bar grafiği
- En uzun seyahat ve en çok gidilen yer rekorları
- **İlgi alanı dağılımı** (progress bar ile)
- Ortalama değerlendirme puanı
- Yaklaşan / geçmiş seyahat oranı

### 🌍 Keşfet
- Dünya genelinde destinasyon arama
- Popüler şehir hızlı erişim chips'leri
- Yerleri **favorilere ekleme / kaldırma** (toggle)
- Kaydedilen Yerler sayfası

### 👤 Kullanıcı Profili
- Firebase Authentication (E-posta/Şifre + Google)
- Profil fotoğrafı yükleme (Firebase Storage)
- Ad güncelleme, şifre değiştirme (accordion)
- Hızlı erişim: Seyahatlerim, İstatistikler, Kayıtlı Yerler, Gizlilik

### 📶 Çevrimdışı Destek
- İnternet bağlantısı kesilince üst banner bildirimi
- Bağlantı geri gelince otomatik yeşil banner

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Mobil Frontend** | React Native 0.81 + Expo 54 (TypeScript) |
| **Navigasyon** | Expo Router 6 (dosya tabanlı) |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **Veritabanı** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **Depolama** | Firebase Storage |
| **Birincil AI** | OpenAI GPT-4o-mini |
| **Yedek AI** | Google Gemini 2.0 Flash |
| **AI Chat** | OpenAI / Gemini sohbet API |
| **Yer Arama** | Google Places API (New) |
| **Bildirim** | expo-notifications |
| **Ağ İzleme** | @react-native-community/netinfo |
| **Harita** | react-native-maps |
| **Hava Durumu** | Open-Meteo API (ücretsiz) |
| **Geocoding** | Nominatim / OpenStreetMap (ücretsiz) |

---

## 📂 Proje Yapısı

```
├── app/
│   ├── (tabs)/             # Ana sekmeler (Seyahatlerim, Keşfet, Profil)
│   ├── auth/               # Giriş, Kayıt, Şifre Sıfırlama
│   ├── create-trip/        # 6 adımlı seyahat oluşturma akışı
│   ├── trip-detail/        # Seyahat detay & düzenleme
│   ├── ai-chat.tsx         # AI Seyahat Asistanı chat ekranı
│   ├── statistics.tsx      # Seyahat istatistikleri
│   ├── day-detail.tsx      # Günlük AI plan detayı
│   └── saved-places.tsx    # Kaydedilen yerler
│
├── components/             # TripRating, TripMap, WeatherCard, OfflineBanner...
├── services/               # tripPlanService, chatService, notificationService, placesService
├── functions/              # Firebase Cloud Functions (AI / Places proxy)
├── context/                # CreateTripContext
├── hooks/                  # useCreateTrip, useNetworkStatus, useAttractionPins
├── utils/                  # imageHelper, firestore, router
└── types/                  # TypeScript tip tanımları
```

---

## ⚙️ Kurulum

### Gereksinimler
- Node.js 18+
- Expo Go (mobil test için) veya Android/iOS Simulator

### 1. Repoyu Klonla
```bash
git clone https://github.com/beyzatasgin/YolArkadasimUygulama.git
cd YolArkadasimUygulama
git checkout beyzatasgin
```

### 2. Bağımlılıkları Yükle
```bash
npm install
npx expo install expo-notifications @react-native-community/netinfo
```

### 3. Ortam Değişkenlerini Ayarla
`.env.example` dosyasını kopyalayın:
```bash
cp .env.example .env
```

`.env` içini doldurun:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

EXPO_PUBLIC_OPENAI_API_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...

EXPO_PUBLIC_USE_API_PROXY=false
EXPO_PUBLIC_AI_PROVIDER=auto
```

### 4. Firebase Cloud Functions (Backend)
```bash
cd functions
cp .env.example .env   # API anahtarlarını girin
npm install
npm run build
```

### 5. Uygulamayı Başlat
```bash
npx expo start
```

---

## 🔥 Firebase Yapılandırması

### Firestore Güvenlik Kuralları
Firebase Console → Firestore → Rules sekmesinden `firestore.rules` dosyasındaki kuralları yapıştırın.

### Composite Index
Uygulama hata logunda çıkan index linkine tıklayarak otomatik oluşturabilirsiniz.

---

## 🔄 Uygulama Akışı

```
Giriş / Kayıt
      ↓
Seyahatlerim (Ana Ekran)
  ├── ✨ AI Asistan Chat
  └── + Yeni Seyahat:
        1. Destinasyon Ara
        2. Tarih Seç
        3. Tercihler (yolcu, ilgi alanları)
        4. İncele
        5. AI Plan Oluştur
        6. Kaydet
      ↓
Seyahat Detayı
  ├── Günlük Plan → Gün Detayı (aktiviteler + 🍽️ yemek önerileri + harita)
  ├── ✈️ Alternatif Plan (Bütçemi Düşür / Kültürel / Macera / Aile)
  ├── 💬 AI Asistan ile Sohbet Et (geçmiş kaydedilir)
  └── ⭐ Değerlendirme (geçmiş seyahatler)
      ↓
Profil → 📊 İstatistikler
```

---

## 🤖 AI Sağlayıcı Seçimi

`EXPO_PUBLIC_AI_PROVIDER` değerleri:

| Değer | Davranış |
|-------|---------|
| `openai` | Yalnızca OpenAI GPT-4o-mini |
| `gemini` | Yalnızca Google Gemini 2.0 Flash |
| `auto` | Önce OpenAI, hata/kota aşımında Gemini (varsayılan) |

---

## 🔒 Güvenlik

- `EXPO_PUBLIC_USE_API_PROXY=true` ayarıyla tüm AI ve Places çağrıları Cloud Functions üzerinden yapılır; API anahtarları istemcide görünmez
- Firestore kuralları her kullanıcının yalnızca kendi verisine erişmesini sağlar
- `.env` dosyası asla repoya commit edilmemelidir

---

## 🧪 Geliştirme Komutları

```bash
npm run android           # Android emülatör / cihaz
npm run ios               # iOS simülatör / cihaz
npm run web               # Web tarayıcı
npm run lint              # ESLint kontrolü
npm run typecheck         # TypeScript tip kontrolü
npm run functions:serve   # Cloud Functions yerel emülatör
npm run functions:deploy  # Cloud Functions deploy
```

---

## 👩‍💻 Geliştirici

**Beyza Taşgın**
Bilgisayar Mühendisliği — Bitirme Projesi 2025

---

## 📄 Lisans

Bu proje akademik amaçlı geliştirilmiştir.
