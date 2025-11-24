import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../configs/FirebaseConfig';
import { Colors } from '../constants/Colors';

export default function Privacy() {
  const navigation = useNavigation();
  const router = useRouter();
  const [dataSharing, setDataSharing] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [locationTracking, setLocationTracking] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: 'Gizlilik ve Güvenlik',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword.trim()) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    setDeleting(true);

    try {
      // Kullanıcıyı yeniden doğrula
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        deleteAccountPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Kullanıcının tüm seyahatlerini sil
      const tripsRef = collection(db, 'trips');
      const q = query(tripsRef, where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, 'trips', docSnapshot.id)));
      });

      await Promise.all(deletePromises);
      console.log('Kullanıcının seyahatleri silindi');

      // Hesabı sil
      await deleteUser(auth.currentUser);
      
      Alert.alert(
        'Hesap Silindi',
        'Hesabınız ve tüm verileriniz başarıyla silindi.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              router.replace('/');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Hesap silme hatası:', error);
      let errorMessage = 'Hesap silinirken bir hata oluştu.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre yanlış. Lütfen doğru şifrenizi girin.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Güvenlik nedeniyle lütfen tekrar giriş yapın ve tekrar deneyin.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setDeleting(false);
      setDeleteAccountPassword('');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.WHITE }}>
      <View style={{ padding: 25, paddingTop: 75 }}>
        {/* Güvenlik Ayarları */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 22, color: Colors.PRIMARY, marginBottom: 20 }}>
            Güvenlik Ayarları
          </Text>

          <View
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Ionicons name="lock-closed" size={24} color={Colors.PRIMARY} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                  Hesap Güvenliği
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY, marginTop: 4 }}>
                  {auth.currentUser?.email || 'E-posta adresi'}
                </Text>
              </View>
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: '#E5E7EB',
                marginVertical: 15,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 14, color: Colors.PRIMARY }}>
                  İki Faktörlü Doğrulama
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 12, color: Colors.GRAY, marginTop: 4 }}>
                  Yakında kullanılabilir olacak
                </Text>
              </View>
              <Switch
                value={false}
                disabled
                trackColor={{ false: '#D1D5DB', true: Colors.PRIMARY }}
                thumbColor={Colors.WHITE}
              />
            </View>
          </View>
        </View>

        {/* Veri ve Gizlilik */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 22, color: Colors.PRIMARY, marginBottom: 20 }}>
            Veri ve Gizlilik
          </Text>

          <View
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY, marginBottom: 4 }}>
                  Veri Paylaşımı
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY }}>
                  Geliştirme ve iyileştirme için anonim veri paylaşımı
                </Text>
              </View>
              <Switch
                value={dataSharing}
                onValueChange={setDataSharing}
                trackColor={{ false: '#D1D5DB', true: Colors.PRIMARY }}
                thumbColor={Colors.WHITE}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: '#E5E7EB',
                marginVertical: 15,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY, marginBottom: 4 }}>
                  Analitik
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY }}>
                  Uygulama kullanım istatistikleri
                </Text>
              </View>
              <Switch
                value={analytics}
                onValueChange={setAnalytics}
                trackColor={{ false: '#D1D5DB', true: Colors.PRIMARY }}
                thumbColor={Colors.WHITE}
              />
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: '#E5E7EB',
                marginVertical: 15,
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY, marginBottom: 4 }}>
                  Konum Takibi
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY }}>
                  Seyahat önerileri için konum kullanımı
                </Text>
              </View>
              <Switch
                value={locationTracking}
                onValueChange={setLocationTracking}
                trackColor={{ false: '#D1D5DB', true: Colors.PRIMARY }}
                thumbColor={Colors.WHITE}
              />
            </View>
          </View>
        </View>

        {/* Veri Yönetimi */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 22, color: Colors.PRIMARY, marginBottom: 20 }}>
            Veri Yönetimi
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert(
                'Veri İndirme',
                'Tüm verilerinizi indirmek için e-posta adresinize bir bağlantı göndereceğiz. Bu özellik yakında kullanılabilir olacak.',
                [{ text: 'Tamam' }]
              );
            }}
          >
            <Ionicons name="download-outline" size={24} color={Colors.PRIMARY} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                Verilerimi İndir
              </Text>
              <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY, marginTop: 4 }}>
                Tüm verilerinizi bir kopyasını alın
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.GRAY} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert(
                'Veri Temizleme',
                'Tüm seyahat verilerinizi temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                [
                  { text: 'İptal', style: 'cancel' },
                  {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Bilgi', 'Bu özellik yakında kullanılabilir olacak.');
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                Verilerimi Temizle
              </Text>
              <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY, marginTop: 4 }}>
                Tüm seyahat verilerinizi silin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.GRAY} />
          </TouchableOpacity>
        </View>

        {/* Gizlilik Politikası */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 22, color: Colors.PRIMARY, marginBottom: 20 }}>
            Bilgilendirme
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert(
                'Gizlilik Politikası',
                'Gizlilik politikamız, kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar. Detaylı bilgi için web sitemizi ziyaret edebilirsiniz.',
                [{ text: 'Tamam' }]
              );
            }}
          >
            <Ionicons name="document-text-outline" size={24} color={Colors.PRIMARY} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                Gizlilik Politikası
              </Text>
              <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY, marginTop: 4 }}>
                Verilerinizin nasıl korunduğunu öğrenin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.GRAY} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 16,
              padding: 20,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => {
              Alert.alert(
                'Kullanım Koşulları',
                'Kullanım koşullarımız, uygulamayı kullanırken uymanız gereken kuralları ve haklarınızı açıklar.',
                [{ text: 'Tamam' }]
              );
            }}
          >
            <Ionicons name="document-outline" size={24} color={Colors.PRIMARY} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: Colors.PRIMARY }}>
                Kullanım Koşulları
              </Text>
              <Text style={{ fontFamily: 'outfit', fontSize: 13, color: Colors.GRAY, marginTop: 4 }}>
                Hizmet şartlarını okuyun
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.GRAY} />
          </TouchableOpacity>
        </View>

        {/* Hesap Silme */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontFamily: 'outfit-bold', fontSize: 22, color: '#EF4444', marginBottom: 20 }}>
            Tehlikeli Bölge
          </Text>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 16,
                padding: 20,
                borderWidth: 2,
                borderColor: '#EF4444',
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => {
                Alert.alert(
                  'Hesabı Sil',
                  'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Devam Et',
                      style: 'destructive',
                      onPress: () => setShowDeleteConfirm(true),
                    },
                  ]
                );
              }}
            >
              <Ionicons name="warning-outline" size={24} color="#EF4444" />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={{ fontFamily: 'outfit-medium', fontSize: 16, color: '#EF4444' }}>
                  Hesabı Sil
                </Text>
                <Text style={{ fontFamily: 'outfit', fontSize: 13, color: '#B91C1C', marginTop: 4 }}>
                  Tüm verileriniz kalıcı olarak silinecek
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 16,
                padding: 20,
                borderWidth: 2,
                borderColor: '#EF4444',
              }}
            >
              <Text style={{ fontFamily: 'outfit-bold', fontSize: 16, color: '#EF4444', marginBottom: 15 }}>
                Hesabı Silmek İstediğinizden Emin misiniz?
              </Text>
              <Text style={{ fontFamily: 'outfit', fontSize: 14, color: Colors.PRIMARY, marginBottom: 15 }}>
                Hesabınızı silmek için şifrenizi girin. Bu işlem geri alınamaz.
              </Text>
              <TextInput
                value={deleteAccountPassword}
                onChangeText={setDeleteAccountPassword}
                placeholder="Şifrenizi girin"
                placeholderTextColor={Colors.GRAY}
                secureTextEntry
                style={{
                  padding: 15,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#EF4444',
                  fontFamily: 'outfit',
                  backgroundColor: Colors.WHITE,
                  marginBottom: 15,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setDeleteAccountPassword('');
                  }}
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.GRAY,
                    backgroundColor: Colors.WHITE,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'outfit-medium', color: Colors.GRAY }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: 15,
                    borderRadius: 12,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'outfit-medium', color: Colors.WHITE }}>
                    {deleting ? 'Siliniyor...' : 'Hesabı Sil'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

