import {
  fetchOrganizerInventory,
  saveSessionRecord,
  fetchSavedCoverPath,
  deleteDraftRecord,
  setSeriesStatusRecord,
  type SaveSessionRequest
} from "@/features/sessions/repositories/organizer-sessions.repository";
import {
  sessionDraftSchema,
  sessionFormSchema,
  sessionStart,
  type SessionFormValues
} from "@/features/sessions/validation/session-form";
import type { PadelSession } from "@/features/sessions/domain";
import { settingsFromForm } from "./session-settings.adapter";
import {
  uploadCover,
  removeUnusedCover
} from "@/features/session-covers/repositories/cover.repository";
import type { Venue } from "@/features/venues/domain";
import { coordinatesForPublication } from "@/features/venues/services/venue-location.service";
export { fetchOrganizerInventory as loadOrganizerSessions };
export async function saveOrganizerSession(request: SaveSessionRequest) {
  const input = (
    request.publish ? sessionFormSchema : sessionDraftSchema
  ).parse(request.input);
  if (
    request.publish &&
    (!input.courtConfirmed || sessionStart(input).getTime() <= Date.now())
  )
    throw new Error("Check the schedule and court confirmation");
  const {
    legacySettingsBaseline: _baseline,
    coverLocalUri,
    ...persisted
  } = input;
  const previousCover = input.coverEdited
    ? await fetchSavedCoverPath(request)
    : null;
  if (coverLocalUri && input.coverImagePath)
    await uploadCover(input.coverImagePath, coverLocalUri);
  const venueCoordinates = request.publish
    ? await coordinatesForPublication(input.venueId, input.venueAddress)
    : null;
  try {
    const id = await saveSessionRecord({
      ...request,
      input: {
        ...persisted,
        ...(venueCoordinates ? { venueCoordinates } : {}),
        ...(request.publish ? { settings: settingsFromForm(input) } : {})
      }
    });
    if (previousCover && previousCover !== input.coverImagePath)
      await removeUnusedCover(previousCover).catch(() => {});
    return id;
  } catch (error) {
    if (coverLocalUri && input.coverImagePath)
      await removeUnusedCover(input.coverImagePath).catch(() => {});
    throw error;
  }
}
export const deleteOrganizerDraft = deleteDraftRecord;
export const setOrganizerSeriesStatus = setSeriesStatusRecord;
export function sessionErrorMessage(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "";
  if (message.includes("Venue amenities changed"))
    return "Venue amenities changed since you opened this form. Go back and reload before saving.";
  if (message.includes("Session changed"))
    return "This session changed since you opened it. Go back and reload before saving.";
  if (message.includes("Organizer access"))
    return "Your organizer access is unavailable. Please sign in again or contact support.";
  if (message.includes("no longer be changed"))
    return "This session has started or was cancelled. Go back and reload your sessions.";
  if (message.includes("schedule") || message.includes("confirmation"))
    return "Choose a future start time and confirm that you have arranged the court.";
  return "We couldn’t save your changes. Check your connection and try again.";
}
export function formFromSession(
  session: PadelSession,
  venue: Venue | undefined,
  original: SessionFormValues
): SessionFormValues {
  const local = (value: string) =>
    new Date(Date.parse(value) - 10800000).toISOString();
  const form: SessionFormValues = {
    ...original,
    coverImagePath: session.cover_image_path,
    coverLocalUri: undefined,
    coverEdited: false,
    sessionAttributes: session.attributes,
    venueAttributes: venue?.attributes ?? [],
    venueAttributesBaseline: venue?.attributes ?? [],
    venueAttributesEdited: false,
    repeat: "once",
    lastDate: local(session.starts_at).slice(0, 10),
    title: session.title,
    venueId: session.venue_id,
    venueName: venue?.name ?? "",
    venueAddress: venue?.address ?? "",
    courtLabel: session.court_label ?? "",
    date: local(session.starts_at).slice(0, 10),
    startTime: local(session.starts_at).slice(11, 16),
    endTime: local(session.ends_at).slice(11, 16),
    settings: {
      strict_category_enforcement: session.strict_category_enforcement,
      participant_gender_policy: session.participant_gender_policy,
      visibility: session.visibility,
      allowed_categories: session.allowed_categories,
      waitlist_enabled: session.waitlist_enabled,
      waitlist_promotion_mode: session.waitlist_promotion_mode,
      waitlist_capacity: session.waitlist_capacity,
      registration_opens_minutes_before:
        session.registration_opens_at === null
          ? null
          : Math.round(
              (Date.parse(session.starts_at) -
                Date.parse(session.registration_opens_at)) /
                60000
            ),
      registration_closes_minutes_before:
        session.registration_closes_at === null
          ? null
          : Math.round(
              (Date.parse(session.starts_at) -
                Date.parse(
                  session.registration_closes_at ?? session.starts_at
                )) /
                60000
            ),
      cancellation_notice_minutes:
        session.cancellation_deadline_at === null
          ? null
          : Math.round(
              (Date.parse(session.starts_at) -
                Date.parse(
                  session.cancellation_deadline_at ?? session.starts_at
                )) /
                60000
            )
    },
    categoryMode: session.allowed_categories === null ? "all" : "range",
    categoryMin: String(
      session.allowed_categories ? Math.min(...session.allowed_categories) : 6
    ),
    categoryMax: String(
      session.allowed_categories ? Math.max(...session.allowed_categories) : 7
    ),
    capacity: String(session.capacity),
    price: String(session.price_minor / 100),
    registrationHours: String(
      Math.round(
        (Date.parse(session.starts_at) -
          Date.parse(session.registration_closes_at ?? session.starts_at)) /
          3600000
      )
    ),
    cancellationHours: String(
      Math.round(
        (Date.parse(session.starts_at) -
          Date.parse(session.cancellation_deadline_at ?? session.starts_at)) /
          3600000
      )
    ),
    description: session.description ?? "",
    courtConfirmed: true
  };
  form.legacySettingsBaseline = {
    categoryMode: form.categoryMode,
    categoryMin: form.categoryMin,
    categoryMax: form.categoryMax,
    registrationHours: form.registrationHours,
    cancellationHours: form.cancellationHours
  };
  return form;
}
