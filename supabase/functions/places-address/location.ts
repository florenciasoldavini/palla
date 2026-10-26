export const addressTypes = ["street_address", "premise", "subpremise"];
export function placeLocation(data: Record<string, unknown>) {
  const location = data.location as
    { latitude?: unknown; longitude?: unknown } | undefined;
  if (
    !Array.isArray(data.types) ||
    !data.types.some((t) => addressTypes.includes(t)) ||
    typeof data.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,512}$/.test(data.id) ||
    typeof data.formattedAddress !== "string" ||
    !data.formattedAddress.length ||
    data.formattedAddress.length > 300 ||
    typeof location?.latitude !== "number" ||
    !Number.isFinite(location.latitude) ||
    Math.abs(location.latitude) > 90 ||
    typeof location?.longitude !== "number" ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.longitude) > 180
  )
    return null;
  return {
    placeId: data.id,
    address: data.formattedAddress,
    latitude: location.latitude,
    longitude: location.longitude
  };
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bav\.?\b/g, "avenida")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function matchesAddress(input: string, data: Record<string, unknown>) {
  if (!Array.isArray(data.addressComponents)) return false;
  const components = data.addressComponents;
  const component = (kind: string) =>
    components.find((c) => Array.isArray(c.types) && c.types.includes(kind))
      ?.longText;
  const number = component("street_number"),
    street = component("route");
  const city =
    component("locality") ?? component("administrative_area_level_2");
  const query = normalize(input);
  return (
    typeof number === "string" &&
    typeof street === "string" &&
    query.split(" ").includes(normalize(number)) &&
    query.includes(normalize(street)) &&
    (typeof city !== "string" ||
      query.includes(normalize(city)) ||
      (normalize(city).includes("buenos aires") && /\bcaba\b/.test(query)))
  );
}
