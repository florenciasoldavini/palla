import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import {
  registerPushDevice,
  unregisterPushDevice
} from "../repositories/push.repository";

const installationKey = "palla-push-installation-v1";
const pendingRevocationKey = "palla-push-pending-revocation-v1";
let installationPromise: Promise<string> | undefined;
export function pushSupported() {
  return (
    Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient"
  );
}
async function installationId() {
  return (installationPromise ??= (async () => {
    const saved = await SecureStore.getItemAsync(installationKey);
    if (saved) return saved;
    const id = randomUUID();
    await SecureStore.setItemAsync(installationKey, id);
    return id;
  })().catch((error) => {
    installationPromise = undefined;
    throw error;
  }));
}
// Serialize registration and sign-out so an in-flight token fetch cannot re-enable a signed-out device.
let pending = Promise.resolve();
let generation = 0;
export function cancelPushRegistration() {
  generation += 1;
}
export function registerCurrentPushDevice(
  actor: string,
  current: () => boolean
) {
  if (!pushSupported()) return Promise.resolve();
  const version = generation;
  const operation = pending
    .catch(() => undefined)
    .then(async () => {
      const notifications = await import("expo-notifications");
      if (!current() || version !== generation) return;
      if (Platform.OS === "android") {
        await notifications.setNotificationChannelAsync("chat", {
          name: "Messages",
          importance: notifications.AndroidImportance.HIGH,
          sound: "default"
        });
        await notifications.setNotificationChannelAsync("cancellations", {
          name: "Session cancellations",
          importance: notifications.AndroidImportance.HIGH,
          sound: "default"
        });
        await notifications.setNotificationChannelAsync("registrations", {
          name: "Player registrations",
          importance: notifications.AndroidImportance.HIGH
        });
        await notifications.setNotificationChannelAsync("announcements", {
          name: "Session announcements",
          importance: notifications.AndroidImportance.HIGH,
          sound: "default"
        });
        await notifications.setNotificationChannelAsync("reviews", {
          name: "Reviews",
          importance: notifications.AndroidImportance.HIGH,
          sound: "default"
        });
      }
      let permission = await notifications.getPermissionsAsync();
      if (!permission.granted && permission.canAskAgain)
        permission = await notifications.requestPermissionsAsync();
      if (!current() || version !== generation) return;
      const installation = await installationId();
      const pendingRevocation =
        await SecureStore.getItemAsync(pendingRevocationKey);
      if (pendingRevocation) {
        await unregisterPushDevice(pendingRevocation);
        await SecureStore.deleteItemAsync(pendingRevocationKey);
      }
      if (!current() || version !== generation) return;
      if (
        !permission.granted &&
        permission.ios?.status !==
          notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        await unregisterPushDevice(installation);
        return;
      }
      const projectId =
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;
      if (typeof projectId !== "string") return;
      const token = (await notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      if (!current() || version !== generation) return;
      await registerPushDevice(
        installation,
        token,
        Platform.OS as "ios" | "android",
        actor
      );
    });
  pending = operation.catch(() => undefined);
  return operation;
}
export async function unregisterCurrentPushDevice() {
  cancelPushRegistration();
  if (!pushSupported()) return;
  await pending;
  const installation = await SecureStore.getItemAsync(installationKey);
  if (installation) {
    await SecureStore.setItemAsync(pendingRevocationKey, installation);
    await unregisterPushDevice(installation);
    await SecureStore.deleteItemAsync(pendingRevocationKey);
  }
  const notifications = await import("expo-notifications");
  await notifications.dismissAllNotificationsAsync();
  await notifications.clearLastNotificationResponseAsync();
}
