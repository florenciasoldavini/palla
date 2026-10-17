import * as Picker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { randomUUID } from "expo-crypto";
import { entityIdSchema } from "@/types/domain-schema";
import { localPhotoSchema, type LocalPhoto } from "../attachment-domain";
const directory = (actor: string) =>
  `${FileSystem.documentDirectory}chat-photos/${entityIdSchema.parse(actor)}/`;
function owned(actor: string, photo: LocalPhoto) {
  if (photo.uri !== `${directory(actor)}${photo.id}.jpg`)
    throw Error("Photo unavailable on this device.");
  return photo.uri;
}
export async function choosePhoto(actor: string): Promise<LocalPhoto | null> {
  const result = await Picker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: false,
    allowsEditing: false,
    quality: 1,
    exif: false
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.width || !asset.height || asset.width * asset.height > 48000000)
    throw Error("Choose a smaller photo to send.");
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > 2048)
    context.resize(
      asset.width >= asset.height ? { width: 2048 } : { height: 2048 }
    );
  const image = await context.renderAsync();
  const processed = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.82
  });
  const info = await FileSystem.getInfoAsync(processed.uri);
  if (!info.exists || info.size > 4 * 1024 * 1024)
    throw Error("This photo is too large. Choose a smaller photo.");
  const id = randomUUID(),
    uri = `${directory(actor)}${id}.jpg`;
  await FileSystem.makeDirectoryAsync(directory(actor), {
    intermediates: true
  });
  await FileSystem.copyAsync({ from: processed.uri, to: uri });
  return localPhotoSchema.parse({
    id,
    uri,
    width: processed.width,
    height: processed.height,
    size: info.size
  });
}
export const readPhoto = (actor: string, photo: LocalPhoto) =>
  FileSystem.readAsStringAsync(owned(actor, photo), {
    encoding: FileSystem.EncodingType.Base64
  });
export const removePhoto = (actor: string, photo: LocalPhoto) =>
  FileSystem.deleteAsync(owned(actor, photo), { idempotent: true });
export async function savePhoto(url: string) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted)
    throw Error("Allow photo access in Settings to save this photo.");
  const uri = `${FileSystem.cacheDirectory}palla-photo-${randomUUID()}.jpg`;
  try {
    if (url.startsWith("file://")) {
      await MediaLibrary.saveToLibraryAsync(url);
      return;
    }
    await FileSystem.downloadAsync(url, uri);
    await MediaLibrary.saveToLibraryAsync(uri);
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined
    );
  }
}
