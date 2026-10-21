import { z } from "zod";
import {
  getChatNotificationPreference,
  setChatNotificationPreference
} from "../repositories/preferences.repository";
const preference = z.boolean();
export async function loadChatNotificationPreference() {
  return preference.parse(await getChatNotificationPreference());
}
export async function saveChatNotificationPreference(enabled: boolean) {
  return preference.parse(
    await setChatNotificationPreference(preference.parse(enabled))
  );
}
