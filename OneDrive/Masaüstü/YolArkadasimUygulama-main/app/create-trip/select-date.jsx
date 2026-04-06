import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useContext, useLayoutEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DatePickerModal from "../../components/DatePickerModal";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function SelectDate() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/create-trip/search-place");
  }, [navigation, router]);

  const [selectedStartDate, setSelectedStartDate] = useState(
    tripData?.startDate
      ? tripData.startDate instanceof Date
        ? tripData.startDate
        : new Date(tripData.startDate)
      : null,
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    tripData?.endDate
      ? tripData.endDate instanceof Date
        ? tripData.endDate
        : new Date(tripData.endDate)
      : null,
  );
  const [selectedDuration, setSelectedDuration] = useState(
    tripData?.duration || null,
  );
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Hızlı süre seçenekleri
  const durationOptions = [
    { label: "1 Gün", value: 1 },
    { label: "2-3 Gün", value: 3 },
    { label: "1 Hafta", value: 7 },
    { label: "2 Hafta", value: 14 },
    { label: "1 Ay", value: 30 },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "Seyahat Tarihi Seç",
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ paddingHorizontal: 6, paddingVertical: 6 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [handleGoBack, navigation]);

  // Tarih formatı
  const formatDate = (date) => {
    if (!date) return null;
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Bugünden itibaren minimum tarih
  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // En az yarın
    return today;
  };

  // Başlangıç tarihi seçildiğinde bitiş tarihini ayarla
  const handleStartDateSelect = (date) => {
    setSelectedStartDate(date);
    if (selectedDuration) {
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + selectedDuration - 1);
      setSelectedEndDate(endDate);
    }
  };

  // Bitiş tarihi seçildiğinde süreyi hesapla
  const handleEndDateSelect = (date) => {
    setSelectedEndDate(date);
    if (selectedStartDate) {
      const diffTime = Math.abs(date - selectedStartDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setSelectedDuration(diffDays);
    }
  };

  // Süre seçildiğinde bitiş tarihini hesapla
  const handleDurationSelect = (duration) => {
    setSelectedDuration(duration);
    if (selectedStartDate) {
      const endDate = new Date(selectedStartDate);
      endDate.setDate(endDate.getDate() + duration - 1);
      setSelectedEndDate(endDate);
    }
  };

  // Devam et
  const handleContinue = () => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert("Hata", "Lütfen başlangıç ve bitiş tarihlerini seçin");
      return;
    }

    // Seyahat verilerini güncelle
    const updatedTripData = {
      ...tripData,
      startDate: selectedStartDate,
      endDate: selectedEndDate,
      duration: selectedDuration,
    };

    setTripData(updatedTripData);

    // Budget seçim sayfasına geç
    router.push("/create-trip/select-budget");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Ne zaman seyahat etmek istersiniz?</Text>
        <Text style={styles.subtitle}>
          Kişiselleştirilmiş öneriler almak için seyahat tarihlerinizi seçin
        </Text>

        {/* Başlangıç Tarihi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Başlangıç Tarihi</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              selectedStartDate && styles.dateButtonSelected,
            ]}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={selectedStartDate ? Colors.WHITE : Colors.PRIMARY}
            />
            <Text
              style={[
                styles.dateButtonText,
                selectedStartDate && styles.dateButtonTextSelected,
              ]}
            >
              {selectedStartDate
                ? formatDate(selectedStartDate)
                : "Başlangıç Tarihini Seç"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={selectedStartDate ? Colors.WHITE : Colors.GRAY}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        </View>

        {/* Hızlı Tarih Seçenekleri */}
        {!selectedStartDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hızlı Başlangıç Seçenekleri</Text>
            <View style={styles.quickDateGrid}>
              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  handleStartDateSelect(tomorrow);
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={Colors.PRIMARY}
                />
                <Text style={styles.quickDateText}>Yarın</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  handleStartDateSelect(nextWeek);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.PRIMARY}
                />
                <Text style={styles.quickDateText}>Gelecek Hafta</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickDateButton}
                onPress={() => {
                  const nextMonth = new Date();
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  handleStartDateSelect(nextMonth);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.PRIMARY}
                />
                <Text style={styles.quickDateText}>Gelecek Ay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Süre Seçimi */}
        {selectedStartDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seyahat Süresi</Text>
            <View style={styles.durationGrid}>
              {durationOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.durationButton,
                    selectedDuration === option.value &&
                      styles.durationButtonSelected,
                  ]}
                  onPress={() => handleDurationSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      selectedDuration === option.value &&
                        styles.durationButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bitiş Tarihi */}
        {selectedStartDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bitiş Tarihi</Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                selectedEndDate && styles.dateButtonSelected,
              ]}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color={selectedEndDate ? Colors.WHITE : Colors.PRIMARY}
              />
              <Text
                style={[
                  styles.dateButtonText,
                  selectedEndDate && styles.dateButtonTextSelected,
                ]}
              >
                {selectedEndDate
                  ? formatDate(selectedEndDate)
                  : "Bitiş Tarihini Seç"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={selectedEndDate ? Colors.WHITE : Colors.GRAY}
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Özet */}
        {selectedStartDate && selectedEndDate && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Seyahat Özeti</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hedef:</Text>
              <Text style={styles.summaryValue}>
                {tripData?.selectedPlace?.name || "Seçilmedi"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Süre:</Text>
              <Text style={styles.summaryValue}>{selectedDuration} gün</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tarihler:</Text>
              <Text style={styles.summaryValue}>
                {formatDate(selectedStartDate)} - {formatDate(selectedEndDate)}
              </Text>
            </View>
          </View>
        )}

        {/* Devam Et Butonu */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedStartDate || !selectedEndDate) &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedStartDate || !selectedEndDate}
        >
          <Text style={styles.continueButtonText}>Devam Et</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onDateSelect={handleStartDateSelect}
        selectedDate={selectedStartDate}
        minDate={getMinDate()}
        title="Başlangıç Tarihini Seç"
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onDateSelect={handleEndDateSelect}
        selectedDate={selectedEndDate}
        minDate={selectedStartDate || getMinDate()}
        title="Bitiş Tarihini Seç"
      />
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
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginBottom: 30,
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.GRAY,
    borderRadius: 15,
    backgroundColor: Colors.WHITE,
  },
  dateButtonSelected: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    marginLeft: 15,
  },
  dateButtonTextSelected: {
    color: Colors.WHITE,
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 25,
    backgroundColor: Colors.WHITE,
  },
  durationButtonSelected: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  durationButtonText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
  },
  durationButtonTextSelected: {
    color: Colors.WHITE,
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
  },
  dateInfoText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginLeft: 10,
  },
  summary: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 15,
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.GRAY,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
    marginRight: 10,
  },
  quickDateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  quickDateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
    backgroundColor: Colors.WHITE,
  },
  quickDateText: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    marginLeft: 8,
  },
});
