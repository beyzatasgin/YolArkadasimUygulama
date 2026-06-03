import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Colors } from "../constants/Colors";
import type { Coordinates } from "../types/trip";

type TripMapProps = {
  coordinates?: Coordinates | null;
  title?: string;
};

export default function TripMap({ coordinates, title }: TripMapProps) {
  if (!coordinates?.lat || !coordinates?.lon) {
    return null;
  }

  const latitude = Number(coordinates.lat);
  const longitude = Number(coordinates.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={Platform.OS !== "web"}
        showsMyLocationButton={Platform.OS !== "web"}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title || "Destinasyon"}
        />
      </MapView>
      {title ? <Text style={styles.caption}>{title}</Text> : null}
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
    height: 200,
  },
  caption: {
    padding: 10,
    fontFamily: "outfit",
    fontSize: 13,
    color: Colors.GRAY,
    backgroundColor: "#F8F9FA",
  },
});
