import {
  Mail,
  MailOpen,
  Pin,
  PinOff,
  Trash2,
  Ban,
  Flag
} from "lucide-react-native";
import { useState } from "react";
import {
  isConversationUnread,
  type ChatAction,
  type ConversationSummary
} from "../domain";
import { ChatBlockSheet } from "./chat-block-sheet";
import { ChatReportSheet } from "./chat-report-sheet";
import type { ChatReportInput, ChatReportResult } from "../report-domain";
import { ChatActionSheet } from "./chat-action-sheet";
import { ChatFloatingMenu } from "./chat-floating-menu";
import type { MessageAnchor } from "./chat-message-menu";

export function ChatConversationMenu({
  summary,
  onAction,
  onReport,
  onClose,
  anchor
}: {
  summary: ConversationSummary;
  onAction: (action: ChatAction) => Promise<void>;
  onReport?: (input: ChatReportInput) => Promise<ChatReportResult>;
  onClose: () => void;
  anchor: MessageAnchor;
}) {
  const [confirm, setConfirm] = useState<"delete" | "block" | "report" | null>(
    null
  );
  const [reportFromBlock, setReportFromBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: ChatAction) => {
    setBusy(true);
    setError(null);
    try {
      await onAction(action);
      onClose();
    } catch {
      setError(
        "Couldn’t update this chat. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };
  const unread = isConversationUnread(summary);
  const actions = [
    {
      label: summary.pinned_at ? "Unpin chat" : "Pin chat",
      icon: summary.pinned_at ? PinOff : Pin,
      onPress: () => void run(summary.pinned_at ? "unpin" : "pin")
    },
    {
      label: unread ? "Mark as read" : "Mark as unread",
      icon: unread ? MailOpen : Mail,
      onPress: () => void run(unread ? "mark_read" : "mark_unread")
    },
    {
      label: summary.blocked_by_me ? "Unblock user" : "Block user",
      icon: Ban,
      danger: !summary.blocked_by_me,
      onPress: () => {
        if (summary.blocked_by_me) void run("unblock");
        else {
          setReportFromBlock(false);
          setConfirm("block");
          setError(null);
        }
      }
    },
    ...(onReport
      ? [
          {
            label: "Report user",
            icon: Flag,
            onPress: () => {
              setReportFromBlock(false);
              setConfirm("report");
              setError(null);
            }
          }
        ]
      : []),
    {
      label: "Delete chat",
      icon: Trash2,
      danger: true,
      onPress: () => {
        setConfirm("delete");
        setError(null);
      }
    }
  ];
  const close = () => {
    if (!busy) onClose();
  };
  const confirmation =
    confirm === "delete"
      ? {
          description: summary.blocked_by_me
            ? "This clears your chat history. The blocked conversation stays in your inbox so you can unblock this person. Their copy is unchanged."
            : "This removes the conversation and its history for you. The other person keeps their copy. New messages will bring the chat back.",
          label: "Delete chat",
          onConfirm: () => void run("delete")
        }
      : undefined;
  return (
    <ChatFloatingMenu
      anchor={anchor}
      actions={actions}
      onClose={close}
      busy={busy}
      error={error}
      confirmation={
        confirm === "report" && onReport ? (
          <ChatReportSheet
            summary={summary}
            initialBlock={reportFromBlock}
            onBack={reportFromBlock ? () => setConfirm("block") : undefined}
            onClose={onClose}
            onSubmit={async (input) => {
              setBusy(true);
              try {
                return await onReport(input);
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : confirm === "block" ? (
          <ChatBlockSheet
            summary={summary}
            busy={busy}
            error={error}
            onClose={close}
            initialReport={reportFromBlock}
            onBlock={() => void run("block")}
            onReport={
              onReport
                ? () => {
                    setReportFromBlock(true);
                    setConfirm("report");
                    setError(null);
                  }
                : undefined
            }
          />
        ) : confirm ? (
          <ChatActionSheet
            embedded
            title="Delete chat?"
            busy={busy}
            error={error}
            onClose={close}
            confirmation={confirmation}
          />
        ) : undefined
      }
    />
  );
}
