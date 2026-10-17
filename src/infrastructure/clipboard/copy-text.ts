import * as Clipboard from "expo-clipboard";
/** Write only explicitly selected text; never inspect the user's clipboard. */
export async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
}
