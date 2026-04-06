# Yol Arkadaşım - AI Travel Planner

Modern ve kullanıcı dostu bir seyahat planlama uygulaması. AI destekli önerilerle kişiselleştirilmiş seyahat deneyimleri sunar.

##  Özellikler

- **AI Destekli Seyahat Planlama**: Yapay zeka ile kişiselleştirilmiş seyahat önerileri
- **OpenStreetMap Entegrasyonu**: Ücretsiz ve açık kaynak yer arama ve detayları
- **Firebase Authentication**: Güvenli kullanıcı girişi ve kayıt
- **Modern UI/UX**: React Native ve Expo ile geliştirilmiş responsive tasarım
- **Çoklu Platform Desteği**: iOS, Android ve Web

##  Teknolojiler

- **React Native** - Mobil uygulama geliştirme
- **Expo** - Geliştirme ve dağıtım platformu
- **Firebase** - Backend servisleri ve authentication
- **OpenStreetMap Nominatim API** - Yer arama ve detayları
- **TypeScript** - Tip güvenliği
- **Expo Router** - Navigasyon

##  Kurulum

1. **Projeyi klonlayın**
   ```bash
   git clone <repository-url>
   cd yolarkadasim
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Environment variables ayarlayın**
   `.env` dosyası oluşturun ve Firebase ve OpenAI API anahtarlarınızı ekleyin:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
   ```
   
   **Notlar**: 
   - OpenStreetMap Nominatim API ücretsizdir ve API anahtarı gerektirmez. Ancak kullanım limitleri için lütfen [Nominatim Kullanım Politikası](https://operations.osmfoundation.org/policies/nominatim/)'nı okuyun.
   - OpenAI API anahtarı için [OpenAI Platform](https://platform.openai.com/api-keys) adresinden API anahtarı alabilirsiniz.
   - Google Places API anahtarı için [Google Cloud Console](https://console.cloud.google.com/) adresinden:
     1. Yeni bir proje oluşturun veya mevcut projeyi seçin
     2. "APIs & Services" > "Library" bölümüne gidin
     3. "Places API" ve "Places API (New)" servislerini etkinleştirin
     4. "Credentials" bölümünden API anahtarı oluşturun
     5. API anahtarını `.env` dosyasına `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` olarak ekleyin
     **Önemli**: Google Places API ücretlidir, ancak ilk $200 ücretsiz krediniz var. Detaylar için [Google Places API Fiyatlandırma](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) sayfasına bakın.

4. **Uygulamayı başlatın**
   ```bash
   npm start
   ```

##  Geliştirme

- **Linting**: `npm run lint`
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

##  Proje Yapısı

```
yolarkadasim/
├── app/                    # Expo Router sayfaları
│   ├── (tabs)/            # Tab navigasyonu
│   ├── auth/              # Authentication sayfaları
│   └── create-trip/       # Seyahat oluşturma
├── components/            # Yeniden kullanılabilir bileşenler
├── configs/              # Konfigürasyon dosyaları
├── constants/            # Sabitler ve renkler
├── context/              # React Context
└── assets/               # Statik dosyalar
```

##  Güvenlik

- Firebase API anahtarları environment variables ile korunur
- Kullanıcı verileri Firebase Authentication ile güvenli şekilde yönetilir
- OpenStreetMap Nominatim API kullanımı için User-Agent header'ı yapılandırılmıştır



