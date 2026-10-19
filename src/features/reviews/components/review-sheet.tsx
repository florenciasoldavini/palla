import { useState } from "react";
import { Alert, View } from "react-native";
import { Flag } from "lucide-react-native";
import {
  AppButton,
  AppText,
  ErrorState,
  SkeletonBlock,
  useAppToast
} from "@/components/atoms";
import { isReviewWindowClosed } from "../domain";
import { ReviewExpiredSheet } from "./review-expired-sheet";
import { useReview } from "../hooks/use-review";
import { ReviewForm } from "./review-form";
import { ReviewSessionSummary } from "./review-session-summary";
import { ReviewStars } from "./review-stars";
import { ReviewReportForm } from "./review-report-form";
import { ReviewSheetShell } from "./review-sheet-shell";
export function ReviewSheet({
  registration,
  onClose
}: {
  registration: string;
  onClose: () => void;
}) {
  const { query, save, remove, report } = useReview(registration);
  const toast = useAppToast();
  const [dirty, setDirty] = useState(false),
    [reporting, setReporting] = useState(false);
  const busy = save.isPending || remove.isPending || report.isPending;
  const context = query.data;
  const close = () => {
    if (busy) return;
    if (dirty)
      Alert.alert(
        "Discard your changes?",
        "Your review changes haven’t been saved.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: onClose }
        ]
      );
    else onClose();
  };
  const failed = (title: string) =>
    toast.show({
      title,
      description:
        "Your changes haven’t been saved. Check your connection, or reopen the review to refresh its status and deadline.",
      tone: "error"
    });
  if (
    context?.is_author &&
    !context.review &&
    isReviewWindowClosed(context.deadline)
  ) {
    return (
      <ReviewExpiredSheet
        sessionTitle={context.session_title}
        deadline={context.deadline}
        onClose={onClose}
      />
    );
  }
  return (
    <ReviewSheetShell
      title={
        reporting
          ? "Report review"
          : context?.is_author
            ? context.review
              ? "Your review"
              : "Rate your session"
            : "Session review"
      }
      busy={busy}
      onClose={close}
    >
      {query.isPending ? (
        <SkeletonBlock height={320} />
      ) : query.isError || !context ? (
        <ErrorState
          title="Couldn’t load this review"
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <View style={{ gap: 20 }}>
          <ReviewSessionSummary context={context} />
          {reporting && context.review ? (
            <ReviewReportForm
              busy={busy}
              onCancel={() => setReporting(false)}
              onSubmit={(input) =>
                report.mutate(
                  { id: context.review!.id, input },
                  {
                    onSuccess: () => {
                      toast.show({
                        title: "Report submitted",
                        tone: "success"
                      });
                      setReporting(false);
                    },
                    onError: () => failed("Couldn’t submit report")
                  }
                )
              }
            />
          ) : context.is_author ? (
            <ReviewForm
              key={context.review?.updated_at ?? context.registration_id}
              context={context}
              busy={busy}
              onDirty={setDirty}
              onSave={(input) =>
                save.mutate(input, {
                  onSuccess: () => {
                    toast.show({
                      title: context.review
                        ? "Review updated"
                        : "Review published",
                      tone: "success"
                    });
                    onClose();
                  },
                  onError: () => failed("Couldn’t save your review")
                })
              }
              onDelete={() =>
                Alert.alert(
                  "Delete your review?",
                  "Your review will be removed from the session and the host’s profile. You won’t be able to post another review for this session.",
                  [
                    { text: "Keep review", style: "cancel" },
                    {
                      text: "Delete review",
                      style: "destructive",
                      onPress: () =>
                        remove.mutate(context.review!.id, {
                          onSuccess: () => {
                            toast.show({
                              title: "Review deleted",
                              tone: "success"
                            });
                            onClose();
                          },
                          onError: () => failed("Couldn’t delete review")
                        })
                    }
                  ]
                )
              }
            />
          ) : context.review?.status === "removed" ? (
            <AppText tone="subtle">This review was removed.</AppText>
          ) : context.review ? (
            <View style={{ gap: 16 }}>
              <AppText variant="label">{context.reviewer_name}</AppText>
              <ReviewStars value={context.review.rating} />
              {context.review.comment && (
                <AppText>{context.review.comment}</AppText>
              )}
              {context.review.status === "hidden" && (
                <AppText tone="subtle">
                  This review is hidden from public ratings.
                </AppText>
              )}
              <AppButton
                variant="ghost"
                icon={Flag}
                onPress={() => setReporting(true)}
                isDisabled={context.reported}
              >
                {context.reported ? "Already reported" : "Report review"}
              </AppButton>
            </View>
          ) : (
            <AppText tone="subtle">Review unavailable.</AppText>
          )}
        </View>
      )}
    </ReviewSheetShell>
  );
}
