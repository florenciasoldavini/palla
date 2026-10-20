import { View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { CancellationForm } from "./cancellation-form";
import type { CancelOccurrence, CancellationContext } from "../domain";
export function CancellationScreenView({
  context,
  loading,
  error,
  busy,
  preview = false,
  onRetry,
  onBack,
  onDirty,
  onCancel
}: {
  context?: CancellationContext;
  loading: boolean;
  error: boolean;
  busy: boolean;
  preview?: boolean;
  onRetry: () => void;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
  onCancel: (input: CancelOccurrence) => Promise<void>;
}) {
  return (
    <Screen keyboardSafe>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to session details"
            isDisabled={busy}
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Cancel session
          </AppHeading>
        </View>
        {preview && (
          <AppText variant="caption" tone="subtle">
            Design preview · No account changes
          </AppText>
        )}
        {loading ? (
          <>
            <SkeletonBlock height={128} />
            <SkeletonBlock height={350} />
          </>
        ) : error ? (
          <ErrorState title="Couldn’t load session" onRetry={onRetry} />
        ) : !context || (!context.can_cancel && !busy) ? (
          <EmptyState
            title="Cancellation unavailable"
            description="This session has started or was already cancelled."
            action={{ label: "Back to session", onPress: onBack }}
          />
        ) : (
          <CancellationForm
            context={context}
            busy={busy}
            onCancel={onCancel}
            onBack={onBack}
            onDirty={onDirty}
          />
        )}
      </View>
    </Screen>
  );
}
