import * as Linking from "expo-linking";

export async function openSessionDestination(url: string) {
  await Linking.openURL(url);
}
