import Ionicons from "@expo/vector-icons/Ionicons";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
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

export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Giriş animasyonu
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

  const appExtra = Constants.expoConfig?.extra || {};
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    appExtra.googleAndroidClientId || "";
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    appExtra.googleIosClientId || "";
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    appExtra.googleWebClientId || "";
  const isExpoGo = Constants.appOwnership === "expo";

  const effectiveAndroidClientId = googleAndroidClientId || googleWebClientId;
  const effectiveIosClientId = googleIosClientId || googleWebClientId;
  const hasGoogleClientId =
    Platform.OS === "android"
      ? Boolean(effectiveAndroidClientId)
      : Platform.OS === "ios"
        ? Boolean(effectiveIosClientId)
        : Boolean(googleWebClientId);

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
      router.replace("/mytrip");
    } catch (error: any) {
      if (error.code === "auth/invalid-credential" ||
          error.code === "auth/wrong-password" ||
          error.code === "auth/user-not-found") {
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
      {/* Arka plan efektleri */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      <View style={styles.glowCenter} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Logo & Başlık */}
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
            <Text style={styles.subtitle}>
              Hesabına giriş yap ve yolculuğuna devam et
            </Text>

            {/* Google Butonu */}
            {hasGoogleClientId ? (
              <GoogleSignInButton
                googleAndroidClientId={effectiveAndroidClientId}
                googleIosClientId={effectiveIosClientId}
                googleWebClientId={googleWebClientId}
                isExpoGo={isExpoGo}
                router={router}
              />
            ) : null}

            {hasGoogleClientId && (
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>veya e-posta ile</Text>
                <View style={styles.orLine} />
              </View>
            )}

            {/* E-posta */}
            <View
              style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? "#818CF8" : "#6B7280"}
              />
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
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passwordFocused ? "#818CF8" : "#6B7280"}
              />
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

            {/* Şifremi Unuttum */}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/auth/forgot-password",
                  params: { email: email.trim() },
                })
              }
              style={{ alignSelf: "flex-end", marginBottom: 20 }}
            >
              <Text style={styles.forgotText}>Şifremi unuttum</Text>
            </TouchableOpacity>

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

/* ─── Google Sign-In ─── */
function GoogleSignInButton({ googleAndroidClientId, googleIosClientId, googleWebClientId, isExpoGo, router }) {
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: isExpoGo ? googleWebClientId || undefined : undefined,
    androidClientId: googleAndroidClientId || undefined,
    iosClientId: googleIosClientId || undefined,
    webClientId: googleWebClientId || undefined,
  });

  useEffect(() => {
    if (!started) return;
    if (response?.type !== "success") {
      if (response?.type === "cancel" || response?.type === "dismiss") {
        setStarted(false);
        setBusy(false);
      }
      return;
    }
    (async () => {
      try {
        const { idToken, accessToken } = response.authentication ?? {};
        const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken);
        await signInWithCredential(auth!, credential);
        router.replace("/mytrip");
      } catch {
        showToast("Google ile giriş başarısız oldu.");
      } finally {
        setStarted(false);
        setBusy(false);
      }
    })();
  }, [started, response, router]);

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={async () => {
        if (!request) return;
        setBusy(true);
        setStarted(true);
        try {
          await promptAsync({ useProxy: isExpoGo });
        } catch {
          setBusy(false);
          setStarted(false);
        }
      }}
      disabled={!request || busy}
      activeOpacity={0.85}
    >
      <Ionicons name="logo-google" size={18} color="#fff" />
      <Text style={styles.googleButtonText}>
        {busy ? "Bekleniyor..." : "Google ile Devam Et"}
      </Text>
    </TouchableOpacity>
  );
}

/* ─── Stiller ─── */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0F1E",
  },
  glowTopLeft: {
    position: "absolute",
    top: -100,
    left: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  glowBottomRight: {
    position: "absolute",
    bottom: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(236,72,153,0.15)",
  },
  glowCenter: {
    position: "absolute",
    top: "40%",
    left: "20%",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(99,102,241,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontFamily: "outfit-bold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  appTagline: {
    fontFamily: "outfit",
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
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
  googleButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontFamily: "outfit-medium",
    fontSize: 15,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  orText: {
    marginHorizontal: 12,
    color: "#6B7280",
    fontFamily: "outfit",
    fontSize: 13,
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
    marginBottom: 12,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(129,140,248,0.08)",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontFamily: "outfit",
    fontSize: 15,
  },
  forgotText: {
    color: "#818CF8",
    fontFamily: "outfit-medium",
    fontSize: 13,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
