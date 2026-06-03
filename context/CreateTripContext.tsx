import { createContext } from "react";
import type { CreateTripContextValue, TripData } from "../types/trip";

export const CreateTripContext = createContext<CreateTripContextValue | null>(
  null,
);

export const defaultTripData: TripData = {
  selectedPlace: null,
  startDate: null,
  endDate: null,
  duration: null,
  travelers: 1,
  interests: [],
  accommodation: null,
  transportation: null,
  aiPlan: null,
};
