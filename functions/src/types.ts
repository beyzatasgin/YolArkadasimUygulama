export type PlaceRecommendation = {
  name: string;
  address?: string;
  rating?: number | null;
  totalReviews?: number | null;
  url?: string | null;
  photoUrl?: string | null;
};

export type AIPlan = {
  itinerary: {
    day: number;
    title: string;
    activities: string[];
    time: string;
  }[];
  recommendations: {
    accommodations?: PlaceRecommendation[];
    restaurants?: PlaceRecommendation[];
    attractions?: PlaceRecommendation[];
    tips?: string[];
  };
  estimatedCost?: number | null;
};

export type GenerateTripPlanInput = {
  selectedPlace: {
    name: string;
    coordinates?: { lat: number; lon: number } | null;
  };
  startDate: string;
  endDate: string;
  duration: number;
  travelers: number;
  interests: string[];
  provider?: "openai" | "gemini" | "auto";
};

export type GoogleRecommendations = {
  accommodations: PlaceRecommendation[];
  restaurants: PlaceRecommendation[];
  attractions: PlaceRecommendation[];
};
