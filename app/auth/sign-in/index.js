import Ionicons from "@expo/vector-icons/Ionicons";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
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

export default function SignIn() {
  const navigation = useNavigation();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const appExtra = Constants.expoConfig?.extra || {};
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    appExtra.googleAndroidClientId ||
    "";
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    appExtra.googleIosClientId ||
    "";
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    appExtra.googleWebClientId ||
    "";
  const googleExpoClientId =
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
    appExtra.googleExpoClientId ||
    "";
  const isExpoGo = Constants.appOwnership === "expo";

  const effectiveAndroidClientId =
    googleAndroidClientId || googleExpoClientId || googleWebClientId;
  const effectiveIosClientId =
    googleIosClientId || googleExpoClientId || googleWebClientId;

  const hasGoogleClientIdForCurrentPlatform =
    Platform.OS === "android"
      ? Boolean(effectiveAndroidClientId)
      : Platform.OS === "ios"
        ? Boolean(effectiveIosClientId)
        : Boolean(googleWebClientId);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleForgotPassword = () => {
    router.push({
      pathname: "/auth/forgot-password",
      params: {
        email: email?.trim() || "",
      },
    });
  };

  const onSignIn = () => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      ToastAndroid.show(initMessage, ToastAndroid.LONG);
      return;
    }

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      ToastAndroid.show("Lütfen E-posta ve Şifre girin", ToastAndroid.LONG);
      return;
    }

    signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword)
      .then((userCredential) => {
        // Signed in
        const user = userCredential.user;
        router.replace("/mytrip");
        console.log(user);
        // ...
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage, errorCode);
        if (errorCode === "auth/invalid-credential") {
          ToastAndroid.show(
            "Geçersiz kullanıcı adı veya şifre",
            ToastAndroid.LONG,
          );
        }
      });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Tekrar hoş geldin</Text>
          <Text style={styles.subtitle}>
            Next Trip hesabınla giriş yap ve yolculuğunu planlamaya devam et.
          </Text>

          {hasGoogleClientIdForCurrentPlatform ? (
            <GoogleSignInButton
              googleAndroidClientId={effectiveAndroidClientId}
              googleIosClientId={effectiveIosClientId}
              googleWebClientId={googleWebClientId}
              isExpoGo={isExpoGo}
              router={router}
            />
          ) : (
            <TouchableOpacity
              style={[styles.googleButton, styles.googleButtonDisabled]}
              onPress={() =>
                Alert.alert(
                  "Google Giriş Ayarı Eksik",
                  "Bu platform için Google Client ID tanımlı değil. .env dosyasına uygun EXPO_PUBLIC_GOOGLE_*_CLIENT_ID değerini ekleyin.",
                )
              }
            >
              <Ionicons name="logo-google" size={16} color="#93C5FD" />
              <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
            </TouchableOpacity>
          )}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>veya</Text>
            <View style={styles.orLine} />
          </View>

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

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#8B93A8" />
            <TextInput
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Şifre"
              placeholderTextColor="#8B93A8"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.passwordToggle}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color="#A6B0C7"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inlineRow}>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Şifremi unuttum</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setAcceptedTerms((prev) => !prev)}
            style={styles.termsRow}
          >
            <Ionicons
              name={acceptedTerms ? "checkbox" : "square-outline"}
              size={16}
              color={acceptedTerms ? "#F43F5E" : "#8B93A8"}
            />
            <Text style={styles.termsText}>
              Kullanım koşullarını kabul ediyorum.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSignIn} style={styles.signInButton}>
            <Text style={styles.signInText}>Giriş yap</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerMuted}>Hesabın yok mu?</Text>
          <TouchableOpacity onPress={() => router.replace("/auth/sign-up")}>
            <Text style={styles.registerLink}>Kayıt ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090E1E",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(244,63,94,0.22)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: "rgba(18,23,40,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
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
  googleButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontFamily: "outfit-medium",
    marginLeft: 8,
    fontSize: 14,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  orText: {
    marginHorizontal: 10,
    color: "#8B93A8",
    fontFamily: "outfit",
    fontSize: 12,
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
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: "#FFFFFF",
    fontFamily: "outfit",
    fontSize: 14,
  },
  inlineRow: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  forgotText: {
    color: "#E5E7EB",
    fontFamily: "outfit-medium",
    fontSize: 12,
  },
  passwordToggle: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  termsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  termsText: {
    marginLeft: 6,
    flex: 1,
    color: "#8B93A8",
    fontFamily: "outfit",
    fontSize: 11,
    lineHeight: 16,
  },
  signInButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F43F5E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  signInText: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 15,
  },
  registerRow: {
    marginTop: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  registerMuted: {
    color: "#A6B0C7",
    fontFamily: "outfit",
    fontSize: 12,
    marginRight: 6,
  },
  registerLink: {
    color: "#FFFFFF",
    fontFamily: "outfit-bold",
    fontSize: 12,
  },
});

function GoogleSignInButton({
  googleAndroidClientId,
  googleIosClientId,
  googleWebClientId,
  isExpoGo,
  router,
}) {
  const [googleFlowStarted, setGoogleFlowStarted] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: isExpoGo ? googleWebClientId || undefined : undefined,
    androidClientId: googleAndroidClientId || undefined,
    iosClientId: googleIosClientId || undefined,
    webClientId: googleWebClientId || undefined,
  });

  useEffect(() => {
    const completeGoogleSignIn = async () => {
      if (!googleFlowStarted) {
        return;
      }

      if (response?.type !== "success") {
        if (response?.type === "cancel" || response?.type === "dismiss") {
          setGoogleFlowStarted(false);
        }
        return;
      }

      if (!auth) {
        const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
        ToastAndroid.show(initMessage, ToastAndroid.LONG);
        return;
      }

      try {
        const authentication = response.authentication;
        const idToken = authentication?.idToken;
        const accessToken = authentication?.accessToken;

        if (!idToken && !accessToken) {
          ToastAndroid.show(
            "Google kimlik doğrulaması alınamadı.",
            ToastAndroid.LONG,
          );
          return;
        }

        const credential = GoogleAuthProvider.credential(
          idToken ?? null,
          accessToken,
        );
        await signInWithCredential(auth, credential);
        setGoogleFlowStarted(false);
        router.replace("/mytrip");
      } catch (error) {
        console.log("Google sign-in error:", error?.message || error);
        ToastAndroid.show(
          "Google ile giriş başarısız oldu.",
          ToastAndroid.LONG,
        );
        setGoogleFlowStarted(false);
      }
    };

    completeGoogleSignIn();
  }, [googleFlowStarted, response, router]);

  const handleGoogleSignIn = async () => {
    if (!auth) {
      const initMessage = getFirebaseAuthInitErrorMessage(firebaseInitError);
      ToastAndroid.show(initMessage, ToastAndroid.LONG);
      return;
    }

    try {
      setGoogleFlowStarted(true);
      await promptAsync({ useProxy: isExpoGo });
    } catch (_error) {
      setGoogleFlowStarted(false);
      ToastAndroid.show("Google giriş başlatılamadı.", ToastAndroid.LONG);
    }
  };

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={handleGoogleSignIn}
      disabled={!request}
    >
      <Ionicons name="logo-google" size={16} color="#3B82F6" />
      <Text style={styles.googleButtonText}>Google ile Devam Et</Text>
    </TouchableOpacity>
  );
}
