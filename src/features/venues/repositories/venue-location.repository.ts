import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { venueCoordinatesShape } from "../coordinates";
export { geocodeAddress as lookupAddressCoordinates } from "@/infrastructure/maps/geocode-address";
export async function fetchVenueLocation(id: string) {
  if (!supabase) throw new Error("Venue access is unavailable");
  const { data, error } = await supabase
    .from("venues")
    .select("address,latitude,longitude")
    .eq("id", id)
    .single();
  if (error) throw error;
  return z
    .object({ address: z.string().nullable(), ...venueCoordinatesShape })
    .parse(data);
}
