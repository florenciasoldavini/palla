import { z } from "zod";
export const discoveryRadiusSchema = z.enum(["any", "5", "10", "25"]);
export type DiscoveryRadius = z.infer<typeof discoveryRadiusSchema>;
export const discoveryRadiusOptions: {
  value: DiscoveryRadius;
  label: string;
}[] = [
  { value: "any", label: "Any distance" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" }
];
export function radiusKilometers(radius: DiscoveryRadius) {
  const value = discoveryRadiusSchema.parse(radius);
  return value === "any" ? null : Number(value);
}
