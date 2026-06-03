import { useContext } from "react";
import { CreateTripContext } from "../context/CreateTripContext";
import type { CreateTripContextValue } from "../types/trip";

export function useCreateTrip(): CreateTripContextValue {
  const context = useContext(CreateTripContext);
  if (!context) {
    throw new Error("useCreateTrip must be used within CreateTripContext.Provider");
  }
  return context;
}
