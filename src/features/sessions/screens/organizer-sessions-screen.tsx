import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  EmptyState,
  Screen,
  SegmentedTabs,
  SkeletonBlock
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { useOrganizerSessions } from "@/features/sessions/hooks/use-organizer-sessions";
import { sessionErrorMessage } from "@/features/sessions/services/organizer-sessions.service";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { PlusIcon } from "@/components/icons";
export default function OrganizerSessionsScreen() {
  const query = useOrganizerSessions();
  const router = useRouter();
  const [filter, setFilter] = useState<"upcoming" | "drafts" | "past">(
    "upcoming"
  );
  const now = Date.now();
  const sessions = (query.data?.sessions ?? []).filter((s) =>
    filter === "upcoming"
      ? s.status === "published" && Date.parse(s.ends_at) > now
      : s.status !== "published" || Date.parse(s.ends_at) <= now
  );
  const drafts = (query.data?.series ?? []).filter((s) => s.status === "draft");
  return (
    <Screen>
      <View style={{ gap: atomSpacing[5] }}>
        <AppHeading variant="title">Sessions</AppHeading>
        <AppText tone="muted">Manage the games you host.</AppText>
        <AppButton
          color="essential"
          icon={PlusIcon}
          iconAfter={false}
          onPress={() => router.push("/organizer-session/new")}
        >
          Create session
        </AppButton>
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "drafts", label: "Drafts" },
            { value: "past", label: "Past" }
          ]}
        />
        {query.isPending ? (
          <>
            <SkeletonBlock height={140} />
            <SkeletonBlock height={140} />
          </>
        ) : query.isError ? (
          <>
            <AppText tone="danger">{sessionErrorMessage(query.error)}</AppText>
            <AppButton
              loading={query.isFetching}
              onPress={() => void query.refetch()}
            >
              Retry
            </AppButton>
          </>
        ) : filter === "drafts" ? (
          drafts.length ? (
            drafts.map((d) => (
              <AppCard key={d.id}>
                <AppHeading variant="card">
                  {d.draft_input.title.trim() || "Untitled session"}
                </AppHeading>
                <AppText tone="muted">
                  Draft · {d.draft_input.venueName || "Club not set"}
                </AppText>
                <AppButton
                  variant="ghost"
                  color="accent"
                  onPress={() =>
                    router.push({
                      pathname: "/organizer-session/new",
                      params: { draft: d.id }
                    })
                  }
                >
                  Continue draft
                </AppButton>
              </AppCard>
            ))
          ) : (
            <EmptyState
              title="No drafts yet"
              description="Save your progress while you arrange the details."
            />
          )
        ) : sessions.length ? (
          sessions.map((s) => (
            <AppCard key={s.id}>
              <AppHeading variant="card">{s.title}</AppHeading>
              <AppText>
                {new Date(s.starts_at).toLocaleString("en-GB", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </AppText>
              <AppText>
                {query.data?.venues.find((v) => v.id === s.venue_id)?.name}
                {s.court_label ? ` · ${s.court_label}` : ""}
              </AppText>
              <AppText tone="muted">
                {s.status === "cancelled"
                  ? "Cancelled"
                  : s.status === "completed"
                    ? "Completed"
                    : `${s.capacity} places · ${s.allowed_categories === null ? "All categories" : `Categories ${s.allowed_categories.join(", ")}`}`}
              </AppText>
              <AppButton
                variant="ghost"
                color="accent"
                onPress={() =>
                  router.push({
                    pathname: "/organizer-session/[id]",
                    params: { id: s.id }
                  })
                }
              >
                View session
              </AppButton>
            </AppCard>
          ))
        ) : (
          <EmptyState
            title={
              filter === "upcoming"
                ? "Your next session starts here"
                : "No past sessions yet"
            }
            description={
              filter === "upcoming"
                ? "Choose a club and schedule, then publish your first game."
                : "Completed and cancelled sessions will appear here."
            }
          />
        )}
      </View>
    </Screen>
  );
}
