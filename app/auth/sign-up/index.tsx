import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, firebaseInitError } from "./../../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "./../../../configs/FirebaseMessages";

const showToast = (msg: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert("", msg);
  }
};

export default function SignUp() {
  const navigation = useNavigation();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [navigation, fadeAnim, slideAnim]);

  const onCreateAccount = async () => {
    if (!auth) {
      showToast(getFirebaseAuthInitErrorMessage(firebaseInitError));
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword || !confirmPassword.trim()) {
      showToast("Lütfen tüm alanları doldurun");
      return;
    }

    if (trimmedPassword.length < 6) {
      showToast("Şifre en az 6 karakter olmalıdır");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      showToast("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword,
      );
      await updateProfile(userCredential.user, { displayName: trimmedName });
      router.replace("/mytrip");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        showToast("Bu e-posta zaten kullanımda");
      } else if (error.code === "auth/invalid-email") {
        showToast("Geçersiz e-posta adresi");
      } else if (error.code === "auth/weak-password") {
        showToast("Şifre çok zayıf, daha güçlü bir şifre seçin");
      } else {
        showToast("Hesap oluşturulamadı. Tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Şifre güç göstergesi
  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: "Zayıf", color: "#EF4444", width: "25%" };
    if (password.length < 8) return { label: "Orta", color: "#F59E0B", width: "55%" };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password))
      return { label: "Güçlü", color: "#10B981", width: "100%" };
    return { label: "İyi", color: "#6366F1", width: "75%" };
  };
  const strength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Arka plan efektleri */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Geri + Logo */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace("/auth/sign-in")}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Ionicons name="airplane" size={20} color="#fff" />
              </View>
              <Text style={styles.appName}>Yol Arkadaşım</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Kart */}
          <View style={styles.card}>
            <Text style={styles.title}>Hesap Oluştur 🚀</Text>
            <Text style={styles.subtitle}>
              Ücretsiz kaydol, AI destekli seyahat planlarını keşfet
            </Text>

            {/* Ad Soyad */}
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            <View style={[styles.inputWrapper, nameFocused && styles.inputFocused]}>
              <Ionicons
                name="person-outline"
                size={18}
                color={nameFocused ? "#818CF8" : "#6B7280"}
              />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adın ve soyadın"
                placeholderTextColor="#4B5563"
                autoCapitalize="words"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            {/* E-posta */}
            <Text style={styles.fieldLabel}>E-posta</Text>
            <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? "#818CF8" : "#6B7280"}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Şifre */}
            <Text style={styles.fieldLabel}>Şifre</Text>
            <View style={[styles.inputWrapper, passFocused && styles.inputFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passFocused ? "#818CF8" : "#6B7280"}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="En az 6 karakter"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            {/* Şifre güç göstergesi */}
            {strength && (
              <View style={{ marginTop: -4, marginBottom: 12 }}>
                <View style={styles.strengthBg}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: strength.width as `${number}%`,
                        backgroundColor: strength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  Şifre gücü: {strength.label}
                </Text>
              </View>
            )}

            {/* Şifre Tekrar */}
            <Text style={styles.fieldLabel}>Şifre Tekrar</Text>
            <View
              style={[
                styles.inputWrapper,
                confirmFocused && styles.inputFocused,
                confirmPassword && password !== confirmPassword
                  ? styles.inputError
                  : null,
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={
                  confirmPassword && password !== confirmPassword
                    ? "#EF4444"
                    : confirmFocused
                      ? "#818CF8"
                      : "#6B7280"
                }
              />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Şifreni tekrar gir"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showConfirm}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Şifreler eşleşmiyor</Text>
            )}

            {/* Kayıt Butonu */}
            <TouchableOpacity
              onPress={onCreateAccount}
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>Hesap oluşturuluyor...</Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Hesap Oluştur</Text>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Gizlilik notu */}
            <Text style={styles.privacyNote}>
              🔒 Bilgilerin güvende. Asla üçüncü taraflarla paylaşılmaz.
            </Text>
          </View>

          {/* Giriş Yap */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomMuted}>Zaten hesabın var mı?</Text>
            <TouchableOpacity onPress={() => router.replace("/auth/sign-in")}>
              <Text style={styles.bottomLink}> Giriş yap →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0F1E",
  },
  glowTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(99,102,241,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontFamily: "outfit-bold",
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "outfit",
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldLabel: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  inputFocused: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(129,140,248,0.08)",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontFamily: "outfit",
    fontSize: 15,
  },
  strengthBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  strengthFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: "outfit",
    fontSize: 11,
  },
  errorText: {
    color: "#EF4444",
    fontFamily: "outfit",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 2,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 16,
  },
  privacyNote: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  bottomMuted: {
    color: "#6B7280",
    fontFamily: "outfit",
    fontSize: 14,
  },
  bottomLink: {
    color: "#818CF8",
    fontFamily: "outfit-bold",
    fontSize: 14,
  },
});
