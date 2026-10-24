import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { venueCoordinatesShape } from "../coordinates";

export async function fetchVenueLocation(id: string) {
  if (!supabase) throw new Error("Venue access is unavailable");
  const { data, error } = await supabase
    .from("venues")
    .select("address,google_address_place_id,latitude,longitude")
    .eq("id", id)
    .single();
  if (error) throw error;
  return z
    .object({
      address: z.string().nullable(),
      google_address_place_id: z.string().nullable(),
      ...venueCoordinatesShape
    })
    .parse(data);
}
