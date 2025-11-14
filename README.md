# Yol Arkadaşım - AI Travel Planner

Modern ve kullanıcı dostu bir seyahat planlama uygulaması. AI destekli önerilerle kişiselleştirilmiş seyahat deneyimleri sunar.

## 🚀 Özellikler

- **AI Destekli Seyahat Planlama**: Yapay zeka ile kişiselleştirilmiş seyahat önerileri
- **Google Places Entegrasyonu**: Gerçek zamanlı yer arama ve detayları
- **Firebase Authentication**: Güvenli kullanıcı girişi ve kayıt
- **Modern UI/UX**: React Native ve Expo ile geliştirilmiş responsive tasarım
- **Çoklu Platform Desteği**: iOS, Android ve Web

## 📱 Teknolojiler

- **React Native** - Mobil uygulama geliştirme
- **Expo** - Geliştirme ve dağıtım platformu
- **Firebase** - Backend servisleri ve authentication
- **Google Places API** - Yer arama ve detayları
- **TypeScript** - Tip güvenliği
- **Expo Router** - Navigasyon

## 🛠️ Kurulum

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
   `.env` dosyası oluşturun ve Firebase ve Google Maps API anahtarlarınızı ekleyin:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   EXPO_PUBLIC_GOOGLE_MAP_KEY=your_google_maps_api_key
   ```

4. **Uygulamayı başlatın**
   ```bash
   npm start
   ```

## 🔧 Geliştirme

- **Linting**: `npm run lint`
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## 📁 Proje Yapısı

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

## 🔐 Güvenlik

- Firebase API anahtarları environment variables ile korunur
- Kullanıcı verileri Firebase Authentication ile güvenli şekilde yönetilir
- Google Places API kullanımı için gerekli izinler yapılandırılmıştır

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Proje hakkında sorularınız için issue açabilir veya iletişime geçebilirsiniz.