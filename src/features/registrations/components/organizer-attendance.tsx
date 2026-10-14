import { designTokens } from "@/theme/tokens";
import { categoryLabels } from "@/features/profile/playing-category";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Check } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import type { Attendee } from "../domain";
import { useOrganizerAttendance } from "../hooks/use-organizer-attendance";
import { SessionConfirmation } from "@/features/sessions/components/session-confirmation";

export function attendeeName(row: Attendee) {
  return (
    [row.player.first_name, row.player.last_name].filter(Boolean).join(" ") ||
    "Player"
  );
}

export function AttendanceSections({
  attendees,
  loading = false,
  error,
  busyId,
  disabled = false,
  timeZone,
  onRetry,
  onChange,
  between
}: {
  attendees: Attendee[];
  between?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  busyId?: string;
  disabled?: boolean;
  timeZone: string;
  onRetry: () => void;
  onChange: (row: Attendee, arrived: boolean) => Promise<void>;
}) {
  const { fontScale, width } = useWindowDimensions();
  const avatarSize = Math.max(40, 40 * fontScale);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<Attendee | null>(null);
  const arrived = attendees.filter((row) => row.checked_in_at !== null).length;
  const status = loading ? (
    <SkeletonBlock height={100} />
  ) : error ? (
    <View style={{ gap: sp[3] }}>
      <AppText tone="danger" accessibilityLiveRegion="polite">
        {error}
      </AppText>
      <AppButton variant="bordered" onPress={onRetry}>
        Reload attendees
      </AppButton>
    </View>
  ) : attendees.length === 0 ? (
    <AppText tone="subtle">
      No confirmed attendees yet. Registered players will appear here.
    </AppText>
  ) : null;
  return (
    <>
      <View style={{ gap: sp[3] }}>
        <AppHeading variant="section">Active roster</AppHeading>
        {!loading && !error && (
          <AppText variant="bodySm" tone="subtle">
            {attendees.length} confirmed{" "}
            {attendees.length === 1 ? "player" : "players"}
          </AppText>
        )}
        {status}
        {!loading &&
          !error &&
          attendees.map((row) => (
            <AppCard key={row.id} surface="row">
              <View style={styles.row}>
                <View
                  style={[
                    styles.avatar,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2
                    }
                  ]}
                >
                  <AppText variant="label">
                    {attendeeName(row)
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </AppText>
                </View>
                <View style={styles.name}>
                  <AppText variant="label">{attendeeName(row)}</AppText>
                  <AppText variant="caption" tone="accent">
                    {row.player.playing_category === null
                      ? "Category not set"
                      : categoryLabels[row.player.playing_category]}{" "}
                    · Confirmed
                  </AppText>
                </View>
              </View>
            </AppCard>
          ))}
      </View>
      {between}
      <AppCard surface="panel" style={{ gap: sp[4] }}>
        <View
          style={[
            styles.checkinHeader,
            (fontScale > 1.2 || width < 360) && styles.stackedHeader
          ]}
        >
          <View style={{ flex: 1, gap: sp[1] }}>
            <AppHeading variant="section">Court Check-in</AppHeading>
            <AppText variant="bodySm" tone="subtle">
              Verify on-court arrivals
            </AppText>
          </View>
          {!loading && !error && (
            <View style={styles.countBadge}>
              <AppText
                variant="caption"
                accessibilityLabel={`${arrived} of ${attendees.length} arrived`}
                accessibilityLiveRegion="polite"
              >
                {arrived}/{attendees.length} arrived
              </AppText>
            </View>
          )}
        </View>
        {loading ? (
          <SkeletonBlock height={100} />
        ) : error ? (
          <AppText tone="subtle">
            Reload attendees above to check arrivals.
          </AppText>
        ) : attendees.length === 0 ? (
          <AppText tone="subtle">There are no arrivals to mark yet.</AppText>
        ) : (
          <View>
            {attendees.map((row, index) => (
              <View
                key={row.id}
                style={[styles.checkin, index > 0 && styles.checkinDivider]}
              >
                <View style={styles.attendeeIdentity}>
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: row.checked_in_at
                          ? c.accent
                          : designTokens.colors.primitive.neutral[300]
                      }
                    ]}
                  />
                  <AppText variant="label" style={{ flex: 1 }}>
                    {attendeeName(row)}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${row.checked_in_at ? "Undo arrival for" : "Mark arrived:"} ${attendeeName(row)}`}
                  accessibilityHint={
                    row.checked_in_at
                      ? "Opens confirmation to undo this arrival"
                      : "Records this player’s arrival"
                  }
                  accessibilityState={{
                    disabled: disabled || !!busyId,
                    busy: busyId === row.id
                  }}
                  disabled={disabled || !!busyId}
                  onPress={() =>
                    row.checked_in_at
                      ? setUndo(row)
                      : void onChange(row, true).catch(() => undefined)
                  }
                  onPressIn={() => setPressedId(row.id)}
                  onPressOut={() => setPressedId(null)}
                  style={[
                    styles.arrivalAction,
                    !row.checked_in_at && styles.pendingAction,
                    pressedId === row.id && {
                      backgroundColor: c.surfaceStrong
                    },
                    (disabled || !!busyId) && { opacity: 0.6 }
                  ]}
                >
                  {busyId === row.id ? (
                    <ActivityIndicator
                      color={c.accent}
                      accessibilityLabel="Saving arrival"
                    />
                  ) : row.checked_in_at ? (
                    <>
                      <Check size={16} color={c.accent} />
                      <AppText variant="caption" tone="accent">
                        Arrived (
                        {new Date(row.checked_in_at).toLocaleTimeString(
                          "en-GB",
                          { timeZone, hour: "2-digit", minute: "2-digit" }
                        )}
                        )
                      </AppText>
                    </>
                  ) : (
                    <AppText variant="caption" tone="subtle">
                      Tap to Check In
                    </AppText>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {disabled && (
          <AppText variant="caption" tone="subtle">
            Attendance is available for published sessions only.
          </AppText>
        )}
      </AppCard>
      <SessionConfirmation
        visible={undo !== null}
        title="Undo arrival?"
        description={`Remove the arrival recorded for ${undo ? attendeeName(undo) : "this player"}?`}
        confirmLabel="Undo arrival"
        keepLabel="Keep arrival"
        busy={!!busyId}
        error={error}
        onClose={() => setUndo(null)}
        onConfirm={() => {
          if (undo)
            void onChange(undo, false)
              .then(() => setUndo(null))
              .catch(() => undefined);
        }}
      />
    </>
  );
}

export function OrganizerAttendance({
  sessionId,
  timeZone,
  published,
  between
}: {
  between?: React.ReactNode;
  sessionId: string;
  timeZone: string;
  published: boolean;
}) {
  const { roster, attendance } = useOrganizerAttendance(sessionId);
  const [error, setError] = useState<string | null>(null);
  return (
    <AttendanceSections
      between={between}
      attendees={roster.data ?? []}
      loading={roster.isPending || (roster.isFetching && !roster.data)}
      busyId={
        attendance.isPending ? attendance.variables.registration_id : undefined
      }
      disabled={!published}
      timeZone={timeZone}
      error={
        error ??
        (roster.isError
          ? "We couldn’t load attendees. Check your connection and try again."
          : null)
      }
      onRetry={() => {
        setError(null);
        void roster.refetch();
      }}
      onChange={async (row, arrived) => {
        setError(null);
        try {
          await attendance.mutateAsync({
            registration_id: row.id,
            arrived,
            expected_version: row.updated_at
          });
        } catch (cause) {
          setError(
            "We couldn’t save this arrival. Reload attendees and try again."
          );
          throw cause;
        }
      }}
    />
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    flexWrap: "wrap"
  },
  name: { flex: 1, minWidth: 100, gap: sp[1] },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceLow,
    alignItems: "center",
    justifyContent: "center"
  },
  checkinHeader: { flexDirection: "row", alignItems: "center", gap: sp[3] },
  stackedHeader: { flexDirection: "column", alignItems: "flex-start" },
  countBadge: {
    backgroundColor: c.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: sp[3],
    paddingVertical: sp[2]
  },
  checkin: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: sp[2],
    paddingVertical: sp[3]
  },
  checkinDivider: {
    borderTopWidth: 1,
    borderTopColor: c.borderSubtle,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  attendeeIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    flex: 1,
    minWidth: 100
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  arrivalAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    paddingHorizontal: sp[2],
    borderRadius: 10
  },
  pendingAction: { backgroundColor: c.surfaceRaised, paddingHorizontal: sp[3] }
});
