import type { PublicSession } from "./domain";
export const publicSessionPreview: PublicSession = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Friday Social Padel",
  description:
    "Join our weekly social session for 6ta and 7ma players. Enjoy friendly matches, competitive rallies and plenty of time on court.\n\nBring your racket and arrive 10 minutes early so we can start on time.",
  court_label: "Court 3",
  starts_at: "2026-10-23T19:00:00-03:00",
  ends_at: "2026-10-23T20:30:00-03:00",
  timezone: "America/Argentina/Buenos_Aires",
  status: "published",
  visibility: "public",
  capacity: 4,
  confirmed_count: 3,
  allowed_categories: [6, 7],
  participant_gender_policy: "all",
  price_minor: 1200000,
  currency: "ARS",
  registration_opens_at: null,
  registration_closes_at: "2026-10-23T17:00:00-03:00",
  cancellation_deadline_at: "2026-10-23T17:00:00-03:00",
  payment_instructions: null,
  weekly: true,
  venue: {
    name: "Club Padel Palermo",
    address: "Palermo, Buenos Aires",
    google_place_id: null,
    arrival_instructions: null
  },
  host: { name: "Alex Rivera", avatar_url: null },
  players: [
    { name: "Marco R.", avatar_url: null, category: 6 },
    { name: "Elena G.", avatar_url: null, category: 6 },
    { name: "David K.", avatar_url: null, category: 7 }
  ],
  viewer_registration: null,
  viewer_is_host: false
};
