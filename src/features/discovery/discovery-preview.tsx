import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { DiscoveryContent } from "@/features/discovery/discovery-screen";
import {
  defaultFilters,
  type DiscoverySession
} from "@/features/discovery/domain";
// Development-only states exercise the same presentation without account writes.
export default function DiscoveryPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [filters, setFilters] = useState(defaultFilters),
    [recovered, setRecovered] = useState(false);
  useEffect(() => setRecovered(false), [state]);
  const [sessions] = useState<DiscoverySession[]>(() =>
    [1, 2, 3].map((n) => ({
      id: `df390000-0000-4000-8000-${String(n).padStart(12, "0")}`,
      title: n === 1 ? "Friday social padel" : "Evening doubles",
      starts_at: new Date(Date.now() + n * 3600000).toISOString(),
      ends_at: new Date(Date.now() + (n + 2) * 3600000).toISOString(),
      timezone: "America/Argentina/Buenos_Aires",
      capacity: 4,
      confirmed_count: 2,
      waitlist_enabled: true,
      waitlist_capacity: null,
      waitlisted_count: 0,
      allowed_categories: [6, 7],
      price_minor: 1200000,
      currency: "ARS",
      registration_opens_at: null,
      registration_closes_at: null,
      viewer_registration: null,
      viewer_is_host: false,
      venue: {
        id: "df190000-0000-4000-8000-000000000001",
        name: "QA · Palermo",
        address: "Av. Santa Fe 4000, Buenos Aires"
      }
    }))
  );
  if (!__DEV__) return <Redirect href="/sign-in" />;
  return (
    <DiscoveryContent
      filters={filters}
      onFilters={setFilters}
      onLocation={(location) => setFilters({ ...filters, location })}
      sessions={state === "empty" ? [] : sessions}
      loading={state === "loading" && !recovered}
      error={state === "error" && !recovered}
      refreshing={false}
      refresh={() => setRecovered(true)}
      preview
    />
  );
}
