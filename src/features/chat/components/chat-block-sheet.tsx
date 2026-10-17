import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Ban,
  Archive,
  Flag,
  MessageSquareOff,
  RotateCcw
} from "lucide-react-native";
import { AppButton, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { ConversationSummary } from "../domain";
import { ChatSafetySheet, ChatSafetyToggle } from "./chat-safety-sheet";
export function ChatBlockSheet({
  summary,
  busy,
  error,
  onClose,
  onBlock,
  onReport,
  initialReport = false
}: {
  summary: ConversationSummary;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onBlock: () => void;
  onReport?: () => void;
  initialReport?: boolean;
}) {
  const [report, setReport] = useState(initialReport);
  const fullName =
    [summary.other_participant.first_name, summary.other_participant.last_name]
      .filter(Boolean)
      .join(" ") || "this person";
  return (
    <ChatSafetySheet
      summary={summary}
      title={`Block ${fullName}?`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {report && (
            <AppText
              variant="caption"
              tone="subtle"
              style={{ textAlign: "center", marginBottom: sp[2] }}
            >
              Nothing is submitted until you finish the report.
            </AppText>
          )}
          {error && (
            <AppText
              tone="danger"
              variant="caption"
              accessibilityLiveRegion="polite"
            >
              {error}
            </AppText>
          )}
          <AppButton
            color="danger"
            icon={report ? Flag : Ban}
            iconAfter={false}
            loading={busy}
            onPress={report ? onReport : onBlock}
          >
            {report ? "Block & Report" : "Block user"}
          </AppButton>
          <AppButton variant="ghost" isDisabled={busy} onPress={onClose}>
            Cancel
          </AppButton>
        </>
      }
    >
      <View>
        {[
          {
            icon: MessageSquareOff,
            title: "Messages & online status",
            description:
              "You won’t be able to message each other or see when the other is online."
          },
          {
            icon: Archive,
            title: "Chat history & sessions",
            description: "Your messages and session registrations stay."
          },
          {
            icon: RotateCcw,
            title: "Unblock at any time",
            description: "You can remove your block whenever you want."
          }
        ].map(({ icon: Icon, title, description }, index) => (
          <View key={title}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <Icon size={20} color="#6b6385" />
              </View>
              <View style={styles.copy}>
                <AppText variant="label">{title}</AppText>
                <AppText variant="caption" tone="subtle">
                  {description}
                </AppText>
              </View>
            </View>
            {index < 2 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
      {onReport && (
        <ChatSafetyToggle
          icon={Flag}
          label={
            summary.other_role === "organizer"
              ? "Also report this host"
              : "Also report this player"
          }
          description="Choose a reason and include recent messages."
          value={report}
          onChange={setReport}
          disabled={busy}
        />
      )}
    </ChatSafetySheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    paddingHorizontal: sp[4] + 1,
    paddingVertical: sp[4]
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: sp[1] },
  divider: {
    marginLeft: sp[4] + 1 + 40 + sp[3],
    marginRight: sp[4] + 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle
  }
});
