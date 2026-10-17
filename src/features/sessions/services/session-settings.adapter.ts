import type { SessionFormValues } from "../validation/session-form";
import {
  defaultSessionSettings,
  sessionCreationSettingsSchema,
  type SessionCreationSettings
} from "../validation/session-settings";
// Transitional adapter: keep the current form working until the approved new UI is built.
export function settingsFromForm(
  input: SessionFormValues
): SessionCreationSettings {
  const settings = input.settings
    ? {
        ...input.settings,
        strict_category_enforcement:
          input.settings.strict_category_enforcement ?? false,
        participant_gender_policy:
          input.settings.participant_gender_policy ?? "all"
      }
    : { ...defaultSessionSettings(), visibility: "private" as const };
  const baseline = input.legacySettingsBaseline;
  if (
    !input.settings ||
    (baseline &&
      (baseline.categoryMode !== input.categoryMode ||
        baseline.categoryMin !== input.categoryMin ||
        baseline.categoryMax !== input.categoryMax))
  ) {
    settings.allowed_categories =
      input.categoryMode === "all"
        ? null
        : Array.from(
            { length: +input.categoryMax - +input.categoryMin + 1 },
            (_, i) => +input.categoryMin + i
          );
  }
  if (
    !input.settings ||
    (baseline && baseline.registrationHours !== input.registrationHours)
  )
    settings.registration_closes_minutes_before = +input.registrationHours * 60;
  if (
    !input.settings ||
    (baseline && baseline.cancellationHours !== input.cancellationHours)
  )
    settings.cancellation_notice_minutes = +input.cancellationHours * 60;
  return sessionCreationSettingsSchema.parse(settings);
}
