import { AppText, AppHeading } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { Calendar, Clock, Globe, Repeat } from "lucide-react-native";
import { Pressable, View, useWindowDimensions } from "react-native";
import { SessionDateTimeField } from "./session-datetime-field";
import { WizardCard } from "./session-wizard-controls";
import {
  occurrenceCount,
  type SessionFormValues
} from "../validation/session-form";

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} h` : "", remainder ? `${remainder} min` : ""]
    .filter(Boolean)
    .join(" ");
}
export function SessionScheduleStep({
  values,
  change,
  editing,
  errors
}: {
  values: SessionFormValues;
  change: <K extends keyof SessionFormValues>(
    k: K,
    v: SessionFormValues[K]
  ) => void;
  editing: boolean;
  errors: Partial<Record<keyof SessionFormValues, string>>;
}) {
  const { fontScale } = useWindowDimensions();
  const duration = minutesOf(values.endTime) - minutesOf(values.startTime);
  const validTimes =
    [values.startTime, values.endTime].every((t) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
    ) && duration > 0;
  const firstDate = new Date(`${values.date}T12:00:00-03:00`);
  const validDates =
    !Number.isNaN(firstDate.getTime()) &&
    (editing || values.repeat === "once" || values.lastDate >= values.date);
  const weekday = validDates
    ? firstDate.toLocaleDateString("en-GB", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "long"
      })
    : "";
  const shortDate = (v: string) =>
    new Date(`${v}T12:00:00-03:00`).toLocaleDateString("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  const weekly = values.repeat === "weekly";
  const count = validDates ? occurrenceCount(values) : 0;
  return (
    <View style={{ gap: 24 }}>
      {!editing && (
        <View style={{ gap: 12 }}>
          <AppText variant="formLabel">Repeat</AppText>
          <View
            style={{
              flexDirection: fontScale > 1.3 ? "column" : "row",
              padding: 4,
              borderRadius: 12,
              backgroundColor: c.surfaceRaised,
              gap: 4
            }}
          >
            {[
              { value: "weekly", label: "Weekly", icon: Repeat },
              { value: "once", label: "One time", icon: Calendar }
            ].map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ checked: values.repeat === o.value }}
                onPress={() => change("repeat", o.value as "weekly" | "once")}
                style={{
                  flex: fontScale > 1.3 ? undefined : 1,
                  minHeight: 76,
                  backgroundColor:
                    values.repeat === o.value ? c.surface : undefined,
                  borderRadius: 8,
                  padding: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <o.icon size={20} color={c.accent} accessible={false} />
                <AppText variant="label" style={{ textAlign: "center" }}>
                  {o.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <WizardCard>
        <AppHeading variant="card">Dates</AppHeading>
        <SessionDateTimeField
          label={editing || !weekly ? "Session date" : "First session"}
          mode="date"
          value={values.date}
          onChange={(v) => {
            change("date", v);
            if (values.lastDate < v) change("lastDate", v);
          }}
          errorText={errors.date}
        />
        {!editing && weekly && (
          <SessionDateTimeField
            label="Last session"
            mode="date"
            value={values.lastDate}
            onChange={(v) => change("lastDate", v)}
            errorText={errors.lastDate}
          />
        )}
        {!editing && weekly && validDates && (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Repeat size={18} color={c.accent} accessible={false} />
            <AppText variant="bodySm" tone="subtle" style={{ flex: 1 }}>
              Every {weekday} · {count} {count === 1 ? "session" : "sessions"}
            </AppText>
          </View>
        )}
      </WizardCard>
      <WizardCard>
        <AppHeading variant="card">Time</AppHeading>
        <View
          style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: 12 }}
        >
          <View style={{ flex: 1 }}>
            <SessionDateTimeField
              label="Start time"
              mode="time"
              value={values.startTime}
              onChange={(v) => change("startTime", v)}
              errorText={errors.startTime}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SessionDateTimeField
              label="End time"
              mode="time"
              value={values.endTime}
              onChange={(v) => change("endTime", v)}
              errorText={errors.endTime}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Clock
            size={18}
            color={validTimes ? c.accent : c.errorText}
            accessible={false}
          />
          <AppText
            variant="bodySm"
            tone={validTimes ? "subtle" : "danger"}
            style={{ flex: 1 }}
            accessibilityLiveRegion="polite"
          >
            {validTimes
              ? `Duration · ${durationLabel(duration)}`
              : "End time must be after start time on the same day."}
          </AppText>
        </View>
      </WizardCard>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Globe size={18} color={c.textSubtle} accessible={false} />
        <AppText variant="bodySm" tone="subtle" style={{ flex: 1 }}>
          Buenos Aires time · UTC−3
        </AppText>
      </View>
      {validTimes && validDates && (
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: c.surfaceLow,
            gap: 12
          }}
        >
          <AppHeading variant="card">Your schedule</AppHeading>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {weekly ? (
              <Repeat size={20} color={c.accent} accessible={false} />
            ) : (
              <Calendar size={20} color={c.accent} accessible={false} />
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="bodySm">
                {weekly ? `${weekday}s, ` : ""}
                {values.startTime}–{values.endTime}
              </AppText>
              <AppText variant="bodySm" tone="subtle">
                {shortDate(values.date)}
                {!editing && weekly ? ` – ${shortDate(values.lastDate)}` : ""}
              </AppText>
              <AppText variant="bodySm" tone="subtle">
                {editing
                  ? "Updates existing dates; does not extend the series."
                  : `${count} ${weekly ? "weekly " : ""}${count === 1 ? "session" : "sessions"}`}
              </AppText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
