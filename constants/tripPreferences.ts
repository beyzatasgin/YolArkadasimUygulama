export const INTEREST_OPTIONS = [
  { id: "culture", label: "Kültür & Tarih", icon: "library" as const },
  { id: "nature", label: "Doğa", icon: "leaf" as const },
  { id: "adventure", label: "Macera", icon: "trail-sign" as const },
  { id: "food", label: "Yemek", icon: "restaurant" as const },
  { id: "shopping", label: "Alışveriş", icon: "bag" as const },
  { id: "nightlife", label: "Gece Hayatı", icon: "moon" as const },
  { id: "beach", label: "Plaj & Deniz", icon: "sunny" as const },
  { id: "history", label: "Tarih", icon: "time" as const },
] as const;

export type InterestId = (typeof INTEREST_OPTIONS)[number]["id"];

export const getInterestLabel = (interestId: string): string => {
  const match = INTEREST_OPTIONS.find((item) => item.id === interestId);
  return match?.label || interestId;
};

export const MIN_TRAVELERS = 1;
export const MAX_TRAVELERS = 20;
