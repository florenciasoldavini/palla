import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, View } from "react-native";
import { Circle, CircleDot } from "lucide-react-native";
import { AppButton, AppText, TextAreaField } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { reportInputSchema, reportReasons, type ReportInput } from "../domain";
export function ReviewReportForm({
  busy,
  onSubmit,
  onCancel
}: {
  busy: boolean;
  onSubmit: (input: ReportInput) => void;
  onCancel: () => void;
}) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ReportInput>({
    resolver: zodResolver(reportInputSchema),
    defaultValues: { details: "" }
  });
  return (
    <View style={{ gap: 16 }}>
      <AppText variant="label">Why are you reporting this review?</AppText>
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <View accessibilityRole="radiogroup" style={{ gap: 4 }}>
            {Object.entries(reportReasons).map(([key, label]) => {
              const Icon = key === field.value ? CircleDot : Circle;
              return (
                <Pressable
                  key={key}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: key === field.value,
                    disabled: busy
                  }}
                  onPress={() => field.onChange(key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 48
                  }}
                >
                  <Icon size={22} color={c.text} />
                  <AppText variant="bodySm" style={{ flex: 1 }}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      />
      <Controller
        control={control}
        name="details"
        render={({ field }) => (
          <TextAreaField
            label="Additional details"
            accessibilityLabel="Additional details (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Tell us a little more…"
            maxLength={2000}
            editable={!busy}
            errorText={errors.details?.message}
          />
        )}
      />
      <AppText variant="caption" tone="subtle">
        Reporting won’t automatically hide this review.
      </AppText>
      <AppButton
        color="essential"
        onPress={handleSubmit(onSubmit)}
        loading={busy}
        isDisabled={busy || !watch("reason")}
      >
        Submit report
      </AppButton>
      <AppButton variant="ghost" onPress={onCancel} isDisabled={busy}>
        Back to review
      </AppButton>
    </View>
  );
}
