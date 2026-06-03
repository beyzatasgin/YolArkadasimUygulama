import Constants from "expo-constants";
import type { AIProvider } from "../types/ai";

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const readEnv = (key: string, extraKey?: string): string =>
  (process.env[key] as string | undefined) ||
  (extraKey ? (extra[extraKey] as string | undefined) : undefined) ||
  "";

export const getOpenAiApiKey = (): string =>
  readEnv("EXPO_PUBLIC_OPENAI_API_KEY", "openaiApiKey");

export const getGeminiApiKey = (): string =>
  readEnv("EXPO_PUBLIC_GEMINI_API_KEY", "geminiApiKey");

export const getGooglePlacesApiKey = (): string =>
  readEnv("EXPO_PUBLIC_GOOGLE_PLACES_API_KEY", "googlePlacesApiKey") ||
  readEnv("EXPO_PUBLIC_GOOGLE_MAP_KEY", "googleMapKey");

export const getFirebaseConfig = () => ({
  apiKey: readEnv("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readEnv("EXPO_PUBLIC_FIREBASE_APP_ID"),
});

export const isPlaceholderKey = (value?: string | null): boolean =>
  !value || value.includes("YOUR_") || value.trim().length === 0;

export const shouldUseApiProxy = (): boolean =>
  readEnv("EXPO_PUBLIC_USE_API_PROXY") === "true";

export const getFunctionsRegion = (): string =>
  readEnv("EXPO_PUBLIC_FUNCTIONS_REGION") || "europe-west1";

export const getAiProvider = (): AIProvider => {
  const value = readEnv("EXPO_PUBLIC_AI_PROVIDER").toLowerCase();
  if (value === "openai" || value === "gemini" || value === "auto") {
    return value;
  }
  return "auto";
};

export const getFunctionsEmulatorHost = (): string =>
  readEnv("EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST");
