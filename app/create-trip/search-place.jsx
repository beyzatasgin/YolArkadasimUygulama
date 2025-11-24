import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ImageBackground, Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CreateTripContext } from './../../context/CreateTripContext';
export default function SearchPlace() {
  const navigation = useNavigation();
  const {tripData,setTripData}=useContext(CreateTripContext);
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: 'Yer Ara',
    });

    console.log(tripData);
  }, [tripData, navigation]);

  // 🔹 Yer arama (autocomplete) - OpenStreetMap Nominatim API (Retry ve Timeout ile)
  const searchPlaces = async (text, retryCount = 0) => {
    if (text.length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    
    // Timeout kontrolü için AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          text
        )}&format=json&limit=8&addressdetails=1&extratags=1&namedetails=1&countrycodes=tr&accept-language=tr`,
        {
          headers: {
            'User-Agent': 'YolArkadasim/1.0', // Nominatim için gerekli
            'Accept': 'application/json',
          },
          signal: controller.signal, // Timeout kontrolü
        }
      );

      clearTimeout(timeoutId); // Başarılı ise timeout'u temizle

      // Response kontrolü
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        // Nominatim sonuçlarını Google Places formatına benzer şekilde dönüştür
        const formattedPredictions = data.map((place) => ({
          place_id: place.place_id || place.osm_id,
          description: place.display_name,
          structured_formatting: {
            main_text: place.name || place.display_name?.split(',')[0] || 'Bilinmeyen',
            secondary_text: place.display_name?.split(',').slice(1).join(',').trim() || '',
          },
          lat: parseFloat(place.lat),
          lon: parseFloat(place.lon),
          address: place.address,
        }));
        setPredictions(formattedPredictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      clearTimeout(timeoutId); // Hata durumunda timeout'u temizle
      
      // Abort hatası (timeout)
      if (error.name === 'AbortError') {
        console.warn('⚠️ Nominatim API timeout - istek 15 saniye içinde tamamlanamadı');
        
        // Retry mekanizması (maksimum 1 deneme - rate limit'i önlemek için)
        if (retryCount < 1) {
          console.log(`🔄 Nominatim API retry denemesi ${retryCount + 1}/1...`);
          // Daha uzun bekleme süresi
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }
        
        // Timeout sonrası kullanıcıya bilgi ver
        setPredictions([]);
        console.warn('⚠️ Nominatim API yavaş yanıt veriyor. Lütfen daha sonra tekrar deneyin.');
        return;
      }
      
      // Network hatası
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Nominatim API network hatası - internet bağlantısını kontrol edin');
        
        // Retry mekanizması (maksimum 1 deneme - rate limit'i önlemek için)
        if (retryCount < 1) {
          console.log(`🔄 Nominatim API retry denemesi ${retryCount + 1}/1...`);
          // Network hatalarında daha uzun bekleme
          setTimeout(() => searchPlaces(text, retryCount + 1), 3000);
          return;
        }
        
        // Network hatası sonrası kullanıcıya bilgi ver
        setPredictions([]);
        console.warn('⚠️ İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.');
        return;
      } else {
        console.error('❌ Nominatim API hatası:', error.message || error);
      }
      
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search - kullanıcı yazmayı bitirdikten 500ms sonra arama yap
  const handleSearchChange = (text) => {
    setSearchText(text);
    
    // Önceki timeout'u iptal et
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Boş ise hemen temizle
    if (text.length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    
    // Rate limiting: son aramadan en az 1 saniye geçmiş olmalı
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    const minDelay = 1000; // 1 saniye minimum bekleme
    
    if (timeSinceLastSearch < minDelay) {
      // Çok yakın zamanda arama yapıldı, debounce ile bekle
      const delay = minDelay - timeSinceLastSearch + 500; // Ekstra 500ms debounce
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, delay);
      setSearchTimeout(timeout);
    } else {
      // Yeterli süre geçmiş, debounce ile arama yap
      const timeout = setTimeout(() => {
        setLastSearchTime(Date.now());
        searchPlaces(text);
      }, 500); // 500ms debounce
      setSearchTimeout(timeout);
    }
  };
  
  // Component unmount olduğunda timeout'u temizle
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // OpenStreetMap kullanıldığı için görsel çekme API'si yok
  // Sadece fallback görselleri kullanıyoruz
  const getPlaceImageUrl = (placeName) => {
    return getFallbackImageUrl(placeName);
  };

  // Fallback görsel URL oluştur (API key yoksa veya hata durumunda)
  const getFallbackImageUrl = (placeName) => {
    try {
      const cleanName = placeName?.split(',')[0].trim().toLowerCase() || 'travel';
      const placeImageMap = {
        'istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80',
        'ankara': 'https://images.unsplash.com/photo-1622542796254-5b9c46ab0d2f?auto=format&fit=crop&w=900&q=80',
        'izmir': 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=900&q=80',
        'antalya': 'https://images.unsplash.com/photo-1573992554021-93fa646ad55e?auto=format&fit=crop&w=900&q=80',
        'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
        'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
        'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80',
        'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80',
        'barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=900&q=80',
        'rome': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=900&q=80',
      };
      
      if (placeImageMap[cleanName]) {
        return placeImageMap[cleanName];
      }
      
      const travelImages = [
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
      ];
      
      let hash = 0;
      for (let i = 0; i < cleanName.length; i++) {
        hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
      }
      return travelImages[Math.abs(hash) % travelImages.length];
    } catch (error) {
      return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80';
    }
  };

  // 🔹 Seçilen yerin detaylarını çek - OpenStreetMap Nominatim API (Retry ve Timeout ile)
  const fetchPlaceDetails = async (placeId, lat, lon, retryCount = 0) => {
    // Timeout kontrolü için AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

    try {
      // Reverse geocoding ile detaylı bilgi al
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&extratags=1&namedetails=1&accept-language=tr`,
        {
          headers: {
            'User-Agent': 'YolArkadasim/1.0',
            'Accept': 'application/json',
          },
          signal: controller.signal, // Timeout kontrolü
        }
      );

      clearTimeout(timeoutId); // Başarılı ise timeout'u temizle

      // Response kontrolü
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const place = await response.json();

      if (place && !place.error) {
        // OpenStreetMap URL oluştur
        const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
        
        const placeName = place.name || place.address?.name || place.display_name?.split(',')[0] || 'Bilinmeyen Yer';
        
        // OpenStreetMap kullanıldığı için fallback görsel kullan
        const photoUrl = getPlaceImageUrl(placeName);

        const details = {
          name: placeName,
          address: place.display_name || `${place.address?.road || ''}, ${place.address?.city || place.address?.town || place.address?.village || ''}`.trim(),
          coordinates: {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
          },
          url: osmUrl,
          photoUrl: photoUrl, // Fallback görsel
          rating: null, // OpenStreetMap'te rating yok
          totalReviews: null,
          isOpenNow: null, // OpenStreetMap'te açılış saatleri yok
        };

        setSelectedPlace(details);
        console.log('📍 Detaylı yer bilgisi:', details);
        console.log('📸 Görsel URL:', photoUrl);
      } else {
        throw new Error(place?.error || 'Yer bilgisi alınamadı');
      }
    } catch (error) {
      clearTimeout(timeoutId); // Hata durumunda timeout'u temizle
      
      // Abort hatası (timeout)
      if (error.name === 'AbortError') {
        console.warn('⚠️ Nominatim API timeout - yer detayları 10 saniye içinde alınamadı');
        
        // Retry mekanizması (maksimum 2 deneme)
        if (retryCount < 2) {
          console.log(`🔄 Nominatim API retry denemesi ${retryCount + 1}/2...`);
          setTimeout(() => fetchPlaceDetails(placeId, lat, lon, retryCount + 1), 1000);
          return;
        }
      }
      
      // Network hatası
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Nominatim API network hatası - yer detayları alınamadı');
        
        // Retry mekanizması (maksimum 2 deneme)
        if (retryCount < 2) {
          console.log(`🔄 Nominatim API retry denemesi ${retryCount + 1}/2...`);
          setTimeout(() => fetchPlaceDetails(placeId, lat, lon, retryCount + 1), 2000);
          return;
        }
        
        // Fallback: Koordinatlardan basit bilgi oluştur
        const fallbackDetails = {
          name: 'Seçilen Konum',
          address: `${lat}, ${lon}`,
          coordinates: {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
          },
          url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`,
          photoUrl: getPlaceImageUrl('travel'),
          rating: null,
          totalReviews: null,
          isOpenNow: null,
        };
        setSelectedPlace(fallbackDetails);
        console.log('📍 Fallback yer bilgisi kullanılıyor:', fallbackDetails);
      } else {
        console.error('❌ Nominatim API hatası:', error.message || error);
      }
    }
  };

  const selectPlace = (prediction) => {
    setSearchText(prediction.description);
    setPredictions([]);
    fetchPlaceDetails(prediction.place_id, prediction.lat, prediction.lon);
  };

  // Seçilen yeri context'e kaydet ve tarih seçimine geç
  const handlePlaceSelection = () => {
    if (!selectedPlace) {
      Alert.alert('Hata', 'Lütfen bir yer seçin');
      return;
    }

    console.log('📍 Yer seçildi:', selectedPlace);

    // Seyahat verilerini güncelle
    const updatedTripData = {
      ...tripData,
      selectedPlace: selectedPlace,
    };
    
    console.log('💾 Context güncelleniyor:', updatedTripData);
    setTripData(updatedTripData);
    
    // Tarih seçim sayfasına geç
    console.log('➡️ select-date sayfasına yönlendiriliyor...');
    router.push('/create-trip/select-date');
  };


  return (
    <View
      style={{
        padding: 25,
        paddingTop: 75,
        backgroundColor: Colors.WHITE,
        height: '100%',
      }}
    >
      <View style={{ position: 'relative' }}>
        <TextInput
          placeholder="Yer ara..."
          value={searchText}
          onChangeText={handleSearchChange}
          style={{
            padding: 15,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: Colors.GRAY,
            fontSize: 16,
            backgroundColor: '#FFFFFF',
          }}
        />

        {loading && (
          <View style={{ position: 'absolute', right: 15, top: 15 }}>
            <ActivityIndicator size="small" color={Colors.PRIMARY} />
          </View>
        )}
      </View>

      {/* 🔹 Autocomplete Sonuçları */}
      {predictions.length > 0 && (
        <View style={{ marginTop: 10, maxHeight: 300 }}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectPlace(item)}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.GRAY,
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Text style={{ fontSize: 16, color: Colors.PRIMARY, fontFamily: 'outfit-medium' }}>
                  {item.structured_formatting?.main_text || item.description}
                </Text>
                {item.structured_formatting?.secondary_text && (
                  <Text style={{ fontSize: 13, color: Colors.GRAY, marginTop: 4, fontFamily: 'outfit' }}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 🔹 Seçilen yerin detay bilgisi */}
      {selectedPlace && (
        <View
          style={{
            marginTop: 20,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: Colors.GRAY,
          }}
        >
          <ImageBackground
            source={{ uri: selectedPlace.photoUrl || getFallbackImageUrl(selectedPlace.name) }}
            style={{
              width: '100%',
              height: 220,
              justifyContent: 'flex-end',
            }}
            imageStyle={{ opacity: 0.8 }}
          >
            <View
              style={{
                padding: 15,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: 'outfit-bold',
                  color: Colors.WHITE,
                }}
              >
                {selectedPlace.name}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.WHITE,
                  marginTop: 4,
                }}
                numberOfLines={2}
              >
                {selectedPlace.address}
              </Text>
            </View>
          </ImageBackground>

          <View style={{ padding: 16, backgroundColor: '#FAFAFA', gap: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontFamily: 'outfit', color: Colors.GRAY }}>
                OpenStreetMap
              </Text>
            </View>

            {!!selectedPlace.url && (
              <TouchableOpacity
                onPress={() => Linking.openURL(selectedPlace.url)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="navigate-circle" size={20} color={Colors.PRIMARY} />
                <Text
                  style={{
                    fontFamily: 'outfit-medium',
                    color: Colors.PRIMARY,
                    textDecorationLine: 'underline',
                  }}
                >
                  OpenStreetMap'te Görüntüle
                </Text>
              </TouchableOpacity>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={{
                marginTop: 10,
                padding: 15,
                backgroundColor: Colors.PRIMARY,
                borderRadius: 15,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handlePlaceSelection}
            >
              <Text
                style={{
                  color: Colors.WHITE,
                  fontSize: 16,
                  fontFamily: 'outfit-medium',
                  marginRight: 10,
                }}
              >
                Devam Et
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}