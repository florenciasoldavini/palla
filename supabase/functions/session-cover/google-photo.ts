type Venue = {
  name: string | null;
  address: string | null;
  google_place_id: string | null;
};
type Place = {
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  photos?: {
    name?: string;
    googleMapsUri?: string;
    authorAttributions?: { displayName?: string; uri?: string }[];
  }[];
};
const words = (value: string): string[] =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
export function matchesVenue(venue: Venue, place: Place) {
  const name = words(venue.name ?? "");
  const actual = words(place.displayName?.text ?? "");
  if (!name.length || !name.every((token) => actual.includes(token)))
    return false;
  const address = words(venue.address ?? "");
  const found = words(place.formattedAddress ?? "");
  const numbers = address.filter((token) => /^\d+$/.test(token));
  return (
    address.length >= 2 &&
    numbers.every((token) => found.includes(token)) &&
    address.filter((token) => found.includes(token)).length >= 2
  );
}
export async function resolveGooglePhoto(
  venue: Venue,
  key: string,
  fetcher: typeof fetch = fetch
) {
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key,
    "X-Goog-FieldMask": "displayName,formattedAddress,photos,googleMapsUri"
  };
  const get = async (url: string, init: RequestInit) => {
    const response = await fetcher(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("Venue photo unavailable");
    return response.json();
  };
  let place: Place | undefined;
  if (
    venue.google_place_id &&
    /^[a-zA-Z0-9_-]{1,512}$/.test(venue.google_place_id)
  ) {
    const candidate = await get(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(venue.google_place_id)}`,
      { headers }
    ).catch(() => null);
    if (candidate && matchesVenue(venue, candidate) && candidate.photos?.length)
      place = candidate;
  }
  if (!place && venue.name && venue.address) {
    const result = await get(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          ...headers,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.photos,places.googleMapsUri"
        },
        body: JSON.stringify({
          textQuery: `${venue.name}, ${venue.address}`,
          pageSize: 3,
          languageCode: "es",
          regionCode: "AR"
        })
      }
    );
    const candidates: Place[] = (result.places ?? []).filter(
      (candidate: Place) => matchesVenue(venue, candidate)
    );
    // Ambiguous branches never silently choose a different venue.
    if (candidates.length === 1) place = candidates[0];
  }
  const photo = place?.photos?.[0];
  if (
    !photo?.name ||
    !/^places\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9_-]+$/.test(photo.name)
  )
    return null;
  const media = await get(
    `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1600&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": key } }
  );
  const url = new URL(media.photoUri);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".googleusercontent.com")
  )
    return null;
  return {
    url: url.toString(),
    source: "google",
    authors: (photo.authorAttributions ?? []).map((author) => ({
      name: author.displayName ?? "Photo contributor",
      url: author.uri?.startsWith("https://") ? author.uri : null
    })),
    googleMapsUrl: photo.googleMapsUri ?? place?.googleMapsUri ?? null
  };
}
