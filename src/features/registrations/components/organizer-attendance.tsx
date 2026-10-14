import { designTokens } from "@/theme/tokens";
import { AvailableRosterSlot } from "./available-roster-slot";
import { RosterPlayer } from "./roster-player";
import {
  AppCard,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
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
  capacity,
  loading = false,
  retrying = false,
  error,
  busyId,
  disabled = false,
  timeZone,
  onRetry,
  onChange,
  between,
  previewPaymentLabel
}: {
  attendees: Attendee[];
  capacity: number;
  previewPaymentLabel?: string;
  between?: React.ReactNode;
  loading?: boolean;
  retrying?: boolean;
  error?: string | null;
  busyId?: string;
  disabled?: boolean;
  timeZone: string;
  onRetry: () => void;
  onChange: (row: Attendee, arrived: boolean) => Promise<void>;
}) {
  const { fontScale, width } = useWindowDimensions();
  const [pressedId, setPressedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<Attendee | null>(null);
  const arrived = attendees.filter((row) => row.checked_in_at !== null).length;
  const status = loading ? (
    <SkeletonBlock height={100} />
  ) : error ? (
    <ErrorState
      variant={attendees.length ? "inline" : "panel"}
      title={
        attendees.length
          ? "Attendees couldn’t update"
          : "Couldn’t load attendees"
      }
      description={error}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel="Reload attendees"
    />
  ) : attendees.length === 0 && (disabled || capacity === 0) ? (
    <EmptyState
      title="No players yet"
      description="Confirmed players will appear here when they join this session."
    />
  ) : null;
  return (
    <>
      <View style={{ gap: sp[3] }}>
        <AppHeading variant="section">Active roster</AppHeading>
        {!loading && (!error || attendees.length > 0) && (
          <AppText variant="bodySm" tone="subtle">
            {attendees.length} confirmed{" "}
            {attendees.length === 1 ? "player" : "players"}
          </AppText>
        )}
        {status}
        {!loading &&
          attendees.map((row) => (
            <RosterPlayer
              key={row.id}
              attendee={row}
              previewPaymentLabel={previewPaymentLabel}
            />
          ))}
        {!loading &&
          !error &&
          !disabled &&
          Array.from(
            { length: Math.max(0, capacity - attendees.length) },
            (_, index) => (
              <AvailableRosterSlot
                key={index}
                number={attendees.length + index + 1}
              />
            )
          )}
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
          {!loading && (!error || attendees.length > 0) && (
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
        ) : error && attendees.length === 0 ? (
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
  capacity,
  timeZone,
  published,
  between
}: {
  between?: React.ReactNode;
  sessionId: string;
  capacity: number;
  timeZone: string;
  published: boolean;
}) {
  const { roster, attendance } = useOrganizerAttendance(sessionId);
  const [error, setError] = useState<string | null>(null);
  return (
    <AttendanceSections
      capacity={capacity}
      between={between}
      attendees={roster.data ?? []}
      retrying={roster.isFetching}
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
