import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { GenerateTripPlanInput } from "./types";
import { generateTripPlanOnServer } from "./tripPlan";
import { autocompletePlaces, searchPlacesText } from "./places";

admin.initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

const getSecret = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const requireAuth = (auth: { uid: string } | undefined) => {
  if (!auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Bu işlem için giriş yapmanız gerekiyor.",
    );
  }
};

export const generateTripPlan = onCall(async (request) => {
  requireAuth(request.auth);

  const data = request.data as GenerateTripPlanInput;

  if (!data?.selectedPlace?.name) {
    throw new HttpsError("invalid-argument", "Destinasyon adı gerekli.");
  }
  if (!data.startDate || !data.endDate) {
    throw new HttpsError("invalid-argument", "Seyahat tarihleri gerekli.");
  }

  const openaiKey = getSecret("OPENAI_API_KEY");
  const geminiKey = getSecret("GEMINI_API_KEY");
  const googleKey = getSecret("GOOGLE_PLACES_API_KEY");

  if (!openaiKey && !geminiKey) {
    throw new HttpsError(
      "failed-precondition",
      "Sunucuda OPENAI_API_KEY veya GEMINI_API_KEY tanımlanmalı.",
    );
  }

  try {
    const aiPlan = await generateTripPlanOnServer(
      {
        ...data,
        duration: data.duration || 1,
        travelers: data.travelers || 1,
        interests: data.interests || [],
      },
      {
        openai: openaiKey,
        gemini: geminiKey,
        googlePlaces: googleKey,
      },
    );

    return { aiPlan };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Plan oluşturulamadı";
    throw new HttpsError("internal", message);
  }
});

export const searchPlaces = onCall(async (request) => {
  requireAuth(request.auth);

  const { query, mode } = request.data as {
    query?: string;
    mode?: "search" | "autocomplete";
  };

  if (!query || query.trim().length < 2) {
    throw new HttpsError("invalid-argument", "En az 2 karakter girin.");
  }

  const googleKey = getSecret("GOOGLE_PLACES_API_KEY");
  if (!googleKey) {
    throw new HttpsError(
      "failed-precondition",
      "Sunucuda GOOGLE_PLACES_API_KEY tanımlanmalı.",
    );
  }

  try {
    if (mode === "autocomplete") {
      const results = await autocompletePlaces(googleKey, query.trim());
      return { results };
    }

    const results = await searchPlacesText(googleKey, query.trim());
    return { results };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Yer araması başarısız";
    throw new HttpsError("internal", message);
  }
});
