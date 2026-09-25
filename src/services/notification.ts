import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { NOTIFICATION_IDS } from "../constants";
import { Shift } from "../types";
import { to24Hour } from "../utils/time";

type NotificationsModule = typeof import("expo-notifications");

let notifications: NotificationsModule | null | undefined;
let notificationHandlerConfigured = false;

/**
 * Expo Go on Android does not include the native push-notification module.
 * Load it only when needed so that the rest of the app can still run there.
 * A development or production build continues to use scheduled reminders.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (notifications !== undefined) return notifications;

  // Importing expo-notifications itself throws in Android Expo Go as of SDK 53.
  // This check must happen before the dynamic import, not in its catch block.
  if (
    Platform.OS === "android" &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    notifications = null;
    return notifications;
  }

  try {
    notifications = await import("expo-notifications");

    if (!notificationHandlerConfigured) {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      notificationHandlerConfigured = true;
    }
  } catch {
    // Notification support is optional in Expo Go. Do not prevent the app's
    // core shift and calendar features from loading when it is unavailable.
    notifications = null;
  }

  return notifications;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleDailyWeatherReminder(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(
    NOTIFICATION_IDS.dailyWeather,
  );
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.dailyWeather,
    content: {
      title: "🌤️ Good Morning!",
      body: "Here's your weather and shift summary for today.",
      data: { type: "weather" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

export async function scheduleShiftNotifications(shift: Shift): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const now = new Date();
  const shiftStart = new Date(`${shift.date}T${to24Hour(shift.startTime)}`);
  const shiftEnd = new Date(`${shift.date}T${to24Hour(shift.endTime)}`);

  const nightBefore = new Date(shiftStart);
  nightBefore.setDate(nightBefore.getDate() - 1);
  nightBefore.setHours(20, 0, 0, 0);

  const thirtyMinBefore = new Date(shiftStart.getTime() - 30 * 60 * 1000);

  const schedule = async (
    id: string,
    title: string,
    body: string,
    date: Date,
  ) => {
    if (date > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body, data: { shiftId: shift.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
    }
  };

  await schedule(
    NOTIFICATION_IDS.shiftNight(shift.id),
    "📋 Shift Tomorrow",
    `You work ${shift.startTime} – ${shift.endTime}${shift.location ? ` at ${shift.location}` : ""}`,
    nightBefore,
  );

  await schedule(
    NOTIFICATION_IDS.shift30Min(shift.id),
    "⏰ Shift in 30 minutes",
    `Get ready! You start at ${shift.startTime}`,
    thirtyMinBefore,
  );

  await schedule(
    NOTIFICATION_IDS.shiftClockIn(shift.id),
    "✅ Clocked In",
    `Shift started! Working until ${shift.endTime}. Good luck! 💪`,
    shiftStart,
  );

  await schedule(
    NOTIFICATION_IDS.shiftClockOut(shift.id),
    "🎉 Shift Complete!",
    `You worked ${shift.hoursWorked} hours. Great work!`,
    shiftEnd,
  );
}
export async function scheduleEventNotification(event: {
  id: string;
  title: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const now = new Date();
  const eventStart = new Date(`${event.date}T${to24Hour(event.startTime)}`);
  const thirtyMinBefore = new Date(eventStart.getTime() - 30 * 60 * 1000);

  if (thirtyMinBefore > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `event-30min-${event.id}`,
      content: {
        title: `⏰ ${event.title} in 30 mins`,
        body: `Starting at ${event.startTime}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: thirtyMinBefore,
      },
    });
  }

  if (eventStart > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `event-start-${event.id}`,
      content: {
        title: `🗓 ${event.title}`,
        body: `Your event is starting now`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: eventStart,
      },
    });
  }
}

export async function cancelShiftNotifications(shiftId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDS.shiftNight(shiftId),
    ),
    Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDS.shift30Min(shiftId),
    ),
    Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDS.shiftClockIn(shiftId),
    ),
    Notifications.cancelScheduledNotificationAsync(
      NOTIFICATION_IDS.shiftClockOut(shiftId),
    ),
  ]);
}

export async function cancelEventNotifications(eventId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(`event-30min-${eventId}`),
    Notifications.cancelScheduledNotificationAsync(`event-start-${eventId}`),
  ]);
}

export async function debugNotifications(event: {
  id: string;
  title: string;
  date: string;
  startTime: string;
}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  // 1. Check permissions
  const { status } = await Notifications.getPermissionsAsync();
  console.log("Permission status:", status);

  // 2. Check what to24Hour returns
  const time24 = to24Hour(event.startTime);
  console.log("to24Hour result:", time24);

  // 3. Check parsed date
  const eventStart = new Date(`${event.date}T${time24}`);
  console.log("Event start:", eventStart.toISOString());
  console.log("Is in future:", eventStart > new Date());

  // 4. List all scheduled notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log("Total scheduled:", scheduled.length);
  scheduled.forEach((n) => console.log(" -", n.identifier, n.trigger));
}
