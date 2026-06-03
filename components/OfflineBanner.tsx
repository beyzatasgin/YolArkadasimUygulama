import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

/**
 * İnternet bağlantısı kesilince ekranın üstünde kırmızı banner gösterir.
 * Bağlantı geri gelince yeşile döner ve 2 saniye sonra kaybolur.
 * Root layout'a eklenirse tüm sayfalarda otomatik çalışır.
 */
export default function OfflineBanner() {
  const { isConnected } = useNetworkStatus();
  const opacity = useRef(new Animated.Value(0)).current;
  const isOffline = isConnected === false;

  useEffect(() => {
    // null (henüz bilinmiyor) ise banner gösterme
    if (isConnected === null) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Bağlantı geri geldiyse 2 saniye sonra gizle
    if (!isOffline) {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isOffline, opacity]);

  // İlk yüklemede (null) ve tekrar bağlandıktan 2sn sonra render etme
  if (isConnected === null) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        isOffline ? styles.offline : styles.online,
        { opacity },
      ]}
    >
      <Ionicons
        name={isOffline ? "wifi-outline" : "checkmark-circle-outline"}
        size={18}
        color="white"
      />
      <Text style={styles.text}>
        {isOffline
          ? "İnternet bağlantısı yok — Kaydedilmiş veriler gösteriliyor"
          : "Bağlantı yeniden sağlandı"}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offline: {
    backgroundColor: "#EF4444",
  },
  online: {
    backgroundColor: "#10B981",
  },
  text: {
    color: "white",
    fontSize: 13,
    fontFamily: "outfit-medium",
    flexShrink: 1,
  },
});
