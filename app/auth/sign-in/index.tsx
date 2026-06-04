import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, firebaseInitError } from "./../../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "./../../../configs/FirebaseMessages";

const REMEMBER_EMAIL_KEY = "yolarkadasim_remember_email";

const showToast = (msg: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert("", msg);
  }
};

export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Kayıtlı e-postayı yükle
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((saved) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, [navigation, fadeAnim, slideAnim]);

  const onSignIn = async () => {
    if (!auth) {
      showToast(getFirebaseAuthInitErrorMessage(firebaseInitError));
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      showToast("Lütfen e-posta ve şifre girin");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      router.replace("/mytrip");
    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        showToast("E-posta veya şifre hatalı");
      } else {
        showToast("Giriş yapılamadı. Tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      <View style={styles.glowCenter} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="airplane" size={32} color="#fff" />
            </View>
            <Text style={styles.appName}>Yol Arkadaşım</Text>
            <Text style={styles.appTagline}>Seyahatini AI ile planla ✨</Text>
          </View>

          {/* Kart */}
          <View style={styles.card}>
            <Text style={styles.title}>Tekrar hoş geldin 👋</Text>
            <Text style={styles.subtitle}>Hesabına giriş yap ve yolculuğuna devam et</Text>

            {/* E-posta */}
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <Ionicons name="mail-outline" size={18} color={emailFocused ? "#818CF8" : "#6B7280"} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="E-posta adresin"
                placeholderTextColor="#4B5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Şifre */}
            <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? "#818CF8" : "#6B7280"} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Şifren"
                placeholderTextColor="#4B5563"
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Beni Hatırla + Şifremi Unuttum */}
            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Beni hatırla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push({ pathname: "/auth/forgot-password", params: { email: email.trim() } })}
              >
                <Text style={styles.forgotText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            </View>

            {/* Giriş Butonu */}
            <TouchableOpacity
              onPress={onSignIn}
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <Text style={styles.primaryButtonText}>Giriş yapılıyor...</Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Giriş Yap</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Kayıt Ol */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomMuted}>Hesabın yok mu?</Text>
            <TouchableOpacity onPress={() => router.replace("/auth/sign-up")}>
              <Text style={styles.bottomLink}> Kayıt ol →</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0F1E" },
  glowTopLeft: { position: "absolute", top: -100, left: -80, width: 350, height: 350, borderRadius: 175, backgroundColor: "rgba(99,102,241,0.18)" },
  glowBottomRight: { position: "absolute", bottom: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(236,72,153,0.15)" },
  glowCenter: { position: "absolute", top: "40%", left: "20%", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(59,130,246,0.08)" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(99,102,241,0.9)", alignItems: "center", justifyContent: "center", marginBottom: 12, shadowColor: "#6366F1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  appName: { fontFamily: "outfit-bold", fontSize: 26, color: "#FFFFFF", letterSpacing: 0.5 },
  appTagline: { fontFamily: "outfit", fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", borderRadius: 24, padding: 24 },
  title: { fontFamily: "outfit-bold", fontSize: 26, color: "#FFFFFF", marginBottom: 6 },
  subtitle: { fontFamily: "outfit", fontSize: 14, color: "#9CA3AF", marginBottom: 24, lineHeight: 20 },
  inputWrapper: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.05)", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 12, gap: 10 },
  inputWrapperFocused: { borderColor: "#818CF8", backgroundColor: "rgba(129,140,248,0.08)" },
  input: { flex: 1, color: "#FFFFFF", fontFamily: "outfit", fontSize: 15 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  rememberText: { color: "#9CA3AF", fontFamily: "outfit", fontSize: 13 },
  forgotText: { color: "#818CF8", fontFamily: "outfit-medium", fontSize: 13 },
  primaryButton: { height: 52, borderRadius: 14, backgroundColor: "#6366F1", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#6366F1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "outfit-bold", fontSize: 16 },
  bottomRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  bottomMuted: { color: "#6B7280", fontFamily: "outfit", fontSize: 14 },
  bottomLink: { color: "#818CF8", fontFamily: "outfit-bold", fontSize: 14 },
});
