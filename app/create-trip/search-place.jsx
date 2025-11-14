import { useNavigation, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CreateTripContext } from './../../context/CreateTripContext';
export default function SearchPlace() {
  const navigation = useNavigation();
  const {tripData,setTripData}=useContext(CreateTripContext);
  const [googleKey, setGoogleKey] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: 'Search Place',
    });

    console.log(tripData);
    
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAP_KEY;
    if (apiKey && apiKey !== 'YOUR_API_KEY') {
      setGoogleKey(apiKey);
    }
  }, [tripData]);

  // 🔹 Yer arama (autocomplete)
  const searchPlaces = async (text) => {
    if (!googleKey || text.length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${googleKey}&language=tr&components=country:tr`
      );
      const data = await response.json();

      if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.log('Google Places API hatası:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    searchPlaces(text);
  };

  // 🔹 Seçilen yerin detaylarını çek
  const fetchPlaceDetails = async (placeId) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleKey}&language=tr&fields=name,geometry,url,photos,formatted_address`
      );
      const data = await response.json();

      if (data.result) {
        const place = data.result;
        const photoRef = place.photos?.[0]?.photo_reference || null;

        const photoUrl = photoRef
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${googleKey}`
          : null;

        const details = {
          name: place.name,
          address: place.formatted_address,
          coordinates: place.geometry?.location,
          url: place.url,
          photoUrl,
        };

        setSelectedPlace(details);
        console.log('📍 Detaylı yer bilgisi:', details);
      }
    } catch (error) {
      console.log('Yer detayları alınamadı:', error);
    }
  };

  const selectPlace = (prediction) => {
    setSearchText(prediction.description);
    setPredictions([]);
    fetchPlaceDetails(prediction.place_id);
  };

  // Seçilen yeri context'e kaydet ve tarih seçimine geç
  const handlePlaceSelection = () => {
    if (!selectedPlace) {
      Alert.alert('Hata', 'Lütfen bir yer seçin');
      return;
    }

    // Seyahat verilerini güncelle
    const updatedTripData = {
      ...tripData,
      selectedPlace: selectedPlace,
    };
    
    setTripData(updatedTripData);
    
    // Tarih seçim sayfasına geç
    router.push('/create-trip/select-date');
  };

  // 🔹 API key yoksa bilgilendirme
  if (!googleKey) {
    return (
      <View
        style={{
          padding: 25,
          paddingTop: 75,
          backgroundColor: Colors.WHITE,
          height: '100%',
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 20 }}>
          ⚠️ Google Places API Key Gerekli
        </Text>
        <Text style={{ fontSize: 14, color: Colors.GRAY, marginBottom: 20 }}>
          1. .env dosyasına EXPO_PUBLIC_GOOGLE_MAP_KEY=gerçek_anahtarınız ekleyin{'\n'}
          2. Google Cloud Console'da Places API ve Place Details API'yi etkinleştirin{'\n'}
          3. Sunucuyu yeniden başlatın: npm run start -- --clear
        </Text>
      </View>
    );
  }

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
                <Text style={{ fontSize: 16, color: Colors.PRIMARY }}>
                  {item.description}
                </Text>
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
            padding: 15,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: Colors.GRAY,
            backgroundColor: '#FAFAFA',
          }}
        >
          {selectedPlace.photoUrl && (
            <Image
              source={{ uri: selectedPlace.photoUrl }}
              style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 10 }}
              resizeMode="cover"
            />
          )}
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.PRIMARY }}>
            {selectedPlace.name}
          </Text>
          <Text style={{ fontSize: 14, marginTop: 5 }}>{selectedPlace.address}</Text>
          <Text style={{ fontSize: 12, color: 'blue', marginTop: 10 }}>
            {selectedPlace.url}
          </Text>
          
          {/* Continue Button */}
          <TouchableOpacity
            style={{
              marginTop: 20,
              padding: 15,
              backgroundColor: Colors.PRIMARY,
              borderRadius: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handlePlaceSelection}
          >
            <Text style={{
              color: Colors.WHITE,
              fontSize: 16,
              fontFamily: 'outfit-medium',
              marginRight: 10,
            }}>
              Continue
            </Text>
            <Text style={{ color: Colors.WHITE, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}