import {
  coverageLabel,
  effectiveCourtCoverage
} from "@/features/venues/court-coverage";
import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { View, Pressable } from "react-native";
import { AttributeChips } from "@/features/attributes/components/attribute-chips";
import { Check } from "lucide-react-native";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  occurrenceCount,
  type SessionFormValues
} from "../validation/session-form";
import { defaultSessionSettings } from "../validation/session-settings";
import { WizardCard } from "./session-wizard-controls";
export function SessionReview({
  values,
  editing,
  onConfirmCourt,
  onEdit
}: {
  values: SessionFormValues;
  editing: boolean;
  onConfirmCourt: (v: boolean) => void;
  onEdit?: (step: number) => void;
}) {
  const s = { ...defaultSessionSettings(), ...values.settings };
  const duration = (v: number | null, fallback: string) =>
    v === null
      ? fallback
      : v % 1440 === 0
        ? `${v / 1440} days before`
        : v % 60 === 0
          ? `${v / 60} hours before`
          : `${v} minutes before`;
  const category = (n: number) =>
    `${n}${["ra", "da", "ra", "ta", "ta", "ta", "ma", "va"][n - 1]}`;
  const row = (label: string, value: string) => (
    <View key={label} style={{ flexDirection: "row", gap: 16 }}>
      <AppText variant="bodySm" tone="subtle" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodySm" style={{ flex: 1 }}>
        {value}
      </AppText>
    </View>
  );
  const title = (name: string, step: number) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <AppHeading variant="card">{name}</AppHeading>
      {onEdit && (
        <AppButton
          accessibilityLabel={`Edit ${name.toLowerCase()}`}
          fullWidth={false}
          size="sm"
          variant="ghost"
          onPress={() => onEdit(step)}
        >
          Edit
        </AppButton>
      )}
    </View>
  );
  return (
    <View style={{ gap: 20 }}>
      <WizardCard>
        {title("Details", 0)}
        <AppHeading variant="card">{values.title}</AppHeading>
        <AppText>
          {values.venueName}
          {values.courtLabel ? ` · ${values.courtLabel}` : ""}
        </AppText>
        <AppText tone="subtle">{values.venueAddress}</AppText>
        <AppText>
          Court coverage:{" "}
          {coverageLabel(
            effectiveCourtCoverage(
              values.venueCourtCoverage ?? [],
              values.courtCoverage
            )
          )}
        </AppText>
        {values.description && <AppText>{values.description}</AppText>}
        {!!values.sessionAttributes?.length && (
          <>
            <AppText variant="formLabel">What’s included</AppText>
            <AttributeChips codes={values.sessionAttributes} compact />
          </>
        )}
        {!!values.venueAttributes?.length && (
          <>
            <AppText variant="formLabel">At the venue</AppText>
            <AttributeChips codes={values.venueAttributes} compact />
          </>
        )}
      </WizardCard>
      <WizardCard>
        {title("Schedule", 1)}
        <AppText>
          {values.date} · {values.startTime}–{values.endTime}
        </AppText>
        <AppText variant="bodySm" tone="subtle">
          Buenos Aires time
          {!editing && values.repeat === "weekly"
            ? ` · ${occurrenceCount(values)} weekly dates through ${values.lastDate}`
            : ""}
        </AppText>
      </WizardCard>
      <WizardCard>
        {title("Players", 2)}
        {row("Maximum players", values.capacity)}
        {row(
          "Categories",
          s.allowed_categories === null
            ? "All categories"
            : s.allowed_categories.map(category).join(", ")
        )}
        {s.allowed_categories !== null &&
          row(
            "Strict enforcement",
            s.strict_category_enforcement ? "On" : "Off"
          )}
        {row(
          "Participation",
          { all: "Everyone", women_only: "Women only", men_only: "Men only" }[
            s.participant_gender_policy
          ]
        )}
      </WizardCard>
      <WizardCard>
        {title("Waitlist", 3)}
        {row(
          "Waitlist",
          s.waitlist_enabled
            ? `${s.waitlist_promotion_mode === "automatic" ? "Automatic" : "Manual"} · ${s.waitlist_capacity === null ? "Unlimited" : `Up to ${s.waitlist_capacity}`}`
            : "Disabled"
        )}
      </WizardCard>
      <WizardCard>
        {title("Visibility & registration", 4)}
        {row("Visibility", s.visibility === "public" ? "Public" : "Private")}
        {row(
          "Registration opens",
          duration(s.registration_opens_minutes_before, "When published")
        )}
        {row(
          "Registration closes",
          duration(s.registration_closes_minutes_before, "At session start")
        )}
        {row(
          "Cancellation",
          duration(s.cancellation_notice_minutes, "No advance cutoff")
        )}
      </WizardCard>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="I have arranged the court with the club"
        accessibilityState={{ checked: values.courtConfirmed }}
        onPress={() => onConfirmCourt(!values.courtConfirmed)}
        style={{
          minHeight: 56,
          flexDirection: "row",
          gap: 12,
          alignItems: "center"
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: c.accent,
            backgroundColor: values.courtConfirmed ? c.accent : c.surface,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {values.courtConfirmed && <Check color={c.surface} size={18} />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText>I have arranged the court with the club.</AppText>
          <AppText variant="bodySm" tone="subtle">
            Palla does not book courts for you.
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
