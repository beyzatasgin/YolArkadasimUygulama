import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Expo Go'da remote push token kaydı SDK 53'ten itibaren desteklenmiyor.
// Yerel (zamanlanmış) bildirimler her ortamda çalışır.
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  (Constants.appOwnership != null && Constants.appOwnership === "expo");

// Bildirim gösterim ayarı — uygulama ön plandayken de banner göster
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} else {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Kullanıcıdan bildirim izni ister. Daha önce verildiyse tekrar sormaz. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    // Expo Go'da bazı izin çağrıları hata fırlatabilir, sessizce geç
    return false;
  }
}

/**
 * Verilen seyahat için iki adet yerel bildirim zamanlar:
 *  - Seyahattan 1 gün önce saat 09:00
 *  - Seyahat günü sabah 08:00
 */
export async function scheduleTripNotifications(params: {
  tripId: string;
  tripName: string;
  placeName: string;
  startDate: Date;
}): Promise<string[]> {
  // Expo Go'da yerel bildirim zamanlaması da kısıtlı — sessizce atla
  if (isExpoGo) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("trip-reminders", {
      name: "Seyahat Hatırlatıcıları",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const now = new Date();
  const ids: string[] = [];

  // 1 gün önce saat 09:00
  const dayBefore = new Date(params.startDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(9, 0, 0, 0);

  if (dayBefore > now) {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `trip-before-${params.tripId}`,
      content: {
        title: "✈️ Yarın yola çıkıyorsun!",
        body: `${params.tripName} – ${params.placeName} seyahatin yarın başlıyor. Bavulunu hazırladın mı?`,
        data: { tripId: params.tripId },
        ...(Platform.OS === "android" && { channelId: "trip-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayBefore,
      },
    });
    ids.push(id);
  }

  // Seyahat günü saat 08:00
  const dayOf = new Date(params.startDate);
  dayOf.setHours(8, 0, 0, 0);

  if (dayOf > now) {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `trip-day-${params.tripId}`,
      content: {
        title: `🌍 Bugün ${params.placeName}'e gidiyorsun!`,
        body: `${params.tripName} seyahatin bugün başlıyor. İyi yolculuklar!`,
        data: { tripId: params.tripId },
        ...(Platform.OS === "android" && { channelId: "trip-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayOf,
      },
    });
    ids.push(id);
  }

  return ids;
}

/** Bir seyahate ait tüm zamanlanmış bildirimleri iptal eder. */
export async function cancelTripNotifications(tripId: string): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(`trip-before-${tripId}`).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(`trip-day-${tripId}`).catch(() => {}),
  ]);
}
