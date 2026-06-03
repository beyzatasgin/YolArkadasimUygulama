export type PlaceRecommendation = {
  name: string;
  address?: string;
  rating?: number | null;
  totalReviews?: number | null;
  url?: string | null;
  photoUrl?: string | null;
  price?: string | null;
};

export type DayItinerary = {
  day: number;
  title: string;
  activities: string[];
  time: string;
};

export type AIRecommendations = {
  accommodations?: (PlaceRecommendation | string)[];
  restaurants?: (PlaceRecommendation | string)[];
  attractions?: (PlaceRecommendation | string)[];
  tips?: string[];
};

export type PackingCategory = {
  category: string;
  items: string[];
};

export type AIPlan = {
  itinerary: DayItinerary[];
  recommendations: AIRecommendations;
  estimatedCost?: number | null;
  packingList?: PackingCategory[];
};

export type AIProvider = "openai" | "gemini" | "auto";

export type GenerateTripPlanRequest = {
  selectedPlace: {
    name: string;
    coordinates?: { lat: number; lon: number } | null;
  };
  startDate: string;
  endDate: string;
  duration: number;
  travelers: number;
  interests: string[];
  provider?: AIProvider;
};
