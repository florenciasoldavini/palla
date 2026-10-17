import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { View } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  ErrorState,
  FieldMessage,
  SkeletonBlock,
  TextField
} from "@/components/atoms";
import {
  organizerDetailsSchema,
  type OrganizerDetailsInput
} from "@/features/organizer/domain";
import {
  useOrganizerProfile,
  useUpdateOrganizerDetails
} from "../hooks-organizer";

export function OrganizerDetailsForm({
  id,
  onDirtyChange,
  onSavingChange
}: {
  id?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}) {
  const query = useOrganizerProfile(id, true);
  const save = useUpdateOrganizerDetails(id);
  const { control, handleSubmit, reset, formState } =
    useForm<OrganizerDetailsInput>({
      resolver: zodResolver(organizerDetailsSchema),
      mode: "onChange",
      defaultValues: { display_name: "", bio: null }
    });
  useEffect(() => {
    if (query.data && !formState.isDirty)
      reset({ display_name: query.data.display_name, bio: query.data.bio });
  }, [query.data, formState.isDirty, reset]);
  useEffect(() => {
    onDirtyChange?.(formState.isDirty);
    return () => onDirtyChange?.(false);
  }, [formState.isDirty, onDirtyChange]);
  useEffect(() => {
    onSavingChange?.(save.isPending);
    return () => onSavingChange?.(false);
  }, [save.isPending, onSavingChange]);
  if (query.isPending) return <SkeletonBlock height={240} />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Organizer profile couldn’t load"
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  return (
    <AppCard padding="lg" style={{ gap: 20 }}>
      <View style={{ gap: 4 }}>
        <AppHeading variant="card">Organizer profile</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          Introduce yourself and the sessions you host.
        </AppText>
      </View>
      <Controller
        control={control}
        name="display_name"
        render={({ field, fieldState }) => (
          <TextField
            label="Organizer name"
            placeholder="Your name or hosting group"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorText={fieldState.error?.message}
            required
            maxLength={100}
            editable={!save.isPending}
          />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <TextField
            label="Description"
            placeholder="Tell players about the sessions you organize…"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorText={fieldState.error?.message}
            multiline
            maxLength={1000}
            inputStyle={{ minHeight: 112, textAlignVertical: "top" }}
            editable={!save.isPending}
          />
        )}
      />
      <AppButton
        loading={save.isPending}
        isDisabled={!formState.isDirty || !formState.isValid || save.isPending}
        onPress={() =>
          void handleSubmit((input) =>
            save
              .mutateAsync(input)
              .then((saved) =>
                reset({ display_name: saved.display_name, bio: saved.bio })
              )
              .catch(() => undefined)
          )()
        }
      >
        Save organizer profile
      </AppButton>
      {save.isError && (
        <FieldMessage tone="error">
          Couldn’t save your organizer profile. Your changes are still here—try
          again.
        </FieldMessage>
      )}
      {save.isSuccess && !formState.isDirty && (
        <FieldMessage tone="success">Organizer profile updated.</FieldMessage>
      )}
    </AppCard>
  );
}
