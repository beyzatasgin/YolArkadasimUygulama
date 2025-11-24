import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CreateTripContext } from '../../context/CreateTripContext';

export default function ReviewTrip() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: 'Seyahati İncele',
      headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, router]);

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

  // İlgi alanları etiketleri
  const getInterestLabel = (interestId) => {
    const labels = {
      culture: 'Kültür',
      nature: 'Doğa',
      adventure: 'Macera',
      food: 'Yemek',
      shopping: 'Alışveriş',
      nightlife: 'Gece Hayatı',
      beach: 'Plaj',
      history: 'Tarih',
    };
    return labels[interestId] || interestId;
  };

  // Devam et - Trip Details sayfasına git
  const handleContinue = () => {
    if (!tripData?.selectedPlace) {
      Alert.alert('Hata', 'Lütfen bir yer seçin');
      router.push('/create-trip/search-place');
      return;
    }

    if (!tripData?.startDate || !tripData?.endDate) {
      Alert.alert('Hata', 'Lütfen seyahat tarihlerini seçin');
      router.push('/create-trip/select-date');
      return;
    }

    if (!tripData?.budget) {
      Alert.alert('Hata', 'Lütfen bir bütçe seçin');
      router.push('/create-trip/select-budget');
      return;
    }

    router.push('/create-trip/trip-details');
  };

  // Düzenle butonları
  const handleEditPlace = () => {
    router.push('/create-trip/search-place');
  };

  const handleEditDate = () => {
    router.push('/create-trip/select-date');
  };

  const handleEditBudget = () => {
    router.push('/create-trip/select-budget');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Seyahatinizi Gözden Geçirin</Text>
        <Text style={styles.subtitle}>
          Tüm bilgilerinizi kontrol edin ve gerekirse düzenleyin
        </Text>

        {/* Yer Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="location" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>Yer</Text>
            </View>
            <TouchableOpacity onPress={handleEditPlace} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={Colors.PRIMARY} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          {tripData?.selectedPlace ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{tripData.selectedPlace.name}</Text>
              <Text style={styles.infoSubtitle}>{tripData.selectedPlace.address}</Text>
              {tripData.selectedPlace.url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(tripData.selectedPlace.url)}
                  style={styles.linkButton}
                >
                  <Ionicons name="open-outline" size={16} color={Colors.PRIMARY} />
                  <Text style={styles.linkText}>Haritada Görüntüle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Yer seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Tarih Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="calendar" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>Tarih</Text>
            </View>
            <TouchableOpacity onPress={handleEditDate} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={Colors.PRIMARY} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          {tripData?.startDate && tripData?.endDate ? (
            <View style={styles.infoCard}>
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Başlangıç</Text>
                  <Text style={styles.dateValue}>{formatDate(tripData.startDate)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Colors.GRAY} />
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Bitiş</Text>
                  <Text style={styles.dateValue}>{formatDate(tripData.endDate)}</Text>
                </View>
              </View>
              {tripData.duration && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={16} color={Colors.PRIMARY} />
                  <Text style={styles.durationText}>{tripData.duration} gün</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Tarih seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Bütçe Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="wallet" size={24} color={Colors.PRIMARY} />
              <Text style={styles.sectionTitle}>Bütçe</Text>
            </View>
            <TouchableOpacity onPress={handleEditBudget} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={Colors.PRIMARY} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          {tripData?.budget ? (
            <View style={styles.infoCard}>
              <Text style={styles.budgetAmount}>{formatBudget(tripData.budget)}</Text>
              {tripData.duration && (
                <Text style={styles.budgetPerDay}>
                  Günlük: {formatBudget(Math.round(tripData.budget / tripData.duration))}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Bütçe seçilmedi</Text>
            </View>
          )}
        </View>

        {/* Özet Kartı */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Seyahat Özeti</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="location-outline" size={18} color={Colors.GRAY} />
            <Text style={styles.summaryText}>
              {tripData?.selectedPlace?.name || 'Yer seçilmedi'}
            </Text>
          </View>
          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.GRAY} />
              <Text style={styles.summaryText}>
                {formatDate(tripData.startDate)} - {formatDate(tripData.endDate)}
              </Text>
            </View>
          )}
          {tripData?.duration && (
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={18} color={Colors.GRAY} />
              <Text style={styles.summaryText}>{tripData.duration} gün seyahat</Text>
            </View>
          )}
          {tripData?.budget && (
            <View style={styles.summaryRow}>
              <Ionicons name="wallet-outline" size={18} color={Colors.GRAY} />
              <Text style={styles.summaryText}>{formatBudget(tripData.budget)} bütçe</Text>
            </View>
          )}
        </View>

        {/* AI Generate Butonu */}
        <TouchableOpacity
          style={[
            styles.aiButton,
            (!tripData?.selectedPlace || !tripData?.startDate || !tripData?.budget) &&
              styles.aiButtonDisabled,
          ]}
          onPress={() => router.push('/create-trip/generate-ai-trip')}
          disabled={!tripData?.selectedPlace || !tripData?.startDate || !tripData?.budget}
        >
          <Ionicons name="sparkles" size={24} color={Colors.WHITE} />
          <Text style={styles.aiButtonText}>AI ile Plan Oluştur</Text>
        </TouchableOpacity>

        {/* Devam Et Butonu */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!tripData?.selectedPlace || !tripData?.startDate || !tripData?.budget) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!tripData?.selectedPlace || !tripData?.startDate || !tripData?.budget}
        >
          <Text style={styles.continueButtonText}>Detayları Tamamla</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.WHITE} />
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
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.PRIMARY,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
    textDecorationLine: 'underline',
  },
  emptyCard: {
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: '#991B1B',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 16,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 14,
    fontFamily: 'outfit-medium',
    color: Colors.PRIMARY,
  },
  budgetAmount: {
    fontSize: 28,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    marginBottom: 5,
  },
  budgetPerDay: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: Colors.GRAY,
  },
  summaryCard: {
    backgroundColor: '#F0F9FF',
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'outfit-bold',
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'outfit',
    color: Colors.GRAY,
    flex: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 30,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.GRAY,
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'outfit-medium',
    color: Colors.WHITE,
    marginRight: 10,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 15,
    gap: 10,
  },
  aiButtonDisabled: {
    backgroundColor: Colors.GRAY,
    opacity: 0.5,
  },
  aiButtonText: {
    fontSize: 18,
    fontFamily: 'outfit-medium',
    color: Colors.WHITE,
  },
});

