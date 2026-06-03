import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { Colors } from "../constants/Colors";
import type { Coordinates } from "../types/trip";

export type MapPin = {
  id: string;
  name: string;
  type: "attraction" | "restaurant" | "accommodation";
  lat: number;
  lon: number;
};

type TripMapProps = {
  coordinates?: Coordinates | null;
  title?: string;
  extraPins?: MapPin[];
};

const PIN_COLORS: Record<MapPin["type"], string> = {
  attraction:    "#6366F1",
  restaurant:    "#F59E0B",
  accommodation: "#10B981",
};

const PIN_ICONS: Record<MapPin["type"], string> = {
  attraction:    "flag",
  restaurant:    "restaurant",
  accommodation: "bed",
};

export default function TripMap({ coordinates, title, extraPins = [] }: TripMapProps) {
  if (!coordinates?.lat || !coordinates?.lon) return null;

  const latitude = Number(coordinates.lat);
  const longitude = Number(coordinates.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const allPins = extraPins.filter(
    (p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lon),
  );

  const latitudes  = [latitude, ...allPins.map((p) => p.lat)];
  const longitudes = [longitude, ...allPins.map((p) => p.lon)];
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const deltaLat  = Math.max((maxLat - minLat) * 1.4, 0.08);
  const deltaLon  = Math.max((maxLon - minLon) * 1.4, 0.08);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLon,
          latitudeDelta: deltaLat,
          longitudeDelta: deltaLon,
        }}
        showsUserLocation={Platform.OS !== "web"}
        showsMyLocationButton={Platform.OS !== "web"}
      >
        {/* Ana destinasyon */}
        <Marker
          coordinate={{ latitude, longitude }}
          title={title || "Destinasyon"}
          pinColor="#6366F1"
        />

        {/* Ekstra pinler */}
        {allPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lon }}
            pinColor={PIN_COLORS[pin.type]}
          >
            <Callout>
              <View style={styles.callout}>
                <Ionicons
                  name={PIN_ICONS[pin.type] as any}
                  size={14}
                  color={PIN_COLORS[pin.type]}
                />
                <Text style={styles.calloutText}>{pin.name}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Lejant */}
      {allPins.length > 0 && (
        <View style={styles.legend}>
          <LegendItem color="#6366F1" label="Destinasyon" />
          {allPins.some((p) => p.type === "attraction") && (
            <LegendItem color="#6366F1" label="Turistik" />
          )}
          {allPins.some((p) => p.type === "restaurant") && (
            <LegendItem color="#F59E0B" label="Restoran" />
          )}
          {allPins.some((p) => p.type === "accommodation") && (
            <LegendItem color="#10B981" label="Konaklama" />
          )}
        </View>
      )}

      {title ? <Text style={styles.caption}>{title}</Text> : null}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  map: {
    width: "100%",
    height: 220,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: "outfit",
    fontSize: 11,
    color: Colors.GRAY,
  },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxWidth: 180,
  },
  calloutText: {
    fontSize: 12,
    fontFamily: "outfit",
    flexShrink: 1,
  },
  caption: {
    padding: 10,
    fontFamily: "outfit",
    fontSize: 13,
    color: Colors.GRAY,
    backgroundColor: "#F8F9FA",
  },
});
