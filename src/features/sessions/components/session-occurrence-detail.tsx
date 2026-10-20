import { cancellationReasons } from "@/features/cancellations/domain";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  Screen
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { PadelSession } from "@/features/sessions/domain";
import type { Venue } from "@/features/venues/domain";

import {
  ArrowLeft,
  Calendar,
  Clock,
  Megaphone,
  Pencil,
  Share2,
  Repeat,
  UserPlus,
  XCircle
} from "lucide-react-native";
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const occurrenceDate = (value: string, timeZone: string, time = false) =>
  new Date(value).toLocaleString(
    "en-GB",
    time
      ? { timeZone, hour: "2-digit", minute: "2-digit" }
      : { timeZone, weekday: "short", day: "numeric", month: "short" }
  );
export function SessionOccurrenceDetail({
  session: s,
  venue,
  timeZone = "America/Argentina/Buenos_Aires",
  weekly,
  nextStart,
  onBack,
  onEdit,
  onCancel,
  onShare,
  onPublicView,
  sharing = false,
  preview = false,
  attendance,
  waitlist,
  registeredCount,
  occupancyLoading = false,
  occupancyError = false,
  announcements
}: {
  announcements?: React.ReactNode;
  session: PadelSession;
  registeredCount?: number;
  occupancyLoading?: boolean;
  occupancyError?: boolean;
  venue?: Venue;
  timeZone?: string;
  weekly: boolean;
  nextStart?: string;
  onBack: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onShare?: () => void;
  onPublicView?: () => void;
  sharing?: boolean;
  preview?: boolean;
  attendance: (between: React.ReactNode) => React.ReactNode;
  waitlist: React.ReactNode;
}) {
  const [soon, setSoon] = useState<string | null>(null);
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const editable =
    s.status === "published" && Date.parse(s.starts_at) > Date.now();
  const stacked = fontScale > 1.2 || width < 360;
  const category = (n: number) =>
    ({
      1: "1ra",
      2: "2da",
      3: "3ra",
      4: "4ta",
      5: "5ta",
      6: "6ta",
      7: "7ma",
      8: "8va"
    })[n];
  const price = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: s.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(s.price_minor / 100);
  return (
    <Screen contentStyle={{ maxWidth: 600 }}>
      <View style={{ gap: sp[8] }}>
        <View style={styles.header}>
          <AppButton
            accessibilityLabel="Back to sessions"
            layout="icon"
            fullWidth={false}
            variant="ghost"
            icon={ArrowLeft}
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Session details
          </AppHeading>
          {editable && (
            <AppButton
              accessibilityLabel="Edit session"
              layout="icon"
              fullWidth={false}
              variant="ghost"
              icon={Pencil}
              onPress={onEdit}
            />
          )}
          <AppButton
            accessibilityLabel="Share session"
            layout="icon"
            variant="ghost"
            fullWidth={false}
            icon={Share2}
            loading={sharing}
            onPress={onShare ?? (() => setSoon("Session sharing"))}
          />
        </View>
        {preview && (
          <AppText variant="bodySm" tone="subtle">
            Design preview · All data is illustrative
          </AppText>
        )}
        <AppCard surface="panel" style={{ gap: sp[3] }}>
          <View style={styles.wrap}>
            <View style={styles.pill}>
              <Repeat color={c.accent} size={16} />
              <AppText variant="caption" style={{ flexShrink: 1 }}>
                {weekly
                  ? `Weekly${nextStart ? ` · Next: ${occurrenceDate(nextStart, timeZone)}` : " · Last scheduled date"}`
                  : "One-time session"}
              </AppText>
            </View>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor:
                    s.status === "published" &&
                    !occupancyLoading &&
                    !occupancyError &&
                    registeredCount !== undefined
                      ? c.brand
                      : c.surfaceLow
                }
              ]}
            >
              <AppText
                variant="caption"
                accessibilityLiveRegion="polite"
                accessibilityState={{ busy: occupancyLoading }}
                accessibilityLabel={
                  s.status === "published"
                    ? occupancyLoading
                      ? "Loading registration count"
                      : occupancyError || registeredCount === undefined
                        ? `Registration count unavailable. Capacity ${s.capacity}.`
                        : `${registeredCount} of ${s.capacity} places filled${registeredCount >= s.capacity ? ". Session full." : ""}`
                    : undefined
                }
              >
                {s.status === "published"
                  ? occupancyLoading
                    ? "Loading players…"
                    : occupancyError || registeredCount === undefined
                      ? "Count unavailable"
                      : `${registeredCount}/${s.capacity} filled${registeredCount >= s.capacity ? " · Full" : ""}`
                  : s.status === "cancelled"
                    ? "Cancelled"
                    : s.status === "completed"
                      ? "Completed"
                      : "Draft"}
              </AppText>
            </View>
          </View>
          <AppHeading variant="title">{s.title}</AppHeading>
          <View style={{ gap: sp[2] }}>
            <AppText variant="label">
              {venue?.name ?? "Club details unavailable"}
              {s.court_label ? ` · ${s.court_label}` : ""}
            </AppText>
            <View style={styles.wrap}>
              <View style={styles.wrap}>
                <Calendar size={16} color={c.textSubtle} />
                <AppText variant="bodySm">
                  {occurrenceDate(s.starts_at, timeZone)}
                </AppText>
              </View>
              <View style={styles.wrap}>
                <Clock size={16} color={c.textSubtle} />
                <AppText variant="bodySm">
                  {occurrenceDate(s.starts_at, timeZone, true)}–
                  {occurrenceDate(s.ends_at, timeZone, true)}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="subtle">
              {timeZone === "America/Argentina/Buenos_Aires"
                ? "Buenos Aires time"
                : timeZone.replaceAll("_", " ")}{" "}
              ·{" "}
              {Math.round(
                (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000
              )}{" "}
              min
            </AppText>
          </View>
          <View
            style={{ flexDirection: stacked ? "column" : "row", gap: sp[3] }}
          >
            <AppCard surface="inset" tone="muted" style={styles.metric}>
              <AppText variant="caption" tone="subtle">
                Categories
              </AppText>
              <AppHeading variant="section">
                {s.allowed_categories === null
                  ? "All levels"
                  : s.allowed_categories.map(category).join(", ")}
              </AppHeading>
            </AppCard>
            <AppCard surface="inset" tone="muted" style={styles.metric}>
              <AppText variant="caption" tone="subtle">
                Per player · {s.currency}
              </AppText>
              <AppHeading variant="section">{price}</AppHeading>
              <AppText variant="caption" tone="subtle">
                Payment at the club
              </AppText>
            </AppCard>
          </View>
          <View style={styles.registration}>
            <UserPlus size={24} color={c.accent} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">Registration controls</AppText>
              <AppText variant="caption" tone="subtle">
                Coming soon · Not accepting signups yet
              </AppText>
            </View>
            <Switch
              value={false}
              disabled
              accessibilityLabel="Registration toggle. Coming soon"
            />
          </View>
        </AppCard>
        {onPublicView ? (
          <AppButton variant="bordered" onPress={onPublicView}>
            View public session
          </AppButton>
        ) : null}
        {attendance(waitlist)}
        <AppCard surface="panel" style={{ gap: sp[3] }}>
          <AppHeading variant="section">Session information</AppHeading>
          {venue?.address && <AppText>{venue.address}</AppText>}
          {s.description && <AppText>{s.description}</AppText>}
          {s.cancellation_reason_code && (
            <AppText variant="bodySm" tone="subtle">
              Cancellation reason:{" "}
              {cancellationReasons[s.cancellation_reason_code]}
            </AppText>
          )}
          {s.cancellation_reason && (
            <AppText tone="danger">
              Message to players: {s.cancellation_reason}
            </AppText>
          )}
          <AppText variant="bodySm" tone="subtle">
            Registration deadline:{" "}
            {occurrenceDate(s.registration_closes_at ?? s.starts_at, timeZone)}{" "}
            ·{" "}
            {occurrenceDate(
              s.registration_closes_at ?? s.starts_at,
              timeZone,
              true
            )}
          </AppText>
          <AppText variant="bodySm" tone="subtle">
            {s.cancellation_deadline_at === null
              ? "No advance player cancellation cutoff"
              : `Player cancellation deadline: ${occurrenceDate(s.cancellation_deadline_at, timeZone)} · ${occurrenceDate(s.cancellation_deadline_at, timeZone, true)}`}
          </AppText>
          <AppText variant="bodySm" tone="subtle">
            {s.payment_instructions ??
              "Arrange court bookings and payments directly with the club."}
          </AppText>
        </AppCard>
        {announcements}
        <View style={{ gap: sp[3] }}>
          {!announcements && (
            <>
              <AppButton
                icon={Megaphone}
                iconAfter={false}
                onPress={() => setSoon("Player broadcasts")}
              >
                Message players
              </AppButton>
              <AppText
                variant="caption"
                tone="subtle"
                style={{ textAlign: "center" }}
              >
                Coming soon · No messages sent
              </AppText>
            </>
          )}
          {editable && (
            <>
              <AppButton
                color="danger"
                variant="bordered"
                icon={XCircle}
                iconAfter={false}
                onPress={onCancel}
              >
                Cancel session
              </AppButton>
              <AppText variant="caption" tone="subtle">
                Only this occurrence will be cancelled. Club payments are
                handled outside Palla.
              </AppText>
            </>
          )}
        </View>
      </View>
      <Modal
        transparent
        visible={soon !== null}
        animationType="slide"
        onRequestClose={() => setSoon(null)}
      >
        <View style={styles.overlay}>
          <AppCard
            surface="panel"
            accessibilityViewIsModal
            style={{ gap: sp[4], paddingBottom: sp[6] + insets.bottom }}
          >
            <AppHeading variant="section">{soon} · Coming soon</AppHeading>
            <AppText>
              This feature is part of Palla’s planned experience. No changes
              have been made to your session.
            </AppText>
            <AppButton color="essential" onPress={() => setSoon(null)}>
              Got it
            </AppButton>
          </AppCard>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: sp[1]
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: sp[2]
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    paddingHorizontal: sp[3],
    paddingVertical: sp[2],
    borderRadius: 999,
    backgroundColor: c.surfaceLow,
    maxWidth: "100%"
  },
  metric: { flex: 1, gap: sp[2], borderWidth: 0 },
  registration: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: sp[3],
    padding: sp[4],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceLow
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)"
  }
});
