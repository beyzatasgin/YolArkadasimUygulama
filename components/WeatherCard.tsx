import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type WeatherData = {
  current: {
    temperature: number;
    windspeed: number;
    weathercode: number;
  };
  current_weather: {
    temperature: number;
    windspeed: number;
    weathercode: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
};

type Props = {
  latitude: number;
  longitude: number;
  placeName?: string;
};

const WMO_DESCRIPTIONS: Record<number, { label: string; icon: string; color: string }> = {
  0:  { label: "Açık",              icon: "sunny",              color: "#F59E0B" },
  1:  { label: "Çoğunlukla Açık",   icon: "partly-sunny",       color: "#FBBF24" },
  2:  { label: "Parçalı Bulutlu",   icon: "partly-sunny",       color: "#9CA3AF" },
  3:  { label: "Bulutlu",           icon: "cloudy",             color: "#6B7280" },
  45: { label: "Sisli",             icon: "cloudy",             color: "#9CA3AF" },
  48: { label: "Dondurucu Sis",     icon: "cloudy",             color: "#9CA3AF" },
  51: { label: "Hafif Çisenti",     icon: "rainy",              color: "#60A5FA" },
  53: { label: "Çisenti",           icon: "rainy",              color: "#3B82F6" },
  55: { label: "Yoğun Çisenti",     icon: "rainy",              color: "#2563EB" },
  61: { label: "Hafif Yağmur",      icon: "rainy",              color: "#60A5FA" },
  63: { label: "Yağmurlu",          icon: "rainy",              color: "#3B82F6" },
  65: { label: "Şiddetli Yağmur",   icon: "rainy",              color: "#1D4ED8" },
  71: { label: "Hafif Kar",         icon: "snow",               color: "#BAE6FD" },
  73: { label: "Karlı",             icon: "snow",               color: "#7DD3FC" },
  75: { label: "Yoğun Kar",         icon: "snow",               color: "#38BDF8" },
  77: { label: "Kar Taneleri",      icon: "snow",               color: "#7DD3FC" },
  80: { label: "Hafif Sağanak",     icon: "rainy",              color: "#60A5FA" },
  81: { label: "Sağanak Yağış",     icon: "rainy",              color: "#3B82F6" },
  82: { label: "Şiddetli Sağanak",  icon: "rainy",              color: "#1D4ED8" },
  95: { label: "Fırtınalı",         icon: "thunderstorm",       color: "#7C3AED" },
  96: { label: "Dolu ile Fırtına",  icon: "thunderstorm",       color: "#6D28D9" },
  99: { label: "Şiddetli Fırtına",  icon: "thunderstorm",       color: "#5B21B6" },
};

function getWeatherInfo(code: number) {
  return WMO_DESCRIPTIONS[code] ?? { label: "Bilinmiyor", icon: "cloud", color: "#9CA3AF" };
}

const DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function WeatherCard({ latitude, longitude, placeName }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current_weather=true` +
          `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
          `&timezone=auto&forecast_days=7`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Hava durumu alınamadı");
        const json = await res.json();
        setWeather(json);
      } catch (err) {
        setError("Hava durumu yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={styles.loadingText}>Hava durumu yükleniyor...</Text>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.errorBox}>
        <Ionicons name="cloud-offline-outline" size={22} color="#9CA3AF" />
        <Text style={styles.errorText}>{error ?? "Hava durumu alınamadı"}</Text>
      </View>
    );
  }

  const current = weather.current_weather;
  const currentInfo = getWeatherInfo(current.weathercode);

  return (
    <View style={styles.container}>
      {/* Şu anki hava */}
      <View style={styles.currentRow}>
        <View>
          <Text style={styles.tempText}>{Math.round(current.temperature)}°C</Text>
          <Text style={styles.descText}>{currentInfo.label}</Text>
          <View style={styles.windRow}>
            <Ionicons name="navigate-outline" size={13} color="#9CA3AF" />
            <Text style={styles.windText}>{Math.round(current.windspeed)} km/s</Text>
          </View>
        </View>
        <View style={[styles.iconCircle, { backgroundColor: currentInfo.color + "22" }]}>
          <Ionicons name={currentInfo.icon as any} size={40} color={currentInfo.color} />
        </View>
      </View>

      {/* 7 günlük tahmin */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
        {weather.daily.time.map((dateStr, i) => {
          const date = new Date(dateStr);
          const info = getWeatherInfo(weather.daily.weathercode[i]);
          const dayLabel = i === 0 ? "Bugün" : DAYS_TR[date.getDay()];
          return (
            <View key={dateStr} style={styles.dayBox}>
              <Text style={styles.dayLabel}>{dayLabel}</Text>
              <Ionicons name={info.icon as any} size={20} color={info.color} />
              <Text style={styles.maxTemp}>{Math.round(weather.daily.temperature_2m_max[i])}°</Text>
              <Text style={styles.minTemp}>{Math.round(weather.daily.temperature_2m_min[i])}°</Text>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.source}>Open-Meteo • {placeName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    backgroundColor: "#F0F4FF",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  currentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tempText: {
    fontFamily: "outfit-bold",
    fontSize: 38,
    color: "#1E293B",
  },
  descText: {
    fontFamily: "outfit-medium",
    fontSize: 14,
    color: "#475569",
    marginTop: 2,
  },
  windRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  windText: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "#9CA3AF",
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  forecastScroll: {
    marginTop: 4,
  },
  dayBox: {
    alignItems: "center",
    marginRight: 16,
    gap: 4,
    minWidth: 46,
  },
  dayLabel: {
    fontFamily: "outfit",
    fontSize: 11,
    color: "#64748B",
  },
  maxTemp: {
    fontFamily: "outfit-bold",
    fontSize: 13,
    color: "#1E293B",
  },
  minTemp: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "#94A3B8",
  },
  source: {
    fontFamily: "outfit",
    fontSize: 11,
    color: "#CBD5E1",
    textAlign: "right",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#9CA3AF",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  errorText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#9CA3AF",
  },
});
