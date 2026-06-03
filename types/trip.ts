import type { Dispatch, SetStateAction } from "react";
import type { AIPlan } from "./ai";

export type Coordinates = {
  lat: number;
  lon: number;
};

export type SelectedPlace = {
  name: string;
  address?: string;
  coordinates?: Coordinates | null;
  url?: string | null;
  photoUrl?: string | null;
  placeId?: string;
};

export type TripData = {
  selectedPlace: SelectedPlace | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  duration: number | null;
  travelers: number;
  interests: string[];
  accommodation?: unknown | null;
  transportation?: unknown | null;
  notes?: string;
  aiPlan?: AIPlan | null;
  tripName?: string;
};

export type SavedTrip = TripData & {
  id: string;
  userId: string;
  tripName: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Firestore'dan gelen seyahat listesi öğesi (kısmi alanlar olabilir) */
export type TripListItem = {
  id: string;
  userId?: string;
  tripName?: string;
  selectedPlace?: SelectedPlace | null;
  startDate?: Date | null;
  endDate?: Date | null;
  duration?: number | null;
  travelers?: number;
  interests?: string[];
  notes?: string;
  aiPlan?: AIPlan | null;
  createdAt?: Date;
};

export type CreateTripContextValue = {
  tripData: TripData;
  setTripData: Dispatch<SetStateAction<TripData>>;
};
