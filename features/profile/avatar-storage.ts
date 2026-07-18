export type ProfileAvatarAssetMetadata = {
  fileName?: string | null;
  mimeType?: string | null;
};

export function buildProfileAvatarPath({
  asset,
  userId,
  uuid = createRandomId()
}: {
  asset: ProfileAvatarAssetMetadata;
  userId: string;
  uuid?: string;
}) {
  return `users/${userId}/avatar/${uuid}.${getAvatarExtension(asset)}`;
}

export function getMimeTypeFromExtension(extension: string) {
  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "heic") {
    return "image/heic";
  }

  if (extension === "heif") {
    return "image/heif";
  }

  return "image/jpeg";
}

function createRandomId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);

    // RFC 4122 version 4 UUID bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  throw new Error("Secure random generator unavailable");
}

function getAvatarExtension(asset: ProfileAvatarAssetMetadata) {
  const fileExtension = asset.fileName?.split(".").pop()?.toLowerCase();

  if (
    fileExtension &&
    ["heic", "heif", "jpeg", "jpg", "png", "webp"].includes(fileExtension)
  ) {
    return fileExtension === "jpeg" ? "jpg" : fileExtension;
  }

  if (asset.mimeType?.includes("png")) {
    return "png";
  }

  if (asset.mimeType?.includes("webp")) {
    return "webp";
  }

  if (asset.mimeType?.includes("heic")) {
    return "heic";
  }

  if (asset.mimeType?.includes("heif")) {
    return "heif";
  }

  return "jpg";
}
