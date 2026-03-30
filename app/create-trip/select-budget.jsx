import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { CreateTripContext } from "../../context/CreateTripContext";

export default function SelectBudget() {
  const navigation = useNavigation();
  const router = useRouter();
  const { tripData, setTripData } = useContext(CreateTripContext);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/create-trip/select-date");
  }, [navigation, router]);

  const [selectedBudget, setSelectedBudget] = useState(
    tripData?.budget || null,
  );
  const [customBudget, setCustomBudget] = useState(
    tripData?.budget ? String(tripData.budget) : "",
  );
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Context'teki bütçeyi yükle
  useEffect(() => {
    if (tripData?.budget) {
      setSelectedBudget((prev) => prev || tripData.budget);
    }
  }, [tripData?.budget]);

  // Önceden tanımlı bütçe seçenekleri
  const budgetOptions = [
    {
      label: "Ekonomik",
      value: 500,
      icon: "wallet-outline",
      description: "₺500 - ₺1,000",
    },
    {
      label: "Orta",
      value: 2000,
      icon: "cash-outline",
      description: "₺1,000 - ₺3,000",
    },
    {
      label: "Lüks",
      value: 5000,
      icon: "diamond-outline",
      description: "₺3,000 - ₺7,000",
    },
    {
      label: "Premium",
      value: 10000,
      icon: "star-outline",
      description: "₺7,000+",
    },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerStyle: {
        backgroundColor: Colors.WHITE,
      },
      headerShadowVisible: false,
      headerTitle: "Bütçe Seç",
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

  // Bütçe seçeneği seçildiğinde
  const handleBudgetSelect = (value) => {
    setSelectedBudget(value);
    setShowCustomInput(false);
    setCustomBudget("");
  };

  // Özel bütçe girişi
  const handleCustomBudget = () => {
    setShowCustomInput(true);
    setSelectedBudget(null);
  };

  // Özel bütçe kaydet
  const handleSaveCustomBudget = () => {
    const budget = parseFloat(customBudget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir bütçe miktarı girin");
      return;
    }
    setSelectedBudget(budget);
    setShowCustomInput(false);
  };

  // Devam et
  const handleContinue = () => {
    if (!selectedBudget) {
      Alert.alert("Hata", "Lütfen bir bütçe seçin veya özel bütçe girin");
      return;
    }

    // Seyahat verilerini güncelle
    const updatedTripData = {
      ...tripData,
      budget: selectedBudget,
    };

    setTripData(updatedTripData);

    // Review Trip sayfasına geç
    router.push("/create-trip/review-trip");
  };

  // Bütçe formatı
  const formatBudget = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Başlık */}
        <Text style={styles.title}>Bütçenizi Seçin</Text>
        <Text style={styles.subtitle}>
          Seyahatiniz için ne kadar harcamak istersiniz? Bu bilgi size özel
          öneriler sunmamıza yardımcı olur.
        </Text>

        {/* Bütçe Seçenekleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bütçe Kategorileri</Text>
          <View style={styles.budgetGrid}>
            {budgetOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.budgetCard,
                  selectedBudget === option.value && styles.budgetCardSelected,
                ]}
                onPress={() => handleBudgetSelect(option.value)}
              >
                <Ionicons
                  name={option.icon}
                  size={32}
                  color={
                    selectedBudget === option.value
                      ? Colors.WHITE
                      : Colors.PRIMARY
                  }
                />
                <Text
                  style={[
                    styles.budgetLabel,
                    selectedBudget === option.value &&
                      styles.budgetLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.budgetDescription,
                    selectedBudget === option.value &&
                      styles.budgetDescriptionSelected,
                  ]}
                >
                  {option.description}
                </Text>
                {selectedBudget === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={Colors.WHITE}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Özel Bütçe */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.customBudgetButton,
              showCustomInput && styles.customBudgetButtonActive,
            ]}
            onPress={handleCustomBudget}
          >
            <Ionicons
              name="create-outline"
              size={24}
              color={showCustomInput ? Colors.WHITE : Colors.PRIMARY}
            />
            <Text
              style={[
                styles.customBudgetText,
                showCustomInput && styles.customBudgetTextActive,
              ]}
            >
              Özel Bütçe Gir
            </Text>
          </TouchableOpacity>

          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <Text style={styles.customInputLabel}>Bütçe Miktarı (₺)</Text>
              <TextInput
                style={styles.customInput}
                placeholder="Örn: 1500"
                placeholderTextColor={Colors.GRAY}
                keyboardType="numeric"
                value={customBudget}
                onChangeText={setCustomBudget}
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveCustomButton}
                onPress={handleSaveCustomBudget}
              >
                <Text style={styles.saveCustomButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Seçilen Bütçe Özeti */}
        {selectedBudget && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Seçilen Bütçe</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="wallet" size={24} color={Colors.PRIMARY} />
              <Text style={styles.summaryAmount}>
                {formatBudget(selectedBudget)}
              </Text>
            </View>
            {tripData?.duration && (
              <Text style={styles.summaryPerDay}>
                Günlük:{" "}
                {formatBudget(Math.round(selectedBudget / tripData.duration))}
              </Text>
            )}
          </View>
        )}

        {/* Seyahat Özeti */}
        <View style={styles.tripSummary}>
          <Text style={styles.tripSummaryTitle}>Seyahat Özeti</Text>
          <View style={styles.tripSummaryRow}>
            <Text style={styles.tripSummaryLabel}>Yer:</Text>
            <Text style={styles.tripSummaryValue}>
              {tripData?.selectedPlace?.name || "Seçilmedi"}
            </Text>
          </View>
          {tripData?.startDate && tripData?.endDate && (
            <View style={styles.tripSummaryRow}>
              <Text style={styles.tripSummaryLabel}>Tarih:</Text>
              <Text style={styles.tripSummaryValue}>
                {tripData.startDate instanceof Date
                  ? tripData.startDate.toLocaleDateString("tr-TR")
                  : new Date(tripData.startDate).toLocaleDateString(
                      "tr-TR",
                    )}{" "}
                -{" "}
                {tripData.endDate instanceof Date
                  ? tripData.endDate.toLocaleDateString("tr-TR")
                  : new Date(tripData.endDate).toLocaleDateString("tr-TR")}
              </Text>
            </View>
          )}
          {tripData?.duration && (
            <View style={styles.tripSummaryRow}>
              <Text style={styles.tripSummaryLabel}>Süre:</Text>
              <Text style={styles.tripSummaryValue}>
                {tripData.duration} gün
              </Text>
            </View>
          )}
        </View>

        {/* Devam Et Butonu */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedBudget && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedBudget}
        >
          <Text style={styles.continueButtonText}>Devam Et</Text>
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
  budgetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  budgetCard: {
    width: "47%",
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.GRAY,
    borderRadius: 15,
    backgroundColor: Colors.WHITE,
    alignItems: "center",
    position: "relative",
    minHeight: 140,
  },
  budgetCardSelected: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  budgetLabel: {
    fontSize: 16,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginTop: 10,
    marginBottom: 5,
  },
  budgetLabelSelected: {
    color: Colors.WHITE,
  },
  budgetDescription: {
    fontSize: 12,
    fontFamily: "outfit",
    color: Colors.GRAY,
    textAlign: "center",
  },
  budgetDescriptionSelected: {
    color: Colors.WHITE,
  },
  selectedIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  customBudgetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.GRAY,
    borderRadius: 15,
    backgroundColor: Colors.WHITE,
  },
  customBudgetButtonActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  customBudgetText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginLeft: 10,
  },
  customBudgetTextActive: {
    color: Colors.WHITE,
  },
  customInputContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 15,
  },
  customInputLabel: {
    fontSize: 14,
    fontFamily: "outfit-medium",
    color: Colors.PRIMARY,
    marginBottom: 10,
  },
  customInput: {
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.GRAY,
    borderRadius: 10,
    backgroundColor: Colors.WHITE,
    fontSize: 16,
    fontFamily: "outfit",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  saveCustomButton: {
    padding: 12,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 10,
    alignItems: "center",
  },
  saveCustomButtonText: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
  },
  summary: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: "outfit-medium",
    color: Colors.GRAY,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryAmount: {
    fontSize: 32,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
  },
  summaryPerDay: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
    marginTop: 8,
  },
  tripSummary: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  tripSummaryTitle: {
    fontSize: 18,
    fontFamily: "outfit-bold",
    color: Colors.PRIMARY,
    marginBottom: 15,
  },
  tripSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tripSummaryLabel: {
    fontSize: 14,
    fontFamily: "outfit",
    color: Colors.GRAY,
  },
  tripSummaryValue: {
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
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: "outfit-medium",
    color: Colors.WHITE,
    marginRight: 10,
  },
});
