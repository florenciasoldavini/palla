import { waitlistJoinedLabel } from "../waitlist-format";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { categoryLabels } from "@/features/profile/playing-category";
import { SessionConfirmation } from "@/features/sessions/components/session-confirmation";
import { ArrowUpFromLine, Hand, Zap } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, useWindowDimensions, View } from "react-native";
import type { Waitlist, WaitlistEntry } from "../waitlist-domain";
import { attendeeName } from "./organizer-attendance";
import { useOrganizerWaitlist } from "../hooks/use-organizer-waitlist";
import { waitlistBlockMessages } from "../services/waitlist.service";

export function WaitlistCard({
  data,
  loading = false,
  error,
  busy = false,
  published,
  onRetry,
  onAction,
  onMode
}: {
  data?: Waitlist;
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
  published: boolean;
  onRetry: () => void;
  onAction: (row: WaitlistEntry, action: "promote" | "remove") => Promise<void>;
  onMode: (mode: "manual" | "automatic") => Promise<void>;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [automatic, setAutomatic] = useState(false);
  const { fontScale } = useWindowDimensions();
  const Icon = data?.promotion_mode === "automatic" ? Zap : Hand;
  return (
    <>
      <AppCard surface="panel" style={{ gap: sp[4] }}>
        <View style={styles.row}>
          <AppHeading variant="section" style={{ flex: 1 }}>
            Waitlist Queue
          </AppHeading>
          {data && (
            <View style={styles.count}>
              <AppText
                variant="caption"
                accessibilityLabel={`${data.entries.length} ${data.entries.length === 1 ? "player" : "players"} waiting`}
                accessibilityLiveRegion="polite"
              >
                {data.entries.length}
              </AppText>
            </View>
          )}
        </View>
        {loading ? (
          <SkeletonBlock height={180} />
        ) : !data ? (
          <ErrorState
            contained
            title="Couldn’t load the waitlist"
            description={error ?? "Check your connection and try again."}
            onRetry={onRetry}
            retrying={loading}
            retryDisabled={busy}
            retryLabel="Reload waitlist"
          />
        ) : (
          <>
            <AppText variant="bodySm" tone="subtle">
              {data.promotion_mode === "automatic"
                ? "First eligible player, first promoted"
                : "Manual promotion · Choose who fills a place"}
            </AppText>
            {data.entries.length === 0 && (
              <EmptyState
                contained
                title="No players waiting"
                description="Players who join the waitlist will appear here."
              />
            )}
            {data.entries.map((row, index) => (
              <AppCard
                key={row.id}
                surface="inset"
                tone="muted"
                style={{ gap: sp[3] }}
              >
                <View style={styles.row}>
                  <View
                    style={[
                      styles.avatar,
                      {
                        width: 36 * fontScale,
                        height: 36 * fontScale,
                        borderRadius: 18 * fontScale
                      }
                    ]}
                  >
                    <AppText variant="caption">
                      {attendeeName(row)
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, minWidth: 80, gap: sp[1] }}>
                    <View style={styles.row}>
                      <AppText variant="label" style={{ flexShrink: 1 }}>
                        {attendeeName(row)}
                      </AppText>
                      <View style={styles.categoryChip}>
                        <AppText variant="caption" tone="subtle">
                          {row.player.playing_category
                            ? categoryLabels[row.player.playing_category]
                            : "Unrated"}
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.row}>
                      <AppText variant="caption" tone="subtle">
                        {index === 0
                          ? "First in line"
                          : `#${index + 1} in queue`}
                      </AppText>
                      <AppText variant="caption" tone="subtle">
                        {waitlistJoinedLabel(row.joined_at, now)}
                      </AppText>
                    </View>
                  </View>
                </View>
                {!row.category_eligible && (
                  <AppText variant="caption" tone="subtle">
                    Outside the session’s required categories. Cannot be
                    promoted.
                  </AppText>
                )}
                <AppButton
                  color="essential"
                  variant="solid"
                  icon={ArrowUpFromLine}
                  iconAfter={false}
                  size="sm"
                  accessibilityLabel={`Promote ${attendeeName(row)}`}
                  isDisabled={
                    busy ||
                    !published ||
                    data.blocked_reason !== null ||
                    !row.category_eligible
                  }
                  onPress={() =>
                    void onAction(row, "promote").catch(() => undefined)
                  }
                >
                  Promote to match
                </AppButton>
              </AppCard>
            ))}
            {data.blocked_reason && (
              <AppText variant="bodySm" tone="subtle">
                {waitlistBlockMessages[data.blocked_reason]}
              </AppText>
            )}
            <View style={styles.note}>
              <Icon color={c.text} size={20} />
              <View style={{ flex: 1, minWidth: 100, gap: sp[1] }}>
                <AppText variant="label">
                  {data.promotion_mode === "automatic"
                    ? "Auto-promote enabled"
                    : "Manual promotion"}
                </AppText>
                <AppText variant="bodySm" tone="subtle">
                  {data.promotion_mode === "automatic"
                    ? "When a place opens before the registration deadline, the first eligible waiting player is confirmed automatically."
                    : "You choose when to confirm waiting players. No players are promoted automatically."}
                </AppText>
              </View>
              <Switch
                value={data.promotion_mode === "automatic"}
                disabled={!published || !data.enabled || busy}
                accessibilityLabel="Automatic waitlist promotion"
                onValueChange={(value) =>
                  value
                    ? setAutomatic(true)
                    : void onMode("manual").catch(() => undefined)
                }
                trackColor={{ true: c.brand, false: c.borderStrong }}
              />
            </View>
          </>
        )}
        {busy && (
          <AppText
            variant="caption"
            tone="subtle"
            accessibilityLiveRegion="polite"
          >
            Saving waitlist changes…
          </AppText>
        )}
        {error && data && (
          <ErrorState
            contained
            variant="inline"
            title="Waitlist couldn’t update"
            description={error}
            onRetry={onRetry}
            retrying={loading}
            retryDisabled={busy}
            retryLabel="Reload waitlist"
          />
        )}
      </AppCard>
      <SessionConfirmation
        visible={automatic}
        title="Enable automatic promotion?"
        description="This applies to this session date. Available places may be filled immediately, in queue order, by players who meet the category rules. Promotion stops at the registration deadline."
        confirmLabel="Enable auto-promote"
        confirmColor="essential"
        keepLabel="Keep manual promotion"
        busy={busy}
        error={error}
        onClose={() => setAutomatic(false)}
        onConfirm={() =>
          void onMode("automatic")
            .then(() => setAutomatic(false))
            .catch(() => undefined)
        }
      />
    </>
  );
}
export function OrganizerWaitlist({
  sessionId,
  published
}: {
  sessionId: string;
  published: boolean;
}) {
  const { query, action, mode } = useOrganizerWaitlist(sessionId);
  const [error, setError] = useState<string | null>(null);
  const save = async (callback: () => Promise<unknown>) => {
    setError(null);
    try {
      await callback();
    } catch (cause) {
      setError(
        "We couldn’t save this change. Reload the waitlist and try again."
      );
      throw cause;
    }
  };
  return (
    <WaitlistCard
      data={query.data}
      loading={query.isPending || (query.isFetching && !query.data)}
      error={
        error ??
        (query.isError
          ? "We couldn’t load the waitlist. Check your connection and try again."
          : null)
      }
      published={published}
      busy={action.isPending || mode.isPending}
      onRetry={() => {
        setError(null);
        void query.refetch();
      }}
      onAction={(row, value) =>
        save(() =>
          action.mutateAsync({
            registration_id: row.id,
            action: value,
            expected_version: row.updated_at
          })
        )
      }
      onMode={(value) =>
        save(() =>
          mode.mutateAsync({
            session_id: sessionId,
            mode: value,
            expected_version: query.data!.session_version
          })
        )
      }
    />
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: sp[2]
  },
  categoryChip: {
    backgroundColor: c.surfaceStrong,
    borderRadius: 6,
    paddingHorizontal: sp[2],
    paddingVertical: sp[1]
  },
  count: {
    backgroundColor: c.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1]
  },
  avatar: {
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: sp[3],
    padding: sp[4],
    borderRadius: 16,
    backgroundColor: c.surfaceLow
  }
});
