export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
/** Inspect JPEG frame dimensions rather than trusting filenames or client metadata. */
export function jpegDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 16 ||
    bytes.length > MAX_PHOTO_BYTES ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    throw Error("invalid_photo");
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) throw Error("invalid_photo");
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length)
      throw Error("invalid_photo");
    if ([192, 193, 194].includes(marker)) {
      if (length < 8) throw Error("invalid_photo");
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (!width || !height || width > 4096 || height > 4096)
        throw Error("invalid_photo");
      return { width, height };
    }
    offset += length;
  }
  throw Error("invalid_photo");
}
