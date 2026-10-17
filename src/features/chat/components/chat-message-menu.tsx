import { ChatPhotoBubble } from "./chat-photo-bubble";
import { AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Check, CheckCheck } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  chatReceiptState,
  type ChatMessage,
  type ReactionEmoji
} from "../domain";
import { ChatReactionPicker } from "./chat-reactions";
import type { ChatMenuAction } from "./chat-action-sheet";

export type MessageAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** A selected bubble and its nearby actions share one native modal/focus boundary. */
export function ChatMessageMenu({
  message,
  anchor,
  mine,
  readSequence,
  actions,
  error,
  onClose,
  actorId,
  onReact,
  reacting = false,
  confirmation
}: {
  message: ChatMessage;
  anchor: MessageAnchor;
  mine: boolean;
  readSequence: string | null;
  actions: ChatMenuAction[];
  error?: string | null;
  onClose: () => void;
  actorId?: string;
  onReact?: (emoji: ReactionEmoji | null) => void;
  reacting?: boolean;
  confirmation?: ReactNode;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menuHeight, setMenuHeight] = useState(actions.length * 52 + 8);
  const [bubbleHeight, setBubbleHeight] = useState(anchor.height);
  const [reactionHeight, setReactionHeight] = useState(52);
  const reactionSpace = onReact ? reactionHeight + sp[2] : 0;
  const [pressed, setPressed] = useState<string | null>(null);
  const edge = sp[5];
  const topEdge = insets.top + sp[3];
  const bottomEdge = height - insets.bottom - sp[3];
  const available = bottomEdge - topEdge;
  const menuMax = Math.min(available * 0.55, Math.max(180, available - 100));
  const bubbleMax = Math.max(
    48,
    available - Math.min(menuHeight, menuMax) - sp[2] - reactionSpace
  );
  const bubbleWidth = Math.min(anchor.width, width - edge * 2);
  const menuWidth = Math.min(
    Math.max(224, 190 * Math.min(fontScale, 1.5)),
    width - edge * 2
  );
  const groupHeight =
    Math.min(bubbleHeight, bubbleMax) +
    sp[2] +
    Math.min(menuHeight, menuMax) +
    reactionSpace;
  const top = Math.max(topEdge, Math.min(anchor.y, bottomEdge - groupHeight));
  const bubbleLeft = Math.max(
    edge,
    Math.min(anchor.x, width - edge - bubbleWidth)
  );
  const menuLeft = Math.max(
    edge,
    Math.min(
      mine ? bubbleLeft + bubbleWidth - menuWidth : bubbleLeft,
      width - edge - menuWidth
    )
  );
  const receipt = chatReceiptState(message, readSequence);
  const Receipt = receipt === "sent" ? Check : CheckCheck;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {confirmation ?? (
        <View
          style={styles.overlay}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Dismiss message actions"
            onPress={onClose}
          />
          <View
            style={{
              position: "absolute",
              top,
              left: Math.max(
                edge,
                Math.min(
                  bubbleLeft,
                  width - edge - Math.min(304, width - edge * 2)
                )
              ),
              width: Math.min(304, width - edge * 2)
            }}
            onLayout={(event) =>
              setReactionHeight(event.nativeEvent.layout.height)
            }
          >
            {onReact && (
              <ChatReactionPicker
                selected={
                  message.reactions?.find((r) => r.profile_id === actorId)
                    ?.emoji
                }
                disabled={reacting}
                onChoose={onReact}
              />
            )}
          </View>
          <View
            style={{
              position: "absolute",
              top: top + reactionSpace,
              left: bubbleLeft,
              width: bubbleWidth
            }}
          >
            <View
              style={[styles.lift, { maxHeight: bubbleMax }]}
              onLayout={(event) =>
                setBubbleHeight(event.nativeEvent.layout.height)
              }
            >
              <ScrollView
                bounces={false}
                style={{
                  maxHeight: bubbleMax,
                  borderRadius: 16,
                  overflow: "hidden"
                }}
                contentContainerStyle={[styles.bubble, mine && styles.mine]}
              >
                {message.attachments?.[0]?.type === "image" && (
                  <ChatPhotoBubble
                    interactive={false}
                    actorId={actorId ?? message.sender_id}
                    attachment={message.attachments[0]}
                    caption={message.body ?? ""}
                    name={mine ? "You" : "Photo"}
                    createdAt={message.created_at}
                  />
                )}
                <AppText
                  accessibilityLabel={`Selected message: ${message.body}`}
                >
                  {message.body}
                </AppText>
                <View
                  style={[
                    styles.meta,
                    { justifyContent: mine ? "flex-end" : "flex-start" }
                  ]}
                >
                  {message.edited_at && (
                    <AppText variant="caption" tone="subtle">
                      Edited
                    </AppText>
                  )}
                  <AppText variant="caption" tone="subtle">
                    {new Date(message.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </AppText>
                  {mine && (
                    <Receipt
                      size={16}
                      color={receipt === "read" ? c.accent : c.textSubtle}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
          <View
            style={[
              styles.menu,
              {
                top:
                  top +
                  reactionSpace +
                  Math.min(bubbleHeight, bubbleMax) +
                  sp[2],
                left: menuLeft,
                width: menuWidth,
                maxHeight: menuMax
              }
            ]}
            onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
          >
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={action.onPress}
                    onPressIn={() => setPressed(action.label)}
                    onPressOut={() => setPressed(null)}
                    style={[
                      styles.action,
                      index > 0 && styles.divider,
                      pressed === action.label && styles.pressed
                    ]}
                  >
                    <AppText
                      style={{ flex: 1 }}
                      tone={action.danger ? "danger" : "default"}
                    >
                      {action.label === "Delete message"
                        ? "Delete"
                        : action.label}
                    </AppText>
                    <Icon
                      size={20}
                      color={action.danger ? c.errorText : c.text}
                    />
                  </Pressable>
                );
              })}
              {error && (
                <AppText
                  tone="danger"
                  variant="caption"
                  accessibilityLiveRegion="polite"
                  style={{ padding: sp[3] }}
                >
                  {error}
                </AppText>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(26,27,34,0.22)" },
  lift: {
    borderRadius: 16,
    shadowColor: c.text,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: c.surface
  },
  bubble: { padding: sp[3], gap: sp[1], backgroundColor: c.surface },
  mine: { backgroundColor: c.surfaceRaised },
  meta: { flexDirection: "row", alignItems: "center", gap: sp[2] },
  menu: {
    position: "absolute",
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: c.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8
  },
  action: {
    minHeight: 52,
    paddingHorizontal: sp[4],
    paddingVertical: sp[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[4]
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle
  },
  pressed: { backgroundColor: c.surfaceRaised }
});
