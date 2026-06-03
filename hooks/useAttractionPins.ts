import { useEffect, useState } from "react";
import type { MapPin } from "../components/TripMap";

type PlaceItem = string | { name?: string; [key: string]: unknown };

type PlaceList = {
  attractions?: PlaceItem[];
  restaurants?: PlaceItem[];
  accommodations?: PlaceItem[];
};

function extractName(item: PlaceItem): string {
  if (typeof item === "string") return item;
  return (item?.name as string) ?? "";
}

async function geocode(
  name: string,
  nearLat: number,
  nearLon: number,
): Promise<{ lat: number; lon: number } | null> {
  try {
    const viewbox = `${nearLon - 1},${nearLat - 1},${nearLon + 1},${nearLat + 1}`;
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(name)}` +
      `&format=json&limit=1&bounded=1&viewbox=${viewbox}`;

    const res = await fetch(url, {
      headers: { "Accept-Language": "tr,en" },
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.length) return null;
    return { lat: Number(results[0].lat), lon: Number(results[0].lon) };
  } catch {
    return null;
  }
}

// Rate-limited sequential geocoder (Nominatim allows 1 req/s)
async function geocodeAll(
  places: PlaceList,
  centerLat: number,
  centerLon: number,
): Promise<MapPin[]> {
  const pins: MapPin[] = [];
  const MAX_PER_TYPE = 4;

  const entries: Array<{ name: string; type: MapPin["type"] }> = [
    ...(places.attractions?.slice(0, MAX_PER_TYPE) ?? []).map((n) => ({
      name: extractName(n),
      type: "attraction" as const,
    })),
    ...(places.restaurants?.slice(0, MAX_PER_TYPE) ?? []).map((n) => ({
      name: extractName(n),
      type: "restaurant" as const,
    })),
    ...(places.accommodations?.slice(0, MAX_PER_TYPE) ?? []).map((n) => ({
      name: extractName(n),
      type: "accommodation" as const,
    })),
  ].filter((e) => e.name.trim() !== "");

  for (const entry of entries) {
    const coords = await geocode(entry.name, centerLat, centerLon);
    if (coords) {
      pins.push({
        id: `${entry.type}-${pins.length}-${entry.name.slice(0, 20)}`,
        name: entry.name,
        type: entry.type,
        lat: coords.lat,
        lon: coords.lon,
      });
    }
    // Nominatim rate limit: 1 req/s
    await new Promise((r) => setTimeout(r, 1100));
  }

  return pins;
}

export function useAttractionPins(
  places: PlaceList | null | undefined,
  centerLat: number | undefined,
  centerLon: number | undefined,
) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!places || centerLat == null || centerLon == null) return;

    const hasAny =
      (places.attractions?.length ?? 0) +
        (places.restaurants?.length ?? 0) +
        (places.accommodations?.length ?? 0) >
      0;
    if (!hasAny) return;

    let cancelled = false;
    setLoading(true);

    geocodeAll(places, centerLat, centerLon).then((result) => {
      if (!cancelled) {
        setPins(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    centerLat,
    centerLon,
    // Stringify to avoid re-running on shallow reference changes
    JSON.stringify(places),
  ]);

  return { pins, loading };
}
