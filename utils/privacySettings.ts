import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PrivacySettings } from "../types/privacy";

const STORAGE_KEY = "@yolarkadasim/privacy_settings";

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  dataSharing: true,
  analytics: true,
  locationTracking: false,
};

export async function loadPrivacySettings(): Promise<PrivacySettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PRIVACY_SETTINGS };
    }
    return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    console.warn("Gizlilik ayarları yüklenemedi:", error);
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
}

export async function savePrivacySettings(
  settings: Partial<PrivacySettings>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_PRIVACY_SETTINGS, ...settings }),
    );
  } catch (error) {
    console.warn("Gizlilik ayarları kaydedilemedi:", error);
  }
}
