import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { auth, db } from '../../configs/FirebaseConfig';
import { CreateTripContext } from '../../context/CreateTripContext';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

export default function TripDetails() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const [travelers, setTravelers] = useState(tripData?.travelers || 1);
  const [tripName, setTripName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // İlgi alanları seçenekleri
  const interestOptions = [
    { id: 'culture', label: 'Kültür', icon: 'library-outline' },
    { id: 'nature', label: 'Doğa', icon: 'leaf-outline' },
    { id: 'adventure', label: 'Macera', icon: 'bicycle-outline' },
    { id: 'food', label: 'Yemek', icon: 'restaurant-outline' },
    { id: 'shopping', label: 'Alışveriş', icon: 'bag-outline' },
    { id: 'nightlife', label: 'Gece Hayatı', icon: 'wine-outline' },
    { id: 'beach', label: 'Plaj', icon: 'sunny-outline' },
    { id: 'history', label: 'Tarih', icon: 'book-outline' },
  ];

  const [selectedInterests, setSelectedInterests] = useState(tripData?.interests || []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: 'Seyahat Detayları',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  // Kaydedildiğinde otomatik yönlendirme
  useEffect(() => {
    if (saved) {
      console.log('✅ Trip saved, redirecting to My Trips in 1.5 seconds...');
      const timer = setTimeout(async () => {
        console.log('🔄 Starting navigation to My Trips...');
        
        // Async navigation - expo-router router.replace Promise döndürebilir
        try {
          // İlk deneme: tabs path ile (await ile)
          await router.replace('/(tabs)/mytrip');
          console.log('✅ Navigation successful with /(tabs)/mytrip');
        } catch (error) {
          console.warn('⚠️ First navigation attempt failed:', error);
          console.log('🔄 Trying alternative path: /mytrip');
          
          try {
            // İkinci deneme: basit path ile (sign-in ve sign-up'da kullanılan)
            await router.replace('/mytrip');
            console.log('✅ Navigation successful with /mytrip');
          } catch (error2) {
            console.warn('⚠️ Second navigation attempt failed:', error2);
            console.log('🔄 Trying push method...');
            
            try {
              // Üçüncü deneme: push ile
              await router.push('/(tabs)/mytrip');
              console.log('✅ Navigation successful with push');
            } catch (error3) {
              console.error('❌ All navigation attempts failed:', error3);
              // Son çare: Ana sayfaya git (kullanıcı logged in ise oradan mytrip'e yönlendirilecek)
              try {
                await router.replace('/');
              } catch (finalError) {
                console.error('❌ Final navigation attempt failed:', finalError);
                // Alert göster
                Alert.alert(
                  'Başarılı',
                  'Seyahatiniz kaydedildi. Lütfen manuel olarak Seyahatlerim sayfasına gidin.',
                  [
                    {
                      text: 'Tamam',
                      onPress: () => {
                        // Kullanıcı manuel olarak gidebilir
                      },
                    },
                  ]
                );
              }
            }
          }
        }
      }, 1500);

      return () => {
        clearTimeout(timer);
        console.log('🧹 Navigation timer cleared');
      };
    }
  }, [saved, router]);

  // İlgi alanı seç/kaldır
  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interestId)) {
        return prev.filter((id) => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  // Yolcu sayısı artır/azalt
  const adjustTravelers = (delta) => {
    const newValue = travelers + delta;
    if (newValue >= 1 && newValue <= 20) {
      setTravelers(newValue);
    }
  };

  // Tarih formatı
  const formatDate = (date) => {
    if (!date) return 'Seçilmedi';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Bütçe formatı
  const formatBudget = (amount) => {
    if (!amount) return 'Seçilmedi';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Seyahati kaydet
  const handleSaveTrip = async () => {
    if (!auth.currentUser) {
      Alert.alert('Hata', 'Lütfen giriş yapın');
      return;
    }

    if (!tripData?.selectedPlace) {
      Alert.alert('Hata', 'Lütfen bir yer seçin');
      return;
    }

    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert('Hata', 'Lütfen seyahat tarihlerini seçin');
      return;
    }

    setSaving(true);
    setSaved(false);
    
    try {
      if (!db) {
        throw new Error('Firestore başlatılamadı');
      }

      // Tarihleri Firestore Timestamp'e dönüştür
      const startDate = tripData.startDate instanceof Date 
        ? tripData.startDate 
        : new Date(tripData.startDate);
      const endDate = tripData.endDate instanceof Date 
        ? tripData.endDate 
        : new Date(tripData.endDate);

      // Firestore Timestamp'e dönüştür
      const startDateTimestamp = Timestamp.fromDate(startDate);
      const endDateTimestamp = Timestamp.fromDate(endDate);

      // Seyahat verilerini hazırla
      const tripToSave = {
        userId: auth.currentUser.uid,
        tripName: tripName.trim() || `${tripData.selectedPlace.name} Seyahati`,
        selectedPlace: {
          name: tripData.selectedPlace.name,
          address: tripData.selectedPlace.address,
          coordinates: tripData.selectedPlace.coordinates,
          url: tripData.selectedPlace.url,
          photoUrl: tripData.selectedPlace.photoUrl || null, // Place görseli
        },
        startDate: startDateTimestamp,
        endDate: endDateTimestamp,
        duration: tripData.duration,
        travelers,
        budget: tripData.budget,
        interests: selectedInterests,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Firebase Firestore'a kaydet
      console.log('💾 Saving trip to Firestore...', tripToSave);
      const tripsRef = collection(db, 'trips');
      const docRef = await addDoc(tripsRef, tripToSave);
      console.log('✅ Trip saved successfully to Firestore with ID:', docRef.id);
      console.log('📝 Doc ref:', docRef);

      // Context'i temizle
      setTripData({
        selectedPlace: null,
        startDate: null,
        endDate: null,
        duration: null,
        travelers: 1,
        budget: null,
        interests: [],
        accommodation: null,
        transportation: null,
      });

      // Başarılı durumu göster - useEffect ile otomatik yönlendirme yapılacak
      console.log('🎉 Setting saved state to true...');
      setSaving(false);
      setSaved(true);
      console.log('✅ Saved state updated, useEffect should trigger navigation');
    } catch (error) {
      console.error('❌ Trip save error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // State'leri sıfırla
      setSaving(false);
      setSaved(false);
      
      // Kullanıcıya hata mesajı göster
      const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
      Alert.alert(
        'Kayıt Hatası',
        `Seyahat kaydedilirken bir hata oluştu:\n\n${errorMessage}\n\nLütfen tekrar deneyin.`,
        [{ text: 'Tamam' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Seyahat Detayları</Text>
        <Text style={styles.subtitle}>
          Seyahatinizi kişiselleştirin ve kaydedin
        </Text>

        {/* Seyahat Özeti */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seyahat Özeti</Text>
          
          <View style={styles.summaryRow}>
            <Ionicons name="location" size={20} color={Colors.PRIMARY} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Yer</Text>
              <Text style={styles.summaryValue}>
                {tripData?.selectedPlace?.name || 'Seçilmedi'}
              </Text>
            </View>
          </View>

          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar" size={20} color={Colors.PRIMARY} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Tarih</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(tripData.startDate)} - {formatDate(tripData.endDate)}
                </Text>
              </View>
            </View>
          )}

          {tripData?.duration && (
            <View style={styles.summaryRow}>
              <Ionicons name="time" size={20} color={Colors.PRIMARY} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Süre</Text>
                <Text style={styles.summaryValue}>{tripData.duration} gün</Text>
              </View>
            </View>
          )}

          {tripData?.budget && (
            <View style={styles.summaryRow}>
              <Ionicons name="wallet" size={20} color={Colors.PRIMARY} />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Bütçe</Text>
                <Text style={styles.summaryValue}>{formatBudget(tripData.budget)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seyahat Adı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seyahat Adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: İstanbul Macerası"
            placeholderTextColor={Colors.GRAY}
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        {/* Yolcu Sayısı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yolcu Sayısı</Text>
          <View style={styles.travelersContainer}>
            <TouchableOpacity
              style={styles.travelerButton}
              onPress={() => adjustTravelers(-1)}
              disabled={travelers <= 1}
            >
              <Ionicons
                name="remove-circle-outline"
                size={28}
                color={travelers <= 1 ? Colors.GRAY : Colors.PRIMARY}
              />
            </TouchableOpacity>
            <Text style={styles.travelerCount}>{travelers}</Text>
            <TouchableOpacity
              style={styles.travelerButton}
              onPress={() => adjustTravelers(1)}
              disabled={travelers >= 20}
            >
              <Ionicons
                name="add-circle-outline"
                size={28}
                color={travelers >= 20 ? Colors.GRAY : Colors.PRIMARY}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* İlgi Alanları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İlgi Alanları</Text>
          <Text style={styles.sectionSubtitle}>
            Seyahatinizde ne yapmak istersiniz? (Birden fazla seçebilirsiniz)
          </Text>
          <View style={styles.interestsGrid}>
            {interestOptions.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestCard,
                    isSelected && styles.interestCardSelected,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                >
                  <Ionicons
                    name={interest.icon}
                    size={24}
                    color={isSelected ? Colors.WHITE : Colors.PRIMARY}
                  />
                  <Text
                    style={[
                      styles.interestLabel,
                      isSelected && styles.interestLabelSelected,
                    ]}
                  >
                    {interest.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Seyahatinizle ilgili özel notlarınızı buraya yazabilirsiniz..."
            placeholderTextColor={Colors.GRAY}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving || saved) && styles.saveButtonDisabled,
            saved && styles.saveButtonSuccess,
          ]}
          onPress={handleSaveTrip}
          disabled={saving || saved}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color={Colors.WHITE} style={{ marginRight: 10 }} />
              <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
            </>
          ) : saved ? (
            <>
              <Ionicons name="checkmark-circle" size={24} color={Colors.WHITE} />
              <Text style={styles.saveButtonText}>Kaydedildi ✓</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={Colors.WHITE} />
              <Text style={styles.saveButtonText}>Seyahati Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Anasayfaya Dön Butonu */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            router.replace('/(tabs)/mytrip');
          }}
        >
          <Ionicons name="home-outline" size={24} color={Colors.PRIMARY} />
          <Text style={styles.homeButtonText}>Anasayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  content: {
    padding: 25,
    paddingTop: 75,
  },
  title: {
    fontSize: 28,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryContent: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 12,
    backgroundColor: Colors.WHITE,
    fontSize: 16,
    fontFamily: 'outfit',
    color: Colors.PRIMARY,
  },
  notesInput: {
    height: 100,
    paddingTop: 15,
  },
  travelersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
  },
  travelerButton: {
    padding: 5,
  },
  travelerCount: {
    fontSize: 32,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    minWidth: 50,
    textAlign: 'center',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestCard: {
    width: '47%',
    padding: 15,
    borderWidth: 2,
    borderColor: Colors.GRAY,
    borderRadius: 12,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    position: 'relative',
    minHeight: 100,
  },
  interestCardSelected: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  interestLabel: {
    fontSize: 14,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
    marginTop: 8,
  },
  interestLabelSelected: {
    color: Colors.WHITE,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 30,
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.8,
  },
  saveButtonSuccess: {
    backgroundColor: '#10B981', // Yeşil renk
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: 'outfit-medium',
    color: Colors.WHITE,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: Colors.WHITE,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 30,
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  homeButtonText: {
    fontSize: 18,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
  },
});

