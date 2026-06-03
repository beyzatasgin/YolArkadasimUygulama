import { httpsCallable } from "firebase/functions";
import { getGooglePlacesApiKey, isPlaceholderKey, shouldUseApiProxy } from "../configs/env";
import { getFirebaseFunctions } from "../configs/firebaseFunctions";

export type DiscoverPlace = {
  id: string;
  placeId?: string;
  title: string;
  description: string;
  coordinates: { lat: number; lon: number } | null;
  image?: string;
  url?: string | null;
};

export type AutocompletePrediction = {
  placeId: string;
  text: string;
};

async function searchPlacesViaProxy(
  query: string,
  mode: "search" | "autocomplete",
): Promise<DiscoverPlace[] | AutocompletePrediction[]> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<
    { query: string; mode: "search" | "autocomplete" },
    { results: DiscoverPlace[] | AutocompletePrediction[] }
  >(functions, "searchPlaces");

  const result = await callable({ query, mode });
  return result.data.results || [];
}

async function searchPlacesDirect(query: string): Promise<DiscoverPlace[]> {
  const apiKey = getGooglePlacesApiKey();
  if (isPlaceholderKey(apiKey)) {
    throw new Error("Google Places API anahtarı bulunamadı");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "tr" }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(errorBody?.error?.message || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    places?: {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      googleMapsUri?: string;
    }[];
  };

  if (!Array.isArray(data.places)) return [];

  return data.places.map((place, index) => ({
    id: place.id || `place-${index}`,
    placeId: place.id,
    title: place.displayName?.text || "Bilinmeyen Yer",
    description: place.formattedAddress || "",
    coordinates:
      place.location?.latitude != null && place.location?.longitude != null
        ? { lat: place.location.latitude, lon: place.location.longitude }
        : null,
    url: place.googleMapsUri ?? null,
  }));
}

async function autocompletePlacesDirect(
  query: string,
): Promise<AutocompletePrediction[]> {
  const apiKey = getGooglePlacesApiKey();
  if (isPlaceholderKey(apiKey)) {
    throw new Error("Google Places API anahtarı bulunamadı");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({ input: query, languageCode: "tr" }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(errorBody?.error?.message || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
      };
    }[];
  };

  if (!Array.isArray(data.suggestions)) return [];

  return data.suggestions
    .map((item) => {
      const prediction = item.placePrediction;
      if (!prediction?.placeId) return null;
      return {
        placeId: prediction.placeId,
        text: prediction.text?.text || "",
      };
    })
    .filter((item): item is AutocompletePrediction => item !== null);
}

export async function searchDiscoverPlaces(
  query: string,
): Promise<DiscoverPlace[]> {
  if (shouldUseApiProxy()) {
    try {
      return (await searchPlacesViaProxy(query, "search")) as DiscoverPlace[];
    } catch (error) {
      if (!isPlaceholderKey(getGooglePlacesApiKey())) {
        console.warn("Places proxy failed, using direct:", error);
        return searchPlacesDirect(query);
      }
      throw error;
    }
  }
  return searchPlacesDirect(query);
}

export async function autocompletePlaces(
  query: string,
): Promise<AutocompletePrediction[]> {
  if (shouldUseApiProxy()) {
    try {
      return (await searchPlacesViaProxy(
        query,
        "autocomplete",
      )) as AutocompletePrediction[];
    } catch (error) {
      if (!isPlaceholderKey(getGooglePlacesApiKey())) {
        return autocompletePlacesDirect(query);
      }
      throw error;
    }
  }
  return autocompletePlacesDirect(query);
}
