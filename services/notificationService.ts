import Constants from "expo-constants";
import { Platform } from "react-native";

// Expo Go'da expo-notifications modülü import edilir edilmez
// DevicePushTokenAutoRegistration side-effect'i çalışır ve hata verir.
// Bu yüzden Expo Go'da modülü hiç import etmiyoruz.
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  (Constants.appOwnership != null && Constants.appOwnership === "expo");

// Bildirim handler'ını sadece gerçek build'de kur
if (!isExpoGo) {
  // Dinamik import — Expo Go'da bu satır hiç çalışmaz
  import("expo-notifications").then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }).catch(() => {});
}

/** Kullanıcıdan bildirim izni ister. Daha önce verildiyse tekrar sormaz. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const Notifications = await import("expo-notifications");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
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
  if (isExpoGo) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const Notifications = await import("expo-notifications");

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
  if (isExpoGo) return;
  try {
    const Notifications = await import("expo-notifications");
    await Promise.all([
      Notifications.cancelScheduledNotificationAsync(`trip-before-${tripId}`).catch(() => {}),
      Notifications.cancelScheduledNotificationAsync(`trip-day-${tripId}`).catch(() => {}),
    ]);
  } catch {}
}
