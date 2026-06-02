import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, firebaseInitError } from "../../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "../../../configs/FirebaseMessages";

export default function ForgotPassword() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(params?.email ? String(params.email) : "");

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleResetPassword = async () => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      ToastAndroid.show(initMessage, ToastAndroid.LONG);
      return;
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      ToastAndroid.show("Lütfen e-posta adresinizi girin", ToastAndroid.LONG);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      ToastAndroid.show(
        "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
        ToastAndroid.LONG,
      );
      router.back();
    } catch (error) {
      const code = error?.code;
      if (code === "auth/user-not-found") {
        ToastAndroid.show(
          "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
          ToastAndroid.LONG,
        );
        return;
      }

      if (code === "auth/invalid-email") {
        ToastAndroid.show(
          "Geçerli bir e-posta adresi girin.",
          ToastAndroid.LONG,
        );
        return;
      }

      ToastAndroid.show(
        "Şifre sıfırlama işlemi başarısız oldu.",
        ToastAndroid.LONG,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#E6E9F2" />
        </TouchableOpacity>

        <Text style={styles.title}>Şifremi Unuttum</Text>
        <Text style={styles.subtitle}>
          Şifrenizi sıfırlamak için hesabınıza ait e-posta adresini girin.
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={18} color="#8B93A8" />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="E-posta"
            placeholderTextColor="#8B93A8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>Sıfırlama Linki Gönder</Text>
          <Ionicons name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090E1E",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(18,23,40,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontFamily: "outfit-bold",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    color: "#A6B0C7",
    fontSize: 13,
    fontFamily: "outfit",
    lineHeight: 18,
  },
  inputWrapper: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#FFFFFF",
    fontFamily: "outfit",
    fontSize: 14,
  },
  button: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F43F5E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 15,
  },
});
