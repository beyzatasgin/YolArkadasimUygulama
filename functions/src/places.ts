import type { GoogleRecommendations, PlaceRecommendation } from "./types";

const buildGooglePhotoUrl = (photoName: string | undefined, apiKey: string) => {
  if (!photoName || !apiKey) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&key=${apiKey}`;
};

export async function fetchGooglePlacesByQuery(
  apiKey: string,
  textQuery: string,
  coordinates?: { lat: number; lon: number } | null,
  maxResultCount = 3,
): Promise<PlaceRecommendation[]> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount,places.photos.name",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "tr",
        maxResultCount,
        ...(coordinates?.lat != null && coordinates?.lon != null
          ? {
              locationBias: {
                circle: {
                  center: {
                    latitude: Number(coordinates.lat),
                    longitude: Number(coordinates.lon),
                  },
                  radius: 25000,
                },
              },
            }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      errorBody?.error?.message ||
        `Google Places API hatası: ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    places?: {
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: { name?: string }[];
    }[];
  };

  if (!Array.isArray(data?.places)) return [];

  const results: PlaceRecommendation[] = [];
  for (const place of data.places) {
    const name = place.displayName?.text;
    if (!name) continue;
    results.push({
      name,
      address: place.formattedAddress || "Adres bilgisi yok",
      rating: place.rating ?? null,
      totalReviews: place.userRatingCount ?? null,
      url: place.googleMapsUri ?? null,
      photoUrl: buildGooglePhotoUrl(place.photos?.[0]?.name, apiKey),
    });
  }
  return results;
}

export async function fetchGoogleRecommendations(
  apiKey: string,
  placeName: string,
  coordinates?: { lat: number; lon: number } | null,
): Promise<GoogleRecommendations> {
  const [accommodations, restaurants, attractions] = await Promise.all([
    fetchGooglePlacesByQuery(apiKey, `${placeName} otel konaklama`, coordinates),
    fetchGooglePlacesByQuery(
      apiKey,
      `${placeName} en iyi restoran`,
      coordinates,
    ),
    fetchGooglePlacesByQuery(apiKey, `${placeName} gezilecek yer`, coordinates),
  ]);

  return { accommodations, restaurants, attractions };
}

export async function searchPlacesText(
  apiKey: string,
  textQuery: string,
): Promise<
  {
    id: string;
    title: string;
    description: string;
    coordinates: { lat: number; lon: number } | null;
    url: string | null;
  }[]
> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery, languageCode: "tr" }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(errorBody?.error?.message || `Places search: ${response.status}`);
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
    title: place.displayName?.text || "Bilinmeyen Yer",
    description: place.formattedAddress || "",
    coordinates:
      place.location?.latitude != null && place.location?.longitude != null
        ? { lat: place.location.latitude, lon: place.location.longitude }
        : null,
    url: place.googleMapsUri ?? null,
  }));
}

export async function autocompletePlaces(
  apiKey: string,
  input: string,
): Promise<{ placeId: string; text: string }[]> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({ input, languageCode: "tr" }),
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(errorBody?.error?.message || `Autocomplete: ${response.status}`);
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
    .filter((item): item is { placeId: string; text: string } => item !== null);
}
