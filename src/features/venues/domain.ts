import { entityIdSchema, recordTimestamps } from "@/types/domain-schema";
import { z } from "zod";

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
    id: entityIdSchema,
    created_by: entityIdSchema,
    is_active: z.boolean(),
    ...recordTimestamps
  })
  .refine(hasLocation, {
    path: ["address"],
    message: "A venue needs a place reference or a name and address"
  });

export type Venue = z.infer<typeof venueSchema>;
export type VenueInput = z.infer<typeof venueInputSchema>;
