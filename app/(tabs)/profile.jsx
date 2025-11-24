import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reload, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db, storage } from '../../configs/FirebaseConfig';
import { Colors } from '../../constants/Colors';

const quickActions = [
  { icon: 'airplane', title: 'Yaklaşan Seyahatler', subtitle: 'Planlanan yolculuklarınızı görün', target: '/mytrip' },
  { icon: 'heart', title: 'Kaydedilen Yerler', subtitle: 'Beğendiğiniz yerler', target: '/saved-places' },
  { icon: 'shield-checkmark', title: 'Gizlilik', subtitle: 'Güvenlik ve izinler', target: '/privacy' },
];

export default function Profile() {
  const navigation = useNavigation();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '');
  const [photoUri, setPhotoUri] = useState(
    auth.currentUser?.photoURL || null, // Boş fotoğraf için null
  );
  const [localPhotoUri, setLocalPhotoUri] = useState(null); // Seçilen ama henüz yüklenmemiş fotoğraf
  const [pickingImage, setPickingImage] = useState(false);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Yaklaşan seyahatleri çek
  useEffect(() => {
    if (!auth.currentUser || !db) {
      setLoadingTrips(false);
      return;
    }

    const tripsRef = collection(db, 'trips');
    // Firestore'da tarih karşılaştırması için Timestamp kullanıyoruz
    // Önce userId'ye göre filtrele, sonra client-side'da tarih kontrolü yap
    const q = query(
      tripsRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('startDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const trips = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
          
          // Sadece gelecekteki seyahatleri al
          if (startDate >= today) {
            trips.push({
              id: doc.id,
              ...data,
              startDate,
              endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
            });
          }
        });
        
        // En yakın 3 seyahati al
        setUpcomingTrips(trips.slice(0, 3));
        setLoadingTrips(false);
      },
      (error) => {
        console.error('Error fetching upcoming trips:', error);
        setLoadingTrips(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Kullanıcı bilgilerini güncelle
  useEffect(() => {
    const updateUserInfo = () => {
      if (auth.currentUser) {
        setFullName(auth.currentUser.displayName || '');
        setPhotoUri(auth.currentUser.photoURL || null); // Boş fotoğraf için null
      }
    };

    // İlk yüklemede güncelle
    updateUserInfo();

    // Auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFullName(user.displayName || '');
        setPhotoUri(user.photoURL || null); // Boş fotoğraf için null
      }
    });

    return () => unsubscribe();
  }, []);

  const handleActionPress = (item) => {
    if (item.target) {
      router.push(item.target);
      return;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (_error) {
      Alert.alert('Hata', 'Şu anda çıkış yapılamıyor.');
    }
  };

  // Fotoğrafı Firebase Storage'a yükle
  const uploadPhotoToStorage = async (uri) => {
    if (!auth.currentUser) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }

    if (!storage) {
      throw new Error('Firebase Storage başlatılamadı');
    }

    try {
      console.log('Fotoğraf yükleniyor:', uri);
      
      // React Native için fetch ile blob oluştur
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Fotoğraf okunamadı: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Blob oluşturuldu, boyut:', blob.size);

      // Storage referansı oluştur
      const timestamp = Date.now();
      const photoRef = ref(storage, `profile-photos/${auth.currentUser.uid}/${timestamp}.jpg`);

      // Fotoğrafı yükle
      console.log('Storage\'a yükleniyor...');
      await uploadBytes(photoRef, blob);
      console.log('Yükleme tamamlandı');

      // Download URL'ini al
      const downloadURL = await getDownloadURL(photoRef);
      console.log('Download URL alındı:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Photo upload error:', error);
      const errorMessage = error.message || 'Fotoğraf yüklenirken bilinmeyen bir hata oluştu';
      throw new Error(errorMessage);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Doğrulama', 'Lütfen adınızı girin.');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    setSaving(true);
    try {
      let finalPhotoURL = photoUri;

      // Eğer yeni bir fotoğraf seçildiyse, önce Storage'a yükle
      // localPhotoUri varsa ve http/https ile başlamıyorsa (yani local bir dosya ise) yükle
      const hasNewPhoto = localPhotoUri && 
                          localPhotoUri !== photoUri && 
                          !localPhotoUri.startsWith('http://') &&
                          !localPhotoUri.startsWith('https://');
      
      if (hasNewPhoto) {
        if (!storage) {
          Alert.alert('Hata', 'Firebase Storage başlatılamadı. Fotoğraf yüklenemedi, ancak isim güncellenebilir.');
          // Storage yoksa sadece ismi güncelle, fotoğrafı atla
        } else {
          setUploadingPhoto(true);
          try {
            console.log('Yeni fotoğraf yükleniyor...');
            finalPhotoURL = await uploadPhotoToStorage(localPhotoUri);
            setPhotoUri(finalPhotoURL);
            setLocalPhotoUri(null);
            console.log('Fotoğraf başarıyla yüklendi:', finalPhotoURL);
          } catch (error) {
            console.error('Fotoğraf yükleme hatası:', error);
            const errorMsg = error.message || 'Fotoğraf yüklenirken bir hata oluştu';
            Alert.alert('Fotoğraf Yükleme Hatası', errorMsg + '\n\nİsim güncellenebilir, ancak fotoğraf yüklenemedi.');
            // Fotoğraf yüklenemese bile ismi güncellemeye devam et
            finalPhotoURL = photoUri; // Eski fotoğrafı koru
          } finally {
            setUploadingPhoto(false);
          }
        }
      }

      // Profil bilgilerini güncelle
      console.log('Profil güncelleniyor...', { 
        displayName: trimmedName, 
        photoURL: finalPhotoURL,
        hasNewPhoto: hasNewPhoto 
      });
      
      // Profil güncelleme verilerini hazırla
      const updateData = { displayName: trimmedName };
      
      // Fotoğraf URL'ini ekle (yeni yüklenen veya mevcut)
      if (finalPhotoURL) {
        updateData.photoURL = finalPhotoURL;
      }
      
      console.log('updateProfile çağrılıyor:', updateData);
      await updateProfile(auth.currentUser, updateData);
      
      // Kullanıcı bilgilerini yeniden yükle
      try {
        await reload(auth.currentUser);
        console.log('Kullanıcı bilgileri yenilendi');
      } catch (reloadError) {
        console.warn('Kullanıcı bilgileri yenilenemedi:', reloadError);
        // Bu kritik değil, devam et
      }

      // State'i güncelle
      setFullName(trimmedName);
      setPhotoUri(finalPhotoURL);
      setEditing(false);
      Alert.alert('Başarılı', 'Profil başarıyla güncellendi.');
    } catch (error) {
      console.error('Profile update error:', error);
      const errorCode = error.code || 'unknown';
      const errorMessage = error.message || 'Profil güncellenirken bir hata oluştu';
      
      let userMessage = 'Profil güncellenirken bir hata oluştu.';
      if (errorCode === 'auth/requires-recent-login') {
        userMessage = 'Güvenlik nedeniyle lütfen tekrar giriş yapın.';
      } else if (errorMessage.includes('network')) {
        userMessage = 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Hata', userMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = async () => {
    setPickingImage(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', 'Lütfen fotoğraf kütüphanenize erişim izni verin.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setLocalPhotoUri(selectedUri);
        setPhotoUri(selectedUri); // Önizleme için
      }
    } catch (_error) {
      Alert.alert('Hata', 'Fotoğraf kütüphanesi açılamadı.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    setChangingPassword(true);
    try {
      // Mevcut şifreyi doğrula
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Şifreyi güncelle
      await updatePassword(auth.currentUser, newPassword);

      // Başarılı
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      let errorMessage = 'Şifre değiştirilirken bir hata oluştu.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mevcut şifre yanlış.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Yeni şifre çok zayıf. Daha güçlü bir şifre seçin.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Güvenlik nedeniyle lütfen tekrar giriş yapın.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
      setChangingPassword(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={{ padding: 25, paddingTop: 60 }}>
        <Text style={{ fontFamily: 'outfit-bold', fontSize: 32, color: Colors.PRIMARY }}>
          Profil
        </Text>
        <Text style={{ fontFamily: 'outfit', color: Colors.GRAY, marginTop: 8 }}>
          Hesap ve tercihlerinizi yönetin
        </Text>

        <View
          style={{
            marginTop: 30,
            alignItems: 'center',
            gap: 12,
            padding: 24,
            borderRadius: 20,
            backgroundColor: '#F5F7FB',
          }}
        >
          <View style={{ position: 'relative' }}>
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.PRIMARY }}
              />
            ) : (
              <View style={{ 
                width: 90, 
                height: 90, 
                borderRadius: 45, 
                borderWidth: 3, 
                borderColor: Colors.PRIMARY,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="person" size={40} color={Colors.GRAY} />
              </View>
            )}
            {editing && (
              <TouchableOpacity
                onPress={handlePickImage}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: Colors.PRIMARY,
                  borderRadius: 20,
                  width: 32,
                  height: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: Colors.WHITE,
                }}
                disabled={pickingImage || uploadingPhoto}
              >
                {pickingImage || uploadingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.WHITE} />
                ) : (
                  <Ionicons name="camera" size={18} color={Colors.WHITE} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, marginTop: 8 }}>
            {editing ? 'Adınızı güncelleyin' : auth.currentUser?.displayName || 'Kullanıcı'}
          </Text>
          {editing ? (
            <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adınız"
                placeholderTextColor={Colors.GRAY}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.GRAY,
                  fontFamily: 'outfit',
                  backgroundColor: Colors.WHITE,
                }}
              />
              <TouchableOpacity
                onPress={handlePickImage}
                style={{
                  width: '100%',
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.PRIMARY,
                  alignItems: 'center',
                  backgroundColor: Colors.WHITE,
                }}
                disabled={pickingImage || uploadingPhoto}
              >
                {pickingImage || uploadingPhoto ? (
                  <ActivityIndicator color={Colors.PRIMARY} />
                ) : (
                  <Text style={{ color: Colors.PRIMARY, fontFamily: 'outfit-medium' }}>
                    Fotoğraf Değiştir
                  </Text>
                )}
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: Colors.PRIMARY,
                    alignItems: 'center',
                  }}
                  disabled={saving || uploadingPhoto}
                >
                  {saving || uploadingPhoto ? (
                    <ActivityIndicator color={Colors.WHITE} />
                  ) : (
                    <Text style={{ color: Colors.WHITE, fontFamily: 'outfit-medium' }}>
                      {uploadingPhoto ? 'Yükleniyor...' : 'Kaydet'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(false);
                    setLocalPhotoUri(null);
                    // Orijinal fotoğrafı geri yükle
                    if (auth.currentUser?.photoURL) {
                      setPhotoUri(auth.currentUser.photoURL);
                    } else {
                      setPhotoUri(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.GRAY,
                    alignItems: 'center',
                    backgroundColor: Colors.WHITE,
                  }}
                  disabled={saving || uploadingPhoto}
                >
                  <Text style={{ color: Colors.GRAY, fontFamily: 'outfit-medium' }}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={{ fontFamily: 'outfit', color: Colors.GRAY }}>
                {auth.currentUser?.email || 'kullanici@example.com'}
              </Text>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 30,
                  backgroundColor: Colors.PRIMARY,
                  marginTop: 8,
                }}
                onPress={() => {
                  setEditing(true);
                  setFullName(auth.currentUser?.displayName || '');
                }}
              >
                <Text style={{ color: Colors.WHITE, fontFamily: 'outfit-medium' }}>
                  Profili Düzenle
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Şifre Değiştirme Bölümü - Bağımsız */}
        <View style={{ 
          marginTop: 30, 
          padding: 20, 
          borderRadius: 16, 
          backgroundColor: '#F8F9FA',
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 18, color: Colors.PRIMARY, marginBottom: 15 }}>
            Şifre Değiştir
          </Text>
          
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Mevcut Şifre"
            placeholderTextColor={Colors.GRAY}
            secureTextEntry
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors.GRAY,
              fontFamily: 'outfit',
              backgroundColor: Colors.WHITE,
              marginBottom: 12,
            }}
          />
          
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Yeni Şifre"
            placeholderTextColor={Colors.GRAY}
            secureTextEntry
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors.GRAY,
              fontFamily: 'outfit',
              backgroundColor: Colors.WHITE,
              marginBottom: 12,
            }}
          />
          
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Yeni Şifre (Tekrar)"
            placeholderTextColor={Colors.GRAY}
            secureTextEntry
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors.GRAY,
              fontFamily: 'outfit',
              backgroundColor: Colors.WHITE,
              marginBottom: 12,
            }}
          />

          <TouchableOpacity
            onPress={handleChangePassword}
            style={{
              width: '100%',
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: Colors.PRIMARY,
              alignItems: 'center',
            }}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <ActivityIndicator color={Colors.WHITE} />
            ) : (
              <Text style={{ color: Colors.WHITE, fontFamily: 'outfit-medium', fontSize: 16 }}>
                Şifreyi Değiştir
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Yaklaşan Seyahatler Özeti */}
        {upcomingTrips.length > 0 && (
          <View style={{ marginTop: 30, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontFamily: 'outfit-bold', fontSize: 20, color: Colors.PRIMARY }}>
                Yaklaşan Seyahatler
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/mytrip')}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 14, color: Colors.PRIMARY }}>
                  Tümünü Gör
                </Text>
              </TouchableOpacity>
            </View>
            {upcomingTrips.map((trip) => {
              const formatDate = (date) => {
                if (!date) return '';
                const dateObj = date instanceof Date ? date : new Date(date);
                return dateObj.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                });
              };
              return (
                <TouchableOpacity
                  key={trip.id}
                  onPress={() => router.push('/(tabs)/mytrip')}
                  style={{
                    backgroundColor: '#F8F9FA',
                    padding: 15,
                    borderRadius: 12,
                    marginBottom: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: Colors.PRIMARY,
                  }}
                >
                  <Text style={{ fontFamily: 'outfit-bold', fontSize: 16, color: Colors.PRIMARY, marginBottom: 5 }}>
                    {trip.tripName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Ionicons name="location" size={14} color={Colors.GRAY} />
                    <Text style={{ fontFamily: 'outfit', fontSize: 12, color: Colors.GRAY, marginLeft: 5 }}>
                      {trip.selectedPlace?.name}
                    </Text>
                  </View>
                  {trip.startDate && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.GRAY} />
                      <Text style={{ fontFamily: 'outfit', fontSize: 12, color: Colors.GRAY, marginLeft: 5 }}>
                        {formatDate(trip.startDate)}
                        {trip.duration && ` • ${trip.duration} gün`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 30, gap: 12 }}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              onPress={() => handleActionPress(item)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 18,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Ionicons name={item.icon} size={22} color={Colors.PRIMARY} />
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                  {item.title}
                </Text>
                <Text style={{ fontFamily: 'outfit', color: Colors.GRAY, marginTop: 4 }}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.GRAY}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            marginTop: 30,
            padding: 16,
            borderRadius: 16,
            backgroundColor: '#FEE2E2',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
          <Text style={{ fontFamily: 'outfit-medium', color: '#B91C1C' }}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}