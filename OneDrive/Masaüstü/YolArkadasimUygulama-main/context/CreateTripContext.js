import { createContext } from "react";

export const CreateTripContext = createContext(null);

// Seyahat verisi için varsayılan yapı
export const defaultTripData = {
  selectedPlace: null,
  startDate: null,
  endDate: null,
  duration: null,
  travelers: 1,
  budget: null,
  interests: [],
  accommodation: null,
  transportation: null,
};