import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";

const showToast = (msg: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert("", msg);
  }
};
import { auth, firebaseInitError } from "../../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "../../../configs/FirebaseMessages";

export default function ForgotPassword() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(
    params?.email ? String(params.email) : "",
  );
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Subtle entrance animation for the card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    if (!auth) {
      showToast(getFirebaseAuthInitErrorMessage(firebaseInitError));
      return;
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      showToast("Lütfen e-posta adresinizi girin");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setSuccess(true);
    } catch (error: any) {
      const code = error?.code;
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        showToast("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
      } else if (code === "auth/invalid-email") {
        showToast("Geçerli bir e-posta adresi girin.");
      } else {
        showToast("Şifre sıfırlama işlemi başarısız oldu.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1E" />

      {/* Background glow blobs */}
      <View style={styles.glowBlob1} />
      <View style={styles.glowBlob2} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/auth/sign-in")}
          >
            <Ionicons name="arrow-back" size={20} color="#E6E9F2" />
          </TouchableOpacity>

          {success ? (
            /* ── Success State ── */
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Ionicons
                  name="checkmark-circle"
                  size={52}
                  color="#6366F1"
                />
              </View>

              <Text style={styles.successTitle}>E-posta Gönderildi!</Text>
              <Text style={styles.successSubtitle}>
                Şifre sıfırlama bağlantısı{"\n"}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>
                {"\n"}adresine gönderildi. Gelen kutunuzu kontrol edin.
              </Text>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.canGoBack() ? router.back() : router.replace("/auth/sign-in")}
              >
                <Ionicons name="arrow-back-outline" size={17} color="#FFFFFF" />
                <Text style={styles.backToLoginText}>Giriş Ekranına Dön</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form State ── */
            <>
              {/* Lock icon with indigo circle */}
              <View style={styles.iconCircleWrapper}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed" size={26} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.title}>Şifreni Sıfırla</Text>
              <Text style={styles.subtitle}>
                Hesabına bağlı e-posta adresini gir, sıfırlama bağlantısını
                hemen gönderelim.
              </Text>

              {/* Email input */}
              <View
                style={[
                  styles.inputWrapper,
                  focused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focused ? "#818CF8" : "#8B93A8"}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-posta adresin"
                  placeholderTextColor="#8B93A8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>

              {/* Send button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.buttonText}>Gönderiliyor...</Text>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Sıfırlama Linki Gönder</Text>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0F1E",
  },
  glowBlob1: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  glowBlob2: {
    position: "absolute",
    bottom: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(79,70,229,0.12)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 24,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 20,
  },
  iconCircleWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontFamily: "outfit-bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    fontFamily: "outfit",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  inputWrapper: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputWrapperFocused: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(129,140,248,0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: "#FFFFFF",
    fontFamily: "outfit",
    fontSize: 14,
  },
  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 15,
  },
  // ── Success state ──
  successContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.30)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },
  successTitle: {
    fontFamily: "outfit-bold",
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  successSubtitle: {
    fontFamily: "outfit",
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    fontFamily: "outfit-medium",
    color: "#818CF8",
  },
  backToLoginButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  backToLoginText: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 15,
  },
});
