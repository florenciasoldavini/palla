import { AuthContext } from "@/features/auth/auth-provider";
import { CourtCoverageFields } from "@/features/venues/components/court-coverage-fields";
import { effectiveCourtCoverage } from "@/features/venues/court-coverage";
import {
  AppButton,
  AppHeading,
  AppText,
  TextField,
  TextAreaField,
  SelectMenu
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  Controller,
  useForm,
  type PathValue,
  type FieldPath
} from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sessionDraftSchema,
  sessionFormSchema,
  sessionStart,
  occurrenceCount,
  type SessionFormValues
} from "../validation/session-form";
import {
  defaultSessionSettings,
  type SessionCreationSettings
} from "../validation/session-settings";
import { settingsFromForm } from "../services/session-settings.adapter";
import { sessionErrorMessage } from "../services/organizer-sessions.service";
import { AddressField } from "@/features/venues/components/address-field";
import type { Venue } from "@/features/venues/domain";
import { useContext, useRef, useState, type ReactNode } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions
} from "react-native";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Zap,
  Hand,
  Globe,
  Lock
} from "lucide-react-native";
import {
  WizardCard,
  WizardChoice,
  WizardToggle,
  WizardStepper,
  WizardSection
} from "./session-wizard-controls";
import { SessionScheduleStep } from "./session-schedule-step";
import { SessionTimingRules } from "./session-timing-rules";
import { SessionAttributeFields } from "@/features/attributes/components/session-attribute-fields";
import { SessionCoverField } from "@/features/session-covers/components/cover-field";
import { SessionReview } from "./session-review";
const steps = ["Basic Info", "Schedule", "Players", "Waitlist", "Policies"];
const titles = [
  "Series Basics & Venue",
  "Plan your schedule",
  "Players & Eligibility",
  "Waitlist & Queue",
  "Visibility & Registration Rules"
];
const helpers = [
  "Set the details and location for your session.",
  "Choose when your sessions happen.",
  "Choose who can join each session.",
  "Choose what happens when a place opens.",
  "Choose who can discover your sessions and when players can register."
];
const categoryLabel = (n: number) =>
  `${n}${["ra", "da", "ra", "ta", "ta", "ta", "ma", "va"][n - 1]}`;
function normalize(
  input: SessionFormValues,
  venues: Venue[]
): SessionFormValues {
  let settings = { ...defaultSessionSettings(), ...input.settings };
  if (!input.settings && input.title) {
    try {
      settings = settingsFromForm(input);
    } catch {
      settings = { ...defaultSessionSettings(), visibility: "private" };
    }
  }
  const savedVenue = venues.find((v) => v.id === input.venueId);
  const coverage = input.venueCourtCoverageEdited
    ? (input.venueCourtCoverage ?? [])
    : (savedVenue?.court_coverage ?? input.venueCourtCoverage ?? []);
  return {
    ...input,
    venueCourtCoverage: coverage,
    venueCourtCoverageBaseline: input.venueCourtCoverageEdited
      ? (input.venueCourtCoverageBaseline ?? [])
      : (savedVenue?.court_coverage ?? []),
    courtCoverage:
      coverage.length === 1 ? coverage[0] : (input.courtCoverage ?? null),
    settings,
    legacySettingsBaseline: undefined,
    categoryMode: "all"
  };
}
export function SessionForm({
  initialValues,
  venues,
  editing = false,
  inheritedCoverPath = null,
  coverScope = "one",
  onSave,
  onDirtyChange,
  onStepChange,
  reviewSummary,
  onExit,
  managementActions
}: {
  initialValues: SessionFormValues;
  venues: Venue[];
  editing?: boolean;
  inheritedCoverPath?: string | null;
  coverScope?: "one" | "future";
  onSave: (input: SessionFormValues, publish: boolean) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onStepChange?: (step: number) => void;
  reviewSummary?: string;
  onExit?: () => void;
  managementActions?: ReactNode;
}) {
  const { user } = useContext(AuthContext);
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [savingBusy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const busy = savingBusy || coverBusy;
  const [error, setError] = useState<string | null>(null);
  const [locationEditing, setLocationEditing] = useState(
    !initialValues.venueName
  );
  const scroll = useRef<ScrollView>(null);
  const saving = useRef(false);
  const form = useForm<SessionFormValues>({
    defaultValues: normalize(initialValues, venues),
    resolver: zodResolver(sessionDraftSchema)
  });
  const values = form.watch();
  const settings = {
    ...defaultSessionSettings(),
    ...values.settings
  } as SessionCreationSettings;
  function change<K extends keyof SessionFormValues>(
    name: K,
    value: SessionFormValues[K]
  ) {
    if (saving.current || coverBusy) return;
    form.setValue(name, value as PathValue<SessionFormValues, K>, {
      shouldDirty: true
    });
    form.clearErrors();
    setError(null);
    onDirtyChange?.(true);
  }
  function resetVenueAttributes(id: string) {
    const codes = venues.find((v) => v.id === id)?.attributes ?? [];
    change("venueAttributes", codes);
    change("venueAttributesBaseline", codes);
    change("venueAttributesEdited", false);
    const coverage = venues.find((v) => v.id === id)?.court_coverage ?? [];
    change("venueCourtCoverage", coverage);
    change("venueCourtCoverageBaseline", coverage);
    change("venueCourtCoverageEdited", false);
    change("courtCoverage", effectiveCourtCoverage(coverage));
  }
  function setting<K extends keyof SessionCreationSettings>(
    key: K,
    value: SessionCreationSettings[K]
  ) {
    change("settings", { ...settings, [key]: value });
  }
  function move(next: number) {
    if (saving.current || coverBusy) return;
    Keyboard.dismiss();
    setError(null);
    setReviewing(false);
    setStep(next);
    onStepChange?.(next);
    setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: false }), 100);
  }
  function openReview() {
    if (saving.current || !validate(true)) return;
    Keyboard.dismiss();
    setError(null);
    setReviewing(true);
    setEditingFromReview(false);
    // Review is a separate view, outside the five numbered configuration steps.
    onStepChange?.(steps.length);
  }
  function editSection(next: number) {
    move(next);
    setEditingFromReview(true);
  }
  function goBack() {
    if (reviewing) {
      move(4);
      setEditingFromReview(false);
    } else if (step > 0) move(step - 1);
    else onExit?.();
  }
  function issueStep(path: PropertyKey[]) {
    const field = String(path[0]);
    if (
      [
        "title",
        "venueId",
        "venueName",
        "venueAddress",
        "courtLabel",
        "courtCoverage",
        "venueCourtCoverage",
        "description"
      ].includes(field)
    )
      return 0;
    if (["date", "lastDate", "startTime", "endTime", "repeat"].includes(field))
      return 1;
    if (field === "capacity") return 2;
    if (field === "settings") {
      const key = String(path[1] ?? "");
      if (!key) return 4;
      return key.startsWith("waitlist")
        ? 3
        : key.includes("minutes")
          ? 4
          : ["visibility"].includes(key)
            ? 4
            : 2;
    }
    return 4;
  }
  function validate(all = false) {
    const result = sessionFormSchema.safeParse(form.getValues());
    if (result.success) return true;
    const issues = result.error.issues.filter(
      (i) => all || issueStep(i.path) === step
    );
    for (const i of issues)
      form.setError(i.path.join(".") as FieldPath<SessionFormValues>, {
        message: i.message
      });
    if (issues.length) {
      setError(issues[0].message);
      if (all) move(issueStep(issues[0].path));
      setError(issues[0].message);
      return false;
    }
    return true;
  }
  async function save(publish: boolean) {
    if (saving.current || coverBusy) return;
    Keyboard.dismiss();
    setError(null);
    if (publish && !validate(true)) return;
    if (
      publish &&
      (!values.courtConfirmed || sessionStart(values).getTime() <= Date.now())
    ) {
      setError(
        !values.courtConfirmed
          ? "Confirm you have arranged the court with the club."
          : "Choose a future session start time."
      );
      return;
    }
    if (!publish) {
      const draft = sessionDraftSchema.safeParse(form.getValues());
      if (!draft.success) {
        setError(
          "Check your timing and queue settings before saving the draft."
        );
        return;
      }
    }
    saving.current = true;
    setBusy(true);
    try {
      await onSave(form.getValues(), publish);
      onDirtyChange?.(false);
    } catch (e) {
      setError(sessionErrorMessage(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const text = (
    name: "title" | "venueName",
    label: string,
    required = false
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          size="md"
          label={label}
          placeholder={
            name === "title"
              ? "e.g. Tuesday evening padel"
              : "e.g. Palermo Padel Club"
          }
          required={required}
          value={field.value}
          onBlur={field.onBlur}
          onChangeText={(v) => {
            change(name, v);
            if (name === "venueName") {
              change("venueId", "");
              resetVenueAttributes("");
            }
          }}
          maxLength={name === "title" ? 120 : 160}
          errorText={fieldState.error?.message}
        />
      )}
    />
  );
  const stepErrors = Object.fromEntries(
    Object.entries(form.formState.errors).map(([k, e]) => [k, e?.message])
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 12,
          borderBottomWidth: 1,
          borderColor: c.borderSubtle
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                reviewing
                  ? "Back to session settings"
                  : step === 0
                    ? "Close session editor"
                    : "Previous step"
              }
              disabled={busy}
              onPress={goBack}
              style={{
                width: 48,
                height: 48,
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <ArrowLeft size={24} color={c.text} />
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            {!reviewing && (
              <AppText variant="meta" tone="subtle">
                Step {step + 1} of 5
              </AppText>
            )}
            <AppText variant="label" style={{ textAlign: "center" }}>
              {reviewing ? "Review session" : steps[step]}
            </AppText>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {!editing ? (
              <AppButton
                variant="ghost"
                fullWidth={false}
                size="sm"
                isDisabled={busy}
                onPress={() => void save(false)}
              >
                Save Draft
              </AppButton>
            ) : (
              <View style={{ width: 48 }} />
            )}
          </View>
        </View>
        {!reviewing && (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 6,
                  backgroundColor:
                    i === step ? c.brand : i < step ? c.text : c.surfaceStrong
                }}
              />
            ))}
          </View>
        )}
      </View>
      <ScrollView
        pointerEvents={busy ? "none" : "auto"}
        key={reviewing ? "review" : step}
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }}
      >
        <View style={{ gap: 8 }}>
          <AppHeading variant="title">
            {reviewing ? "Review your session" : titles[step]}
          </AppHeading>
          <AppText tone="subtle">
            {reviewing
              ? "Check your details and confirm your court arrangements before publishing."
              : helpers[step]}
          </AppText>
        </View>
        {!reviewing && step === 0 && (
          <>
            <WizardCard>
              {text("title", "Series title", true)}
              <AppText variant="meta" tone="subtle">
                {values.title.length}/120 · Visible in session details
              </AppText>
              <Controller
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <TextAreaField
                    label="Description & format notes"
                    placeholder="Describe the format, what to bring, and anything players should know."
                    value={field.value}
                    onChangeText={(v) => change("description", v)}
                    onBlur={field.onBlur}
                    maxLength={2000}
                    errorText={fieldState.error?.message}
                  />
                )}
              />
            </WizardCard>
            <WizardSection title="Location & Facility">
              <WizardCard>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <MapPin color={c.accent} size={24} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">
                      {values.venueName || "Choose your club"}
                    </AppText>
                    <AppText variant="bodySm" tone="subtle">
                      {values.venueAddress ||
                        "Search an address or enter it manually"}
                    </AppText>
                  </View>
                  <AppButton
                    fullWidth={false}
                    size="sm"
                    variant="ghost"
                    onPress={() => setLocationEditing(!locationEditing)}
                  >
                    {locationEditing ? "Done" : "Change"}
                  </AppButton>
                </View>
                {locationEditing && (
                  <>
                    {venues.length > 0 && (
                      <SelectMenu
                        accessibilityLabel="Saved clubs"
                        value={values.venueId}
                        options={[
                          { label: "Enter a new club", value: "" },
                          ...venues.map((v) => ({
                            label: v.name ?? "Club",
                            value: v.id
                          }))
                        ]}
                        onChange={(id) => {
                          const v = venues.find((v) => v.id === id);
                          change("venueId", id);
                          resetVenueAttributes(id);
                          change("venueName", v?.name ?? "");
                          change("venueAddress", v?.address ?? "");
                        }}
                      />
                    )}
                    {text("venueName", "Club name", true)}
                    <AddressField
                      value={values.venueAddress}
                      onChange={(v) => {
                        change("venueAddress", v);
                        change("venueId", "");
                        resetVenueAttributes("");
                      }}
                      errorText={form.formState.errors.venueAddress?.message}
                    />
                  </>
                )}
              </WizardCard>
            </WizardSection>
            <WizardCard>
              <CourtCoverageFields
                venueCoverage={values.venueCourtCoverage ?? []}
                coverage={values.courtCoverage ?? null}
                disabled={busy}
                canEditVenue={
                  !values.venueId ||
                  venues.find((v) => v.id === values.venueId)?.created_by ===
                    user?.id
                }
                onVenueChange={(value) => {
                  change("venueCourtCoverage", value);
                  change("venueCourtCoverageEdited", true);
                  change("courtCoverage", effectiveCourtCoverage(value));
                }}
                onChange={(v) => change("courtCoverage", v)}
                error={form.formState.errors.courtCoverage?.message}
              />
            </WizardCard>
            <WizardCard>
              <SessionCoverField
                path={values.coverImagePath ?? null}
                localUri={values.coverLocalUri}
                inheritedPath={
                  coverScope === "future" &&
                  values.coverEdited &&
                  !values.coverImagePath
                    ? null
                    : inheritedCoverPath
                }
                onBusyChange={setCoverBusy}
                clearToVenue={coverScope === "future"}
                editing={editing}
                disabled={busy}
                onChange={(path, uri) => {
                  change("coverEdited", true);
                  change("coverImagePath", path);
                  change("coverLocalUri", uri);
                }}
              />
            </WizardCard>
            <WizardCard>
              <SessionAttributeFields
                sessionCodes={values.sessionAttributes ?? []}
                venueCodes={values.venueAttributes ?? []}
                venueName={values.venueName}
                disabled={busy}
                onSessionChange={(codes) => change("sessionAttributes", codes)}
                onVenueChange={(codes) => {
                  change("venueAttributes", codes);
                  change("venueAttributesEdited", true);
                }}
              />
            </WizardCard>
          </>
        )}
        {!reviewing && step === 1 && (
          <SessionScheduleStep
            values={values}
            change={change}
            editing={editing}
            errors={stepErrors}
          />
        )}
        {!reviewing && step === 2 && (
          <>
            <WizardCard>
              <WizardStepper
                label="Maximum players"
                value={values.capacity}
                onChange={(v) => change("capacity", v)}
                errorText={form.formState.errors.capacity?.message}
              />
              <AppText variant="bodySm" tone="subtle">
                Total places available for each date.
              </AppText>
            </WizardCard>
            <WizardSection title="Allowed categories">
              <WizardCard>
                <WizardToggle
                  label="All categories"
                  value={settings.allowed_categories === null}
                  onChange={(all) =>
                    change("settings", {
                      ...settings,
                      allowed_categories: all ? null : [6, 7],
                      strict_category_enforcement: all
                        ? false
                        : settings.strict_category_enforcement
                    })
                  }
                />
                {settings.allowed_categories !== null && (
                  <>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => {
                        const selected =
                          settings.allowed_categories!.includes(n);
                        return (
                          <Pressable
                            key={n}
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Category ${categoryLabel(n)}`}
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                              const cats = selected
                                ? settings.allowed_categories!.filter(
                                    (v) => v !== n
                                  )
                                : [...settings.allowed_categories!, n].sort(
                                    (a, b) => a - b
                                  );
                              setting("allowed_categories", cats);
                            }}
                            style={{
                              width: fontScale > 1.25 ? "47%" : "22%",
                              minHeight: 52,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: selected ? c.accent : c.borderSubtle,
                              backgroundColor: selected ? c.text : c.background,
                              justifyContent: "center",
                              alignItems: "center"
                            }}
                          >
                            <AppText
                              variant="label"
                              tone={selected ? "inverse" : "default"}
                            >
                              {categoryLabel(n)}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <AppText variant="bodySm" tone="subtle">
                      {settings.allowed_categories.length
                        ? settings.allowed_categories
                            .map(categoryLabel)
                            .join(", ")
                        : "Choose at least one category."}{" "}
                      · Lower numbers mean stronger play.
                    </AppText>
                    <WizardToggle
                      label="Strict category enforcement"
                      description="Only players with a matching profile category can join."
                      value={settings.strict_category_enforcement}
                      onChange={(v) =>
                        setting("strict_category_enforcement", v)
                      }
                    />
                  </>
                )}
              </WizardCard>
            </WizardSection>
            <WizardSection title="Participation">
              <WizardCard>
                {[
                  { value: "all", label: "Everyone" },
                  { value: "women_only", label: "Women only" },
                  { value: "men_only", label: "Men only" }
                ].map((o) => (
                  <WizardChoice
                    key={o.value}
                    label={o.label}
                    selected={settings.participant_gender_policy === o.value}
                    onPress={() =>
                      setting(
                        "participant_gender_policy",
                        o.value as SessionCreationSettings["participant_gender_policy"]
                      )
                    }
                  />
                ))}
              </WizardCard>
            </WizardSection>
          </>
        )}
        {!reviewing && step === 3 && (
          <>
            <WizardCard>
              <WizardToggle
                label="Enable waitlist"
                description="Let players queue when all places are taken."
                value={settings.waitlist_enabled}
                onChange={(v) => setting("waitlist_enabled", v)}
              />
            </WizardCard>
            {settings.waitlist_enabled && (
              <>
                <WizardSection title="Promotion mode">
                  <WizardChoice
                    label="Automatic"
                    icon={Zap}
                    description="Promote the next eligible player when a place opens."
                    selected={settings.waitlist_promotion_mode === "automatic"}
                    onPress={() =>
                      setting("waitlist_promotion_mode", "automatic")
                    }
                  />
                  <WizardChoice
                    label="Manual"
                    icon={Hand}
                    description="You choose when to promote a player."
                    selected={settings.waitlist_promotion_mode === "manual"}
                    onPress={() => setting("waitlist_promotion_mode", "manual")}
                  />
                </WizardSection>
                <WizardCard>
                  <WizardToggle
                    label="Unlimited queue"
                    value={settings.waitlist_capacity === null}
                    onChange={(unlimited) =>
                      setting("waitlist_capacity", unlimited ? null : 4)
                    }
                  />
                  {settings.waitlist_capacity !== null && (
                    <WizardStepper
                      label="Maximum waiting players"
                      value={
                        Number.isNaN(settings.waitlist_capacity)
                          ? ""
                          : String(settings.waitlist_capacity)
                      }
                      onChange={(v) =>
                        setting(
                          "waitlist_capacity",
                          /^\d+$/.test(v) ? Number(v) : NaN
                        )
                      }
                    />
                  )}
                </WizardCard>
              </>
            )}
          </>
        )}
        {!reviewing && step === 4 && (
          <>
            <WizardSection title="Visibility">
              <View style={{ gap: 12 }}>
                <WizardChoice
                  label="Public"
                  icon={Globe}
                  description="Make this series discoverable in Explore so players can find sessions that match their preferences."
                  selected={settings.visibility === "public"}
                  onPress={() => setting("visibility", "public")}
                />
                <WizardChoice
                  label="Private"
                  icon={Lock}
                  description="Keep this series out of Explore. Use this option for a group you already organize."
                  selected={settings.visibility === "private"}
                  onPress={() => setting("visibility", "private")}
                />
              </View>
            </WizardSection>
            <WizardSection title="Registration & cancellation" icon={Clock}>
              <SessionTimingRules
                settings={settings}
                onChange={(k, v) => setting(k, v)}
              />
            </WizardSection>
          </>
        )}
        {reviewing && (
          <>
            {reviewSummary && <AppText>{reviewSummary}</AppText>}
            <SessionReview
              values={values}
              editing={editing}
              onEdit={editSection}
              onConfirmCourt={(v) => change("courtConfirmed", v)}
            />
            {managementActions}
          </>
        )}
      </ScrollView>
      {error && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: c.errorSurface
          }}
        >
          <AppText tone="danger" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        </View>
      )}

      <View
        style={{
          padding: 16,
          paddingHorizontal: 20,
          paddingBottom: Math.max(16, insets.bottom),
          borderTopWidth: 1,
          borderColor: c.borderSubtle,
          backgroundColor: c.background,
          flexDirection: fontScale > 1.3 ? "column" : "row",
          gap: 12
        }}
      >
        {(reviewing || step > 0) && (
          <AppButton
            variant="ghost"
            fullWidth={false}
            isDisabled={busy}
            onPress={goBack}
          >
            Back
          </AppButton>
        )}
        <View style={{ flex: 1 }}>
          <AppButton
            color="essential"
            loading={busy}
            onPress={() => {
              if (reviewing) void save(true);
              else if (editingFromReview || step === 4) openReview();
              else if (validate()) move(step + 1);
            }}
          >
            {reviewing
              ? editing
                ? "Save changes"
                : `Publish ${occurrenceCount(values)} ${occurrenceCount(values) === 1 ? "session" : "sessions"}`
              : editingFromReview
                ? "Return to review"
                : step === 4
                  ? "Review session"
                  : [
                      "Continue to schedule",
                      "Continue to players",
                      "Continue to waitlist",
                      "Continue to policies"
                    ][step]}
          </AppButton>
        </View>
      </View>
    </View>
  );
}
