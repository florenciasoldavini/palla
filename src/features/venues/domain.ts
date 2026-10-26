import { venueCourtCoverageSchema } from "./court-coverage";
import { entityIdSchema, recordTimestamps } from "@/types/domain-schema";
import { venueAttributesSchema } from "@/features/attributes/domain";
import { z } from "zod";

import { venueCoordinatesShape } from "./coordinates";
// Google-derived place details are fetched through an adapter, not copied here.
const venueShape = {
  google_place_id: z.string().trim().min(1).max(512).nullable(),
  name: z.string().trim().min(1).max(160).nullable(),
  address: z.string().trim().min(1).max(300).nullable(),
  arrival_instructions: z.string().trim().max(1000).nullable()
};

function hasLocation(value: {
  google_place_id: string | null;
  name: string | null;
  address: string | null;
}) {
  return (
    value.google_place_id !== null ||
    (value.name !== null && value.address !== null)
  );
}

export const venueInputSchema = z.strictObject(venueShape).refine(hasLocation, {
  path: ["address"],
  message:
    "Choose a Google place or provide an organizer-entered name and address"
});

export const venueSchema = z
  .strictObject({
    ...venueShape,
    court_coverage: venueCourtCoverageSchema.optional(),
    ...venueCoordinatesShape,
    geocoded_address: z.string().nullable().optional(),
    geocoded_at: z.string().nullable().optional(),
    google_address_place_id: z.string().nullable().optional(),
    coordinate_provider: z.enum(["google", "legacy"]).nullable().optional(),
    coordinates_expires_at: z.string().nullable().optional(),
    coordinates_refresh_after: z.string().nullable().optional(),
    id: entityIdSchema,
    created_by: entityIdSchema,
    is_active: z.boolean(),
    attributes: venueAttributesSchema.default([]),
    ...recordTimestamps
  })
  .refine(hasLocation, {
    path: ["address"],
    message: "A venue needs a place reference or a name and address"
  });

export type Venue = z.infer<typeof venueSchema>;
export type VenueInput = z.infer<typeof venueInputSchema>;
