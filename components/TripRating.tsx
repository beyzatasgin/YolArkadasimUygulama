import Ionicons from "@expo/vector-icons/Ionicons";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../configs/FirebaseConfig";
import { Colors } from "../constants/Colors";

type Props = {
  tripId: string;
  /** Mevcut puan (varsa) */
  initialRating?: number | null;
  /** Mevcut yorum (varsa) */
  initialReview?: string | null;
  /** Puanlama kaydedilince çağrılır */
  onSaved?: (rating: number, review: string) => void;
};

/** Yıldız satırı — seçili yıldızlar dolu, diğerleri outline */
function StarRow({
  rating,
  onSelect,
  size = 32,
  readonly = false,
}: {
  rating: number;
  onSelect?: (r: number) => void;
  size?: number;
  readonly?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !readonly && onSelect?.(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Ionicons
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? "#F59E0B" : "#D1D5DB"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export { StarRow };

/** Tam puanlama bileşeni: mevcut puanı gösterir + düzenleme modal'ı açar */
export default function TripRating({
  tripId,
  initialRating,
  initialReview,
  onSaved,
}: Props) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [review, setReview] = useState(initialReview ?? "");
  const [modalVisible, setModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(rating);
  const [tempReview, setTempReview] = useState(review);
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setTempRating(rating);
    setTempReview(review);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (tempRating === 0) {
      Alert.alert("Hata", "Lütfen en az 1 yıldız seçin.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db!, "trips", tripId), {
        rating: tempRating,
        review: tempReview.trim(),
      });
      setRating(tempRating);
      setReview(tempReview.trim());
      setModalVisible(false);
      onSaved?.(tempRating, tempReview.trim());
    } catch (err) {
      console.error("Puanlama hatası:", err);
      Alert.alert("Hata", "Puan kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Mevcut puan kartı */}
      <TouchableOpacity
        onPress={handleOpen}
        style={{
          backgroundColor: "#FFFBEB",
          borderRadius: 14,
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: "#FDE68A",
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: "outfit-bold",
              fontSize: 15,
              color: Colors.PRIMARY,
              marginBottom: 6,
            }}
          >
            {rating > 0 ? "Senin Değerlendirmen" : "Bu Seyahati Puanla"}
          </Text>
          {rating > 0 ? (
            <>
              <StarRow rating={rating} readonly size={24} />
              {review ? (
                <Text
                  style={{
                    fontFamily: "outfit",
                    fontSize: 13,
                    color: Colors.GRAY,
                    marginTop: 6,
                  }}
                  numberOfLines={2}
                >
                  "{review}"
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={{ fontFamily: "outfit", color: Colors.GRAY, fontSize: 13 }}>
              Nasıl geçti? Yıldız ver
            </Text>
          )}
        </View>
        <Ionicons
          name={rating > 0 ? "create-outline" : "star-half-outline"}
          size={24}
          color="#F59E0B"
        />
      </TouchableOpacity>

      {/* Puanlama Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 28,
              paddingBottom: 40,
              gap: 16,
            }}
          >
            <Text
              style={{
                fontFamily: "outfit-bold",
                fontSize: 20,
                color: Colors.PRIMARY,
              }}
            >
              Seyahati Değerlendir
            </Text>

            <View style={{ alignItems: "center", gap: 8 }}>
              <StarRow
                rating={tempRating}
                onSelect={setTempRating}
                size={40}
              />
              <Text style={{ fontFamily: "outfit", color: Colors.GRAY, fontSize: 13 }}>
                {
                  ["", "Kötüydü", "İdare eder", "İyiydi", "Çok iyiydi", "Muhteşemdi"][
                    tempRating
                  ]
                }
              </Text>
            </View>

            <Text style={{ fontFamily: "outfit-medium", color: Colors.PRIMARY }}>
              Yorumun (isteğe bağlı)
            </Text>
            <TextInput
              value={tempReview}
              onChangeText={setTempReview}
              placeholder="Bu seyahat hakkında ne düşünüyorsun?"
              placeholderTextColor={Colors.GRAY}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 12,
                padding: 12,
                fontFamily: "outfit",
                fontSize: 15,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                }}
                disabled={saving}
              >
                <Text style={{ fontFamily: "outfit-medium", color: Colors.GRAY }}>
                  İptal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: Colors.PRIMARY,
                  alignItems: "center",
                }}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ fontFamily: "outfit-medium", color: "white" }}>
                    Kaydet
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
