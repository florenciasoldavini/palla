import {
  advancedFilterCount,
  defaultAdvancedFilters,
  type AdvancedFilters
} from "./advanced-filters";
import {
  courtCoverageSchema,
  venueCourtCoverageSchema
} from "@/features/venues/court-coverage";
import { venueCoordinatesShape } from "@/features/venues/coordinates";
import { z } from "zod";
export const discoverySessionSchema = z.object({
  court_coverage: courtCoverageSchema.nullable().optional(),
  id: z.uuid(),
  title: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  timezone: z.string(),
  capacity: z.number().int().positive(),
  confirmed_count: z.number().int().nonnegative(),
  waitlist_enabled: z.boolean(),
  waitlist_capacity: z.number().int().nonnegative().nullable(),
  waitlisted_count: z.number().int().nonnegative(),
  allowed_categories: z.array(z.number().int().min(1).max(8)).nullable(),
  price_minor: z.number().int().nonnegative(),
  currency: z.string(),
  registration_opens_at: z.string().nullable(),
  registration_closes_at: z.string().nullable(),
  viewer_registration: z.enum(["confirmed", "waitlisted"]).nullable(),
  viewer_is_host: z.boolean(),
  venue: z.object({
    ...venueCoordinatesShape,
    court_coverage: venueCourtCoverageSchema.optional(),
    id: z.uuid(),
    name: z.string(),
    address: z.string().nullable()
  })
});
export type DiscoverySession = z.infer<typeof discoverySessionSchema>;
export type DiscoveryFilters = AdvancedFilters & {
  location: string;
  search: string;
  from: string;
  to: string;
  category: string;
  time: string;
  availability: string;
};
export const defaultFilters: DiscoveryFilters = {
  ...defaultAdvancedFilters,
  location: "Buenos Aires",
  search: "",
  from: "",
  to: "",
  category: "all",
  time: "any",
  availability: "joinable"
};
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type VenuePoint = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  sessions: DiscoverySession[];
};
export function dateKey(
  value: string | number,
  timezone = "America/Argentina/Buenos_Aires"
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}
export function eligibleSession(s: DiscoverySession, now = Date.now()) {
  return (
    Date.parse(s.starts_at) > now &&
    (!s.registration_closes_at || Date.parse(s.registration_closes_at) > now) &&
    (!s.registration_opens_at || Date.parse(s.registration_opens_at) <= now)
  );
}
export function waitlistOpen(s: DiscoverySession) {
  return (
    s.confirmed_count >= s.capacity &&
    s.waitlist_enabled &&
    (s.waitlist_capacity === null || s.waitlisted_count < s.waitlist_capacity)
  );
}
export function sessionStatus(s: DiscoverySession, now = Date.now()) {
  if (s.viewer_is_host) return "Hosting";
  if (s.viewer_registration === "confirmed") return "Registered";
  if (s.viewer_registration === "waitlisted") return "Waitlisted";
  if (waitlistOpen(s)) return "Waitlist open";
  const spots = Math.max(0, s.capacity - s.confirmed_count);
  if (!spots) return "Full";
  if (Date.parse(s.starts_at) - now <= 3 * 3600000) {
    const mins = Math.max(
      1,
      Math.ceil((Date.parse(s.starts_at) - now) / 60000)
    );
    return mins < 60
      ? `Starts in ${mins} min`
      : `Starts in ${Math.floor(mins / 60)}h ${mins % 60 ? `${mins % 60}m` : ""}`.trim();
  }
  return `${spots} ${spots === 1 ? "spot" : "spots"} left`;
}
export function sections(sessions: DiscoverySession[], now = Date.now()) {
  const sorted = sessions
    .filter((s) => eligibleSession(s, now))
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
        a.id.localeCompare(b.id)
    );
  return {
    soon: sorted.filter((s) => Date.parse(s.starts_at) <= now + 3 * 3600000),
    today: sorted.filter(
      (s) =>
        Date.parse(s.starts_at) > now + 3 * 3600000 &&
        dateKey(s.starts_at, s.timezone) === dateKey(now, s.timezone)
    ),
    upcoming: sorted.filter(
      (s) =>
        Date.parse(s.starts_at) > now + 3 * 3600000 &&
        dateKey(s.starts_at, s.timezone) !== dateKey(now, s.timezone)
    )
  };
}
export function inBounds(
  p: { longitude: number; latitude: number },
  b: Bounds
) {
  return (
    p.latitude >= b.south &&
    p.latitude <= b.north &&
    (b.west <= b.east
      ? p.longitude >= b.west && p.longitude <= b.east
      : p.longitude >= b.west || p.longitude <= b.east)
  );
}
export function hasFilters(f: DiscoveryFilters) {
  return Boolean(
    advancedFilterCount(f) ||
    f.search ||
    f.from ||
    f.to ||
    f.category !== "all" ||
    f.time !== "any" ||
    f.availability !== "joinable"
  );
}
