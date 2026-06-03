import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRouter } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, firebaseInitError } from "./../../../configs/FirebaseConfig";
import { getFirebaseAuthInitErrorMessage } from "./../../../configs/FirebaseMessages";
import { Colors } from "./../../../constants/Colors";

const AUTH_TIMEOUT_MS = 25000;

const withTimeout = (promise, ms, timeoutMessage) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), ms);
    }),
  ]);

const getSignUpErrorMessage = (error) => {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") {
    return "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.";
  }
  if (code === "auth/invalid-email") {
    return "Geçersiz e-posta adresi.";
  }
  if (code === "auth/weak-password") {
    return "Şifre en az 6 karakter olmalıdır.";
  }
  if (code === "auth/network-request-failed") {
    return "İnternet bağlantısı hatası. Tekrar deneyin.";
  }
  if (code === "auth/operation-not-allowed") {
    return "E-posta ile kayıt Firebase'de kapalı. Console ayarlarını kontrol edin.";
  }
  if (error?.message?.includes("zaman aşımı")) {
    return error.message;
  }
  return error?.message || "Hesap oluşturulamadı. Lütfen tekrar deneyin.";
};

const showFeedback = (message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
    return;
  }
  Alert.alert("Kayıt", message);
};

export default function SignUp() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const saveUserProfile = async (user, trimmedEmail, trimmedFullName) => {
    if (!db || !user?.uid) return;

    await setDoc(
      doc(db, "userProfiles", user.uid),
      {
        uid: user.uid,
        displayName: trimmedFullName || "Kullanıcı",
        displayNameLower: (trimmedFullName || "Kullanıcı").toLowerCase(),
        email: trimmedEmail,
        searchableEmail: trimmedEmail,
        photoURL: null,
        isOnline: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      },
      { merge: true },
    );
  };

  const onCreateAccount = async () => {
    if (isCreatingAccount) {
      return;
    }

    if (!auth) {
      showFeedback(getFirebaseAuthInitErrorMessage(firebaseInitError));
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedFullName) {
      showFeedback("Lütfen ad soyad, e-posta ve şifre alanlarını doldurun.");
      return;
    }

    if (trimmedPassword.length < 6) {
      showFeedback("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsCreatingAccount(true);

    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword),
        AUTH_TIMEOUT_MS,
        "Kayıt işlemi zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.",
      );

      const user = userCredential.user;

      try {
        await updateProfile(user, {
          displayName: trimmedFullName,
        });
      } catch (profileError) {
        console.warn("Profil adı güncellenemedi:", profileError?.message);
      }

      try {
        await withTimeout(
          saveUserProfile(user, trimmedEmail, trimmedFullName),
          10000,
          "Profil kaydı zaman aşımına uğradı.",
        );
      } catch (profileSaveError) {
        console.warn(
          "userProfiles kaydı atlandı:",
          profileSaveError?.message || profileSaveError,
        );
      }

      router.replace("/(tabs)/mytrip");
    } catch (error) {
      console.log("Sign up error:", error?.code, error?.message);
      showFeedback(getSignUpErrorMessage(error));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <View
      style={{
        padding: 25,
        paddingTop: 50,
        backgroundColor: Colors.WHITE,
        height: "100%",
      }}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text
        style={{
          fontFamily: "outfit-bold",
          fontSize: 30,
          marginTop: 30,
        }}
      >
        Yeni Hesap Oluştur
      </Text>
      <View
        style={{
          marginTop: 50,
        }}
      >
        <Text
          style={{
            fontFamily: "outfit",
          }}
        >
          Ad Soyad
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ad ve soyadınızı girin"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
      </View>

      <View
        style={{
          marginTop: 20,
        }}
      >
        <Text
          style={{
            fontFamily: "outfit",
          }}
        >
          E-posta
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta adresinizi girin"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View
        style={{
          marginTop: 20,
        }}
      >
        <Text
          style={{
            fontFamily: "outfit",
          }}
        >
          Şifre
        </Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="Şifrenizi girin (en az 6 karakter)"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.GRAY}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={onCreateAccount}
        disabled={isCreatingAccount}
        style={{
          padding: 15,
          backgroundColor: Colors.PRIMARY,
          borderRadius: 15,
          marginTop: 50,
          opacity: isCreatingAccount ? 0.7 : 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isCreatingAccount ? (
          <ActivityIndicator color={Colors.WHITE} />
        ) : (
          <Text
            style={{
              color: Colors.WHITE,
              textAlign: "center",
            }}
          >
            Hesap Oluştur
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/auth/sign-in")}
        disabled={isCreatingAccount}
        style={{
          padding: 15,
          backgroundColor: Colors.WHITE,
          borderRadius: 15,
          marginTop: 20,
          borderWidth: 1,
        }}
      >
        <Text
          style={{
            color: Colors.PRIMARY,
            textAlign: "center",
          }}
        >
          Giriş Yap
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  input: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    borderColor: Colors.GRAY,
    fontFamily: "outfit",
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 46,
  },
  passwordToggle: {
    position: "absolute",
    right: 14,
    top: 13,
  },
});
