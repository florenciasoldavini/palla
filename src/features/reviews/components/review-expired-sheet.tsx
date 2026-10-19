import { View } from "react-native";
import { Clock } from "lucide-react-native";
import { AppButton, AppText } from "@/components/atoms";
import { atomPalette } from "@/components/atoms/theme";
import { reviewDate } from "../format";
import { ReviewSheetShell } from "./review-sheet-shell";

export function ReviewExpiredSheet({
  sessionTitle,
  deadline,
  onClose
}: {
  sessionTitle: string;
  deadline: string;
  onClose: () => void;
}) {
  return (
    <ReviewSheetShell
      title="Review period ended"
      icon={Clock}
      closeLabel="Close explanation"
      busy={false}
      onClose={onClose}
    >
      <View style={{ gap: 20 }}>
        <AppText>
          You can write or edit a review for up to 14 days after a session ends.
        </AppText>
        <AppText>This session’s review period has ended.</AppText>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: atomPalette.borderSubtle,
            paddingTop: 16,
            gap: 4
          }}
        >
          <AppText variant="bodySm" tone="subtle">
            {sessionTitle}
          </AppText>
          <AppText variant="bodySm" tone="subtle">
            Reviews closed on {reviewDate(deadline)}
          </AppText>
        </View>
        <AppButton color="essential" onPress={onClose}>
          Got it
        </AppButton>
      </View>
    </ReviewSheetShell>
  );
}
