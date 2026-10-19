import { useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppButton, AppText, useAppToast } from "@/components/atoms";
import { NotificationInboxView } from "@/features/notifications/components/notification-inbox-view";
import { NotificationSettingsView } from "@/features/notifications/components/notification-settings-view";
import type { InboxItem } from "@/features/notifications/inbox-domain";
import type { ReviewContext, ReviewInput } from "@/features/reviews/domain";
import { isExpiredReviewInvitation } from "@/features/notifications/inbox-domain";
import { ReviewExpiredSheet } from "./review-expired-sheet";
import { ReviewSessionSummary } from "./review-session-summary";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { ReviewReportForm } from "@/features/reviews/components/review-report-form";
import { ReviewSheetShell } from "@/features/reviews/components/review-sheet-shell";
import { ReviewStars } from "@/features/reviews/components/review-stars";
const id = (n: number) =>
  `a9000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export default function ReviewsPreview() {
  const params = useLocalSearchParams<{
    mode?: string;
    state?: string;
    run?: string;
  }>();
  return (
    <Fixture
      key={`${params.mode}:${params.state}:${params.run}`}
      mode={params.mode === "organizer" ? "organizer" : "player"}
      state={params.state}
    />
  );
}
function Fixture({
  mode,
  state
}: {
  mode: "player" | "organizer";
  state?: string;
}) {
  const [referenceTime] = useState(Date.now);
  const date = (hours: number) =>
    new Date(referenceTime + hours * 3600000).toISOString();
  const router = useRouter(),
    toast = useAppToast();
  const goBack = () =>
    router.dismissTo({
      pathname: "/navigation-preview/[role]/profile",
      params: { role: mode }
    });
  const [unread, setUnread] = useState(false),
    [read, setRead] = useState<string[]>([]),
    [selected, setSelected] = useState<InboxItem | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<ReviewInput | null>(
      state === "reviewed" ? { rating: 5, comment: "A great session!" } : null
    ),
    [savedRegistration, setSavedRegistration] = useState<string | null>(
      state === "reviewed" ? id(11) : null
    ),
    [reporting, setReporting] = useState(false),
    [reported, setReported] = useState(false);
  const [settings, setSettings] = useState([
    { key: "chat_messages", audience: "shared" as const, push_enabled: true },
    {
      key: mode === "player" ? "review_reminders" : "new_reviews",
      audience: mode,
      push_enabled: true
    }
  ]);
  if (state === "settings")
    return (
      <NotificationSettingsView
        settings={settings}
        loading={false}
        error={false}
        onBack={goBack}
        onRetry={() => undefined}
        onChange={(key, enabled) => {
          setSettings((old) =>
            old.map((row) =>
              row.key === key ? { ...row, push_enabled: enabled } : row
            )
          );
          toast.show({
            title: "Notification settings updated",
            tone: "success"
          });
        }}
      />
    );
  const items: InboxItem[] = [1, 2, 3].map((n) => ({
    id: id(n),
    notification_type: mode === "player" ? "review_reminders" : "new_reviews",
    registration_id: id(n + 10),
    review_id:
      mode === "organizer" || (saved && savedRegistration === id(n + 10))
        ? id(n + 20)
        : null,
    // Invitations arrive one hour after their session ends.
    created_at: date(n === 3 ? -337 : -n),
    read_at:
      read.includes(id(n)) ||
      n === 3 ||
      (saved && savedRegistration === id(n + 10))
        ? date(0)
        : null,
    session_id: id(n + 30),
    session_title: [
      "Saturday social padel",
      "Evening doubles",
      "Sunday Americano"
    ][n - 1],
    deadline: date(n === 3 ? -2 : 335 - n),
    host_name: "Alex Rivera",
    reviewer_name: ["Marcos Rivera", "Elena Salgado", "Carlos M."][n - 1],
    review_status:
      saved && savedRegistration === id(n + 10) ? "published" : null,
    can_review: n !== 3
  }));
  const savedReview =
    selected?.registration_id === savedRegistration ? saved : null;
  const deadline = selected?.deadline ?? date(334);
  const sessionEnd = Date.parse(deadline) - 14 * 24 * 3600000;
  const context: ReviewContext = {
    registration_id: selected?.registration_id ?? id(11),
    session_id: id(31),
    session_title: selected?.session_title ?? "Saturday social padel",
    host_name: "Alex Rivera",
    reviewer_name: "Marcos Rivera",
    starts_at: new Date(sessionEnd - 90 * 60000).toISOString(),
    timezone: "America/Argentina/Buenos_Aires",
    ends_at: new Date(sessionEnd).toISOString(),
    deadline,
    is_author: mode === "player",
    eligible: selected?.can_review === true || !!savedReview,
    reported,
    review: savedReview
      ? {
          id: id(21),
          ...savedReview,
          status: "published",
          created_at: date(-1),
          updated_at: date(0)
        }
      : null
  };
  const close = () =>
    dirty
      ? Alert.alert(
          "Discard your changes?",
          "Your review changes haven’t been saved.",
          [
            { text: "Keep editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                setSelected(null);
                setDirty(false);
              }
            }
          ]
        )
      : setSelected(null);
  const submit = (input: ReviewInput) => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (state === "save-error") {
        toast.show({
          title: "Couldn’t save your review",
          description: "Check your connection and try again.",
          tone: "error"
        });
        return;
      }
      setSaved(input);
      setSavedRegistration(selected?.registration_id ?? null);
      setSelected(null);
      setDirty(false);
      toast.show({ title: "Review published", tone: "success" });
    }, 700);
  };
  return (
    <>
      <NotificationInboxView
        mode={mode}
        items={
          state === "empty"
            ? []
            : items.filter((item) => !unread || !item.read_at)
        }
        loading={state === "loading"}
        error={state === "error"}
        unread={unread}
        onFilter={setUnread}
        onBack={goBack}
        onOpen={(item) => {
          setSelected(item);
          setRead((old) => [...old, item.id]);
        }}
        onRefresh={() => undefined}
        refreshing={false}
        onMore={() => undefined}
        more={false}
        moreError={false}
        onRetryMore={() => undefined}
        preview
      />
      {selected && isExpiredReviewInvitation(selected) ? (
        <ReviewExpiredSheet
          sessionTitle={selected.session_title}
          deadline={selected.deadline}
          onClose={close}
        />
      ) : selected ? (
        <ReviewSheetShell
          title={
            reporting
              ? "Report review"
              : mode === "player"
                ? "Rate your session"
                : "Session review"
          }
          onClose={close}
          busy={busy}
        >
          <View style={{ gap: 20 }}>
            <ReviewSessionSummary context={context} />
            {mode === "player" ? (
              <ReviewForm
                context={context}
                busy={busy}
                onDirty={setDirty}
                onSave={submit}
                onDelete={() =>
                  Alert.alert(
                    "Delete your review?",
                    "You won’t be able to post another review for this session.",
                    [
                      { text: "Keep review", style: "cancel" },
                      {
                        text: "Delete review",
                        style: "destructive",
                        onPress: () => {
                          setSaved(null);
                          setSelected(null);
                          toast.show({
                            title: "Review deleted",
                            tone: "success"
                          });
                        }
                      }
                    ]
                  )
                }
              />
            ) : reporting ? (
              <ReviewReportForm
                busy={busy}
                onCancel={() => setReporting(false)}
                onSubmit={() => {
                  setReported(true);
                  setReporting(false);
                  toast.show({ title: "Report submitted", tone: "success" });
                }}
              />
            ) : (
              <>
                <AppText variant="label">{selected.reviewer_name}</AppText>
                <ReviewStars value={5} />
                <AppText>
                  Friendly host and a well organized session. I’ll join again!
                </AppText>
                <AppButton
                  variant="ghost"
                  isDisabled={reported}
                  onPress={() => setReporting(true)}
                >
                  {reported ? "Already reported" : "Report review"}
                </AppButton>
              </>
            )}
          </View>
        </ReviewSheetShell>
      ) : null}
    </>
  );
}
