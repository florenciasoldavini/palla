import { useEffect } from "react";
import { View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, UserRound } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  TextAreaField
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  reviewInputSchema,
  type ReviewContext,
  type ReviewInput
} from "../domain";
import { ReviewStars } from "./review-stars";
import { reviewDate } from "../format";
const ratingLabels = [
  "Tap to rate",
  "Poor",
  "Fair",
  "Okay",
  "Good",
  "Excellent"
];
export function ReviewForm({
  context,
  busy,
  onSave,
  onDelete,
  onDirty
}: {
  context: ReviewContext;
  busy: boolean;
  onSave: (input: ReviewInput) => void;
  onDelete: () => void;
  onDirty: (value: boolean) => void;
}) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isDirty, errors }
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewInputSchema),
    defaultValues: {
      rating: context.review?.rating ?? 0,
      comment: context.review?.comment ?? ""
    }
  });
  const rating = watch("rating"),
    comment = watch("comment");
  useEffect(() => {
    onDirty(isDirty);
  }, [isDirty, onDirty]);
  const removed = context.review?.status === "removed";
  return (
    <View style={{ gap: 16 }}>
      {context.review?.status === "hidden" && (
        <AppText variant="bodySm" tone="subtle">
          This review is hidden. Saving changes will publish it again.
        </AppText>
      )}
      {!context.eligible && (
        <AppText variant="bodySm" tone="subtle">
          {removed
            ? "This review was removed. You can’t post another review for this session."
            : "The review window is unavailable or has closed."}
        </AppText>
      )}
      {!removed && (
        <>
          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <View style={{ gap: 12 }}>
                <AppHeading variant="card">How was your session?</AppHeading>
                <View
                  style={{ width: "100%", maxWidth: 288, alignSelf: "center" }}
                >
                  <ReviewStars
                    value={field.value}
                    onChange={context.eligible ? field.onChange : undefined}
                    disabled={busy}
                  />
                </View>
                <AppText
                  variant="bodySm"
                  tone="subtle"
                  style={{ textAlign: "center" }}
                >
                  {ratingLabels[rating]}
                </AppText>
                {errors.rating && (
                  <AppText tone="danger">{errors.rating.message}</AppText>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="comment"
            render={({ field }) => (
              <View style={{ gap: 6 }}>
                <TextAreaField
                  label="Your review"
                  accessibilityLabel="Your review (optional)"
                  placeholder="What was good? What could be better?"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  editable={!busy && context.eligible}
                  maxLength={2000}
                  minHeight={96}
                  errorText={errors.comment?.message}
                />
                <AppText
                  variant="caption"
                  tone="subtle"
                  style={{ textAlign: "right" }}
                >
                  {comment.length.toLocaleString("en-US")} / 2,000
                </AppText>
              </View>
            )}
          />
        </>
      )}
      <View style={{ gap: 8 }}>
        {!removed && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <UserRound size={16} color={c.textSubtle} />
            <AppText variant="caption" tone="subtle" style={{ flex: 1 }}>
              Published with your name and photo.
            </AppText>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Clock size={16} color={c.textSubtle} />
          <AppText variant="caption" tone="subtle" style={{ flex: 1 }}>
            Post or edit until {reviewDate(context.deadline)}.
          </AppText>
        </View>
      </View>
      {context.eligible && (
        <AppButton
          color="essential"
          onPress={handleSubmit(onSave)}
          isDisabled={rating < 1 || busy}
          loading={busy}
        >
          {context.review ? "Save changes" : "Post review"}
        </AppButton>
      )}
      {context.review && !removed && (
        <AppButton
          variant="ghost"
          color="danger"
          onPress={onDelete}
          isDisabled={busy}
        >
          Delete review
        </AppButton>
      )}
    </View>
  );
}
