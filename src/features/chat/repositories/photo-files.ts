import type { LocalPhoto } from "../attachment-domain";
// Native is the product target. Keep legacy web routes from importing native modules.
export async function choosePhoto(_actor: string): Promise<LocalPhoto | null> {
  throw Error("Photo sending is available in the iOS and Android apps.");
}
export async function readPhoto(
  _actor: string,
  _photo: LocalPhoto
): Promise<string> {
  throw Error("Open Palla on iOS or Android.");
}
export async function removePhoto(_actor: string, _photo: LocalPhoto) {}
export async function savePhoto(_url: string) {
  throw Error("Photo saving is available in the iOS and Android apps.");
}
