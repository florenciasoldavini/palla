import { matchesAddress, placeLocation } from "./location.ts";
const valid = {
  id: "google-place",
  formattedAddress: "Avenida Santa Fe 4000, Buenos Aires",
  types: ["street_address"],
  location: { latitude: -34.58, longitude: -58.42 },
  addressComponents: [
    { longText: "4000", types: ["street_number"] },
    { longText: "Avenida Santa Fe", types: ["route"] },
    { longText: "Buenos Aires", types: ["locality"] }
  ]
};
Deno.test("accepts a precise Google address and finite coordinates", () => {
  if (!placeLocation(valid)) throw new Error("Expected valid location");
  for (const value of [
    { ...valid, location: { latitude: 91, longitude: 0 } },
    { ...valid, location: { latitude: NaN, longitude: 0 } },
    { ...valid, types: ["locality"] },
    { ...valid, location: undefined }
  ]) {
    if (placeLocation(value))
      throw new Error("Invalid or imprecise location accepted");
  }
});
Deno.test("manual text lookup rejects wrong street, number and city", () => {
  if (!matchesAddress("Av Santa Fe 4000, Buenos Aires", valid))
    throw new Error("Expected matching address");
  for (const input of [
    "Av Santa Fe 4001, Buenos Aires",
    "Another Street 4000, Buenos Aires",
    "Av Santa Fe 4000, Rosario",
    "Buenos Aires"
  ]) {
    if (matchesAddress(input, valid))
      throw new Error("Unrelated address accepted");
  }
});
