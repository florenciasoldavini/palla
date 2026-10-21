import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
export {
  ownCoverUrl,
  requestSessionCover
} from "../repositories/cover.repository";
export async function pickSessionCover(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    quality: 1
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.width || !asset.height || asset.width * asset.height > 48_000_000)
    throw new Error("Choose a smaller photo.");
  const width = Math.min(
    asset.width,
    Math.round(1600 * Math.min(1, asset.width / asset.height))
  );
  const image = await manipulateAsync(asset.uri, [{ resize: { width } }], {
    compress: 0.82,
    format: SaveFormat.JPEG
  });
  return { path: `${userId}/${randomUUID()}.jpg`, uri: image.uri };
}
