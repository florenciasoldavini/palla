import type { LocalPhoto } from "../attachment-domain";
import { usePhotoComposer } from "../hooks/use-chat-photo";
import { ChatPhotoPreview } from "./chat-photo-preview";
import { ChatPhotoBubble } from "./chat-photo-bubble";
import { ChatBlockNotice } from "./chat-block-notice";
import { useChatLatest } from "../hooks/use-chat-latest";
import { ChatLatestButton } from "./chat-latest-button";
import { ChatUnreadDivider } from "./chat-unread-divider";
import { unreadDividerMessageId } from "../unread-boundary";
import { useChatSearch } from "../hooks/use-chat-search";
import type { ChatSearchLoader } from "../search-domain";
import { splitSearchText } from "../search-domain";
import {
  ChatSearchHeader,
  ChatSearchFeedback,
  ChatSearchNavigation
} from "./chat-search-controls";
import { getSansFontStyle } from "@/theme/fonts";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { categoryLabels } from "@/features/profile/playing-category";
import {
  ArrowLeft,
  Search,
  Calendar,
  Copy,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  MessageSquare,
  RotateCw,
  Clock3,
  Trash,
  Reply
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  chatReceiptState,
  type ChatMessage,
  type ConversationSummary,
  type ReplyQuote,
  type ReactionEmoji
} from "../domain";
import { ChatActionSheet } from "./chat-action-sheet";
import { ChatMessageMenu, type MessageAnchor } from "./chat-message-menu";
import { copyChatText } from "../services/chat.service";
import { ChatComposer } from "./chat-composer";
import { ChatReplyQuote } from "./chat-reply-quote";
import { ChatReactions } from "./chat-reactions";
import { ChatParticipantAvatar } from "./chat-participant-avatar";
export type PendingMessage = {
  id: string;
  body: string;
  created_at: string;
  state: "queued" | "sending" | "failed";
  reply_to_id?: string | null;
  photo?: LocalPhoto;
};
export function participantName(summary: ConversationSummary) {
  return (
    [summary.other_participant.first_name, summary.other_participant.last_name]
      .filter(Boolean)
      .join(" ") || "Palla member"
  );
}
export function ChatThread({
  summary,
  actorId,
  searchLoader,
  messages,
  initialReadSequence,
  pending = [],
  initialDraft,
  draftReady,
  localError,
  onDraftChange,
  reply,
  replyLoading = false,
  onReply,
  onCancelReply,
  onReact,
  onDiscard,
  loading = false,
  error,
  onReload,
  onSend,
  onPhotoSend,
  onUnblock,
  onEdit,
  onDelete,
  onRetry,
  onBack,
  hasEarlier = false,
  loadingEarlier = false,
  earlierError = false,
  onEarlier,
  preview = false,
  typing = false,
  online = false,
  onTypingChange,
  connection = "live"
}: {
  onPhotoSend?: (
    body: string,
    photo: LocalPhoto,
    replyTo?: string | null
  ) => Promise<void>;
  onUnblock?: () => Promise<unknown>;
  searchLoader?: ChatSearchLoader;
  initialDraft?: string;
  draftReady?: boolean;
  localError?: string | null;
  onDraftChange?: (body: string) => void;
  reply?: ReplyQuote | null;
  replyLoading?: boolean;
  onReply?: (message: ChatMessage) => void | Promise<unknown>;
  onCancelReply?: () => void;
  onReact?: (
    message: ChatMessage,
    emoji: ReactionEmoji | null
  ) => Promise<void>;
  onDiscard?: (message: PendingMessage) => void;
  typing?: boolean;
  online?: boolean;
  onTypingChange?: (hasText: boolean) => void;
  preview?: boolean;
  summary: ConversationSummary;
  actorId: string;
  messages: ChatMessage[];
  initialReadSequence?: string;
  pending?: PendingMessage[];
  loading?: boolean;
  error?: string | null;
  onReload: () => void;
  onEdit?: (message: ChatMessage, body: string) => Promise<void>;
  onDelete?: (message: ChatMessage) => Promise<void>;
  onSend: (body: string, replyTo?: string | null) => void | Promise<unknown>;
  onRetry: (message: PendingMessage) => void;
  onBack: () => void;
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  earlierError?: boolean;
  onEarlier?: () => void | Promise<unknown>;
  connection?: "live" | "connecting" | "offline";
}) {
  const search = useChatSearch(actorId, summary.conversation.id, searchLoader);
  const [unreadEntry] = useState(() =>
    initialReadSequence !== undefined && summary.last_message
      ? { through: initialReadSequence, latest: summary.last_message.sequence }
      : null
  );
  const unreadMessageId = unreadDividerMessageId(
    messages,
    actorId,
    unreadEntry,
    hasEarlier
  );
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Keyboard.isVisible()
  );
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const { active: searchActive, close: closeSearch } = search;
  useEffect(() => {
    if (!searchActive) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeSearch();
      return true;
    });
    return () => sub.remove();
  }, [searchActive, closeSearch]);
  const insets = useSafeAreaInsets();
  const name = participantName(summary);
  const photoComposer = usePhotoComposer(actorId);
  const [photoSentVersion, setPhotoSentVersion] = useState(0);
  const available = summary.messaging_available !== false;
  useEffect(() => {
    if (!available) {
      Keyboard.dismiss();
      setSelected(null);
      setEditing(null);
      onTypingChange?.(false);
    }
  }, [available, onTypingChange]);
  const sharedSession = summary.session_context?.next_session;
  const additionalSessions = Math.max(
    0,
    (summary.session_context?.upcoming_count ?? 0) - 1
  );
  const bubbles = useRef(new Map<string, View>());
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const [anchor, setAnchor] = useState<MessageAnchor | null>(null);
  useEffect(() => () => clearTimeout(selectionTimer.current), []);
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [jumpTarget, setJumpTarget] = useState<ReplyQuote | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [reactionBusy, setReactionBusy] = useState(false);
  const reactionInFlight = useRef(false);
  const react = async (
    message: ChatMessage,
    emoji: ReactionEmoji | null,
    fromMenu = false
  ) => {
    if (!onReact || reactionInFlight.current) return;
    reactionInFlight.current = true;
    setReactionBusy(true);
    setActionError(null);
    try {
      await onReact(message, emoji);
      if (fromMenu) closeMenu();
    } catch {
      const text =
        "Couldn’t update your reaction. Check your connection and try again.";
      if (fromMenu) setActionError(text);
      else setNotice(text);
    } finally {
      reactionInFlight.current = false;
      setReactionBusy(false);
    }
  };
  const actionTarget = messages.find((m) => m.id === selected?.id);
  useEffect(() => {
    if (selected && (!actionTarget || actionTarget.deleted_at)) {
      setSelected(null);
      setConfirmDelete(false);
      setActionError(null);
      setNotice("This message is no longer available.");
    }
  }, [selected, actionTarget]);
  useEffect(() => {
    if (editing && messages.some((m) => m.id === editing.id && m.deleted_at)) {
      setEditing(null);
      setNotice("This message was deleted.");
    }
  }, [messages, editing, selected]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const openMessage = (message: ChatMessage) => {
    clearTimeout(selectionTimer.current);
    const measure = () =>
      bubbles.current
        .get(message.id)
        ?.measureInWindow((x, y, width, height) => {
          if (!width || !height) return;
          setAnchor({ x, y, width, height });
          setSelected(message);
          setActionError(null);
          setConfirmDelete(false);
        });
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      selectionTimer.current = setTimeout(measure, 350);
    } else measure();
  };
  const closeMenu = () => {
    setSelected(null);
    setConfirmDelete(false);
    setActionError(null);
  };
  const remove = async () => {
    if (!selected || !onDelete) return;
    setBusy(true);
    setActionError(null);
    try {
      await onDelete(selected);
      if (editing?.id === selected.id) setEditing(null);
      closeMenu();
    } catch {
      setActionError(
        "Couldn’t delete this message. Close the menu, check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };
  const saveEdit = async (body: string) => {
    if (!editing || !onEdit) return;
    setBusy(true);
    setEditError(null);
    try {
      await onEdit(editing, body);
      setEditing(null);
    } catch {
      setEditError(
        "Couldn’t save changes. Check your connection, or cancel editing and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const list = useRef<FlatList<ChatMessage | PendingMessage>>(null);
  const latest = useChatLatest(messages, actorId, loading, search.active);
  const jumpToLatest = () => {
    setJumpTarget(null);
    setHighlight(null);
    clearTimeout(scrollRetry.current);
    latest.reset();
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };
  const earlierInFlight = useRef(false);
  const loadEarlier = async (retry = false) => {
    if (
      !hasEarlier ||
      !onEarlier ||
      loading ||
      loadingEarlier ||
      earlierInFlight.current ||
      (earlierError && !retry)
    )
      return;
    earlierInFlight.current = true;
    try {
      await onEarlier();
    } catch {
      // The query owns the error state; do not retry on every scroll event.
    } finally {
      earlierInFlight.current = false;
    }
  };
  const visibleMessages = search.active
    ? (search.page?.messages ?? [])
    : messages;
  const known = new Set(messages.map((m) => m.id));
  const rows = [
    ...visibleMessages,
    ...(!search.active ? pending.filter((m) => !known.has(m.id)) : [])
  ].reverse();
  const quoteAuthor = (quote: ReplyQuote) =>
    !quote.available
      ? "Original message"
      : quote.sender_id === actorId
        ? "You"
        : name;
  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(timer);
  }, [highlight]);
  useEffect(() => {
    if (!jumpTarget) return;
    const index = [
      ...messages,
      ...pending.filter((m) => !messages.some((known) => known.id === m.id))
    ]
      .reverse()
      .findIndex((m) => m.id === jumpTarget.id);
    if (index >= 0) {
      // Native virtualized rows settle after the history page commits.
      const timer = setTimeout(() => {
        list.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5
        });
        setHighlight(jumpTarget.id);
        setJumpTarget(null);
      }, 200);
      return () => clearTimeout(timer);
    } else if (!loadingEarlier && !loading && !earlierInFlight.current) {
      if (!hasEarlier || !onEarlier) {
        setNotice("This original message is no longer available.");
        setJumpTarget(null);
      } else if (earlierError) {
        setNotice(
          "Couldn’t find the original message. Retry loading older messages, then tap the quote again."
        );
        setJumpTarget(null);
      } else {
        earlierInFlight.current = true;
        void Promise.resolve(onEarlier?.())
          .catch(() => {
            setNotice(
              "Couldn’t load the original message. Try tapping the quote again."
            );
            setJumpTarget(null);
          })
          .finally(() => {
            earlierInFlight.current = false;
            setJumpTarget((target) => (target ? { ...target } : null));
          });
      }
    }
  }, [
    jumpTarget,
    messages,
    pending,
    loadingEarlier,
    loading,
    hasEarlier,
    earlierError,
    onEarlier
  ]);
  const scrollRetry = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const scrollAttempts = useRef(0);
  useEffect(() => () => clearTimeout(scrollRetry.current), []);
  const selectedSearchId = search.page?.selected_id;
  const selectedSearchIndex = rows.findIndex((m) => m.id === selectedSearchId);
  useEffect(() => {
    if (!searchActive || !selectedSearchId || selectedSearchIndex < 0) return;
    scrollAttempts.current = 0;
    const timer = setTimeout(
      () =>
        list.current?.scrollToIndex({
          index: selectedSearchIndex,
          animated: true,
          viewPosition: 0.5
        }),
      200
    );
    return () => clearTimeout(timer);
  }, [searchActive, selectedSearchId, selectedSearchIndex]);
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });
  return (
    <KeyboardAvoidingView
      // Android hide events can retain toolbar coordinates. Clear avoidance when
      // the IME is hidden, and keep the root filling the window while it is open.
      enabled={Platform.OS !== "android" || keyboardVisible}
      behavior="padding"
      style={[styles.screen, { paddingTop: insets.top }]}
    >
      {search.active ? (
        <ChatSearchHeader search={search} />
      ) : (
        <View style={styles.header}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to messages"
            onPress={onBack}
          />
          <ChatParticipantAvatar
            summary={summary}
            online={available && online}
            showStatus={available}
          />
          <View style={{ flex: 1, gap: sp[1] }}>
            <AppHeading variant="card">{name}</AppHeading>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: sp[1] }}
            >
              <AppText
                variant="caption"
                tone={available && online && !typing ? "accent" : "subtle"}
                accessibilityLiveRegion="polite"
              >
                {available && typing
                  ? "Typing…"
                  : available && online
                    ? "Online"
                    : summary.other_role === "organizer"
                      ? "Organizer"
                      : `Player${summary.other_participant.playing_category ? ` · ${categoryLabels[summary.other_participant.playing_category]}` : ""}`}
              </AppText>
            </View>
          </View>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={Search}
            accessibilityLabel="Search conversation"
            onPress={() => {
              setJumpTarget(null);
              setHighlight(null);
              setSelected(null);
              onTypingChange?.(false);
              search.open();
            }}
          />
        </View>
      )}
      {notice && (
        <AppText
          variant="caption"
          tone="subtle"
          accessibilityLiveRegion="polite"
          style={styles.notice}
        >
          {notice}
        </AppText>
      )}
      {jumpTarget && (
        <View
          style={[
            styles.notice,
            { flexDirection: "row", alignItems: "center" }
          ]}
        >
          <AppText variant="caption" tone="subtle" style={{ flex: 1 }}>
            Finding original message…
          </AppText>
          <AppButton
            variant="ghost"
            size="sm"
            onPress={() => setJumpTarget(null)}
          >
            Cancel
          </AppButton>
        </View>
      )}
      {preview && (
        <AppText
          variant="caption"
          tone="subtle"
          style={{ textAlign: "center" }}
        >
          Design preview · No account changes
        </AppText>
      )}
      {!search.active && sharedSession && (
        <View style={styles.context}>
          <View style={styles.contextIcon}>
            <Calendar size={18} color={c.text} />
          </View>
          <View style={{ flexShrink: 1, gap: sp[1] }}>
            <AppText variant="label">{sharedSession.title}</AppText>
            <AppText variant="caption" tone="subtle">
              {new Date(sharedSession.starts_at).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "America/Argentina/Buenos_Aires"
              })}{" "}
              ·{" "}
              {new Date(sharedSession.starts_at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Argentina/Buenos_Aires"
              })}{" "}
              · Buenos Aires
            </AppText>
          </View>
          {additionalSessions > 0 && (
            <AppText
              variant="caption"
              style={{
                backgroundColor: c.surfaceRaised,
                paddingHorizontal: sp[2],
                paddingVertical: sp[1],
                borderRadius: 999
              }}
              accessibilityLabel={`${additionalSessions} more shared upcoming sessions`}
            >
              +{additionalSessions} more
            </AppText>
          )}
        </View>
      )}
      {connection !== "live" && (
        <AppText
          variant="caption"
          tone="subtle"
          accessibilityLiveRegion="polite"
          style={styles.notice}
        >
          Reconnecting… Messages may be delayed.
        </AppText>
      )}
      {localError && (
        <AppText
          tone="danger"
          variant="caption"
          accessibilityLiveRegion="polite"
          style={styles.notice}
        >
          {localError}
        </AppText>
      )}
      {error && (
        <View style={styles.notice}>
          <ErrorState
            contained
            variant="inline"
            title="Messages couldn’t refresh"
            description={error}
            onRetry={onReload}
          />
        </View>
      )}
      <View style={{ flex: 1 }}>
        {search.active &&
        (!search.page?.messages.length || search.loading || search.error) ? (
          <ChatSearchFeedback search={search} />
        ) : loading && messages.length === 0 ? (
          <View style={styles.placeholder}>
            <SkeletonBlock height={120} />
          </View>
        ) : (
          <FlatList
            cssInterop={false}
            renderScrollComponent={(props) => (
              <ScrollView {...props} cssInterop={false} />
            )}
            key={search.active ? "search-history" : "live-history"}
            ref={list}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messages}
            data={rows}
            inverted={rows.length > 0}
            maintainVisibleContentPosition={
              search.active || jumpTarget || highlight
                ? undefined
                : { minIndexForVisible: 0, autoscrollToTopThreshold: 80 }
            }
            onEndReached={() => {
              if (!search.active) void loadEarlier();
            }}
            onEndReachedThreshold={0.3}
            onScroll={latest.onScroll}
            scrollEventThrottle={32}
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              if (scrollAttempts.current++ >= 2) {
                scrollAttempts.current = 0;
                setNotice(
                  "The original message is loaded. Scroll a little further to see it."
                );
                return;
              }
              list.current?.scrollToOffset({
                offset: averageItemLength * index,
                animated: false
              });
              clearTimeout(scrollRetry.current);
              scrollRetry.current = setTimeout(
                () =>
                  list.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5
                  }),
                500
              );
            }}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View>
                <EmptyState
                  contained
                  icon={MessageSquare}
                  title="Start the conversation"
                  description="Send a message to coordinate your next game."
                />
              </View>
            }
            ListFooterComponent={
              !search.active && loadingEarlier ? (
                <View
                  style={{ padding: sp[3], alignItems: "center", gap: sp[2] }}
                >
                  <ActivityIndicator
                    color={c.accent}
                    accessibilityLabel="Loading older messages"
                  />
                  <AppText variant="caption" tone="subtle">
                    Loading older messages…
                  </AppText>
                </View>
              ) : !search.active && earlierError ? (
                <View
                  style={{ padding: sp[3], alignItems: "center", gap: sp[2] }}
                >
                  <AppText variant="caption" tone="subtle">
                    Older messages couldn’t load.
                  </AppText>
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onPress={() => void loadEarlier(true)}
                  >
                    Retry older messages
                  </AppButton>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const queued = "state" in item;
              const mine = queued || item.sender_id === actorId;
              const receipt =
                !queued && mine
                  ? chatReceiptState(item, summary.other_read_sequence)
                  : "sent";
              const seen = receipt === "read";
              const ReceiptIcon = receipt === "sent" ? Check : CheckCheck;
              const next = rows[index + 1];
              const showDate =
                !next || date(next.created_at) !== date(item.created_at);
              return (
                <View style={{ gap: sp[3] }}>
                  {showDate && (
                    <AppText
                      variant="caption"
                      tone="subtle"
                      style={{ textAlign: "center" }}
                    >
                      {date(item.created_at)}
                    </AppText>
                  )}
                  {!search.active && item.id === unreadMessageId && (
                    <ChatUnreadDivider />
                  )}
                  <View
                    style={[
                      styles.messageRow,
                      mine && styles.outgoingRow,
                      selected?.id === item.id && { opacity: 0 }
                    ]}
                  >
                    {!mine && (
                      <ChatParticipantAvatar summary={summary} showBadge />
                    )}
                    <View
                      style={[
                        styles.message,
                        mine ? styles.outgoing : styles.incoming
                      ]}
                    >
                      {!mine && (
                        <View style={styles.sender}>
                          <AppText style={styles.senderName}>{name}</AppText>
                          <AppText variant="caption" tone="subtle">
                            {new Date(item.created_at).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit"
                              }
                            )}
                          </AppText>
                        </View>
                      )}
                      <View
                        cssInterop={false}
                        ref={(node) => {
                          if (node) bubbles.current.set(item.id, node);
                          else bubbles.current.delete(item.id);
                        }}
                        collapsable={false}
                        style={[
                          styles.bubble,
                          mine && styles.mine,
                          search.active &&
                            search.page?.selected_id === item.id && {
                              borderColor: c.accent
                            },
                          highlight === item.id && {
                            borderColor: c.accent,
                            backgroundColor: c.brandHover
                          }
                        ]}
                      >
                        {!queued && !item.deleted_at && item.reply && (
                          <ChatReplyQuote
                            quote={item.reply}
                            author={quoteAuthor(item.reply)}
                            onPress={
                              search.active
                                ? undefined
                                : () => {
                                    Keyboard.dismiss();
                                    scrollAttempts.current = 0;
                                    setJumpTarget(item.reply!);
                                  }
                            }
                          />
                        )}
                        {queued && item.reply_to_id && (
                          <AppText variant="caption" tone="subtle">
                            Replying to a message
                          </AppText>
                        )}
                        {((!queued &&
                          !item.deleted_at &&
                          item.attachments?.[0]?.type === "image") ||
                          (queued && item.photo)) && (
                          <ChatPhotoBubble
                            actorId={actorId}
                            attachment={
                              !queued ? item.attachments?.[0] : undefined
                            }
                            local={queued ? item.photo : undefined}
                            caption={item.body ?? ""}
                            name={mine ? "You" : name}
                            createdAt={item.created_at}
                            onLongPress={
                              !queued ? () => openMessage(item) : undefined
                            }
                          />
                        )}
                        <Pressable
                          accessible={!search.active}
                          accessibilityRole={
                            !search.active && !queued && !item.deleted_at
                              ? "button"
                              : undefined
                          }
                          accessibilityLabel={
                            !queued
                              ? item.deleted_at
                                ? "Message deleted"
                                : `Message actions: ${item.body || "Photo"}`
                              : undefined
                          }
                          accessibilityHint={
                            !queued && !item.deleted_at
                              ? "Long press or double tap to open message actions"
                              : undefined
                          }
                          disabled={
                            search.active || queued || !!item.deleted_at
                          }
                          onLongPress={() => {
                            if (!queued) openMessage(item);
                          }}
                          onAccessibilityTap={() => {
                            if (!queued) openMessage(item);
                          }}
                          accessibilityActions={
                            !queued && !item.deleted_at
                              ? [{ name: "activate", label: "Message actions" }]
                              : undefined
                          }
                          onAccessibilityAction={(event) => {
                            if (
                              !queued &&
                              event.nativeEvent.actionName === "activate"
                            )
                              openMessage(item);
                          }}
                        >
                          {(!!item.body || (!queued && !!item.deleted_at)) && (
                            <AppText
                              tone={
                                !queued && item.deleted_at
                                  ? "subtle"
                                  : "default"
                              }
                              style={
                                !queued && item.deleted_at
                                  ? { fontStyle: "italic" }
                                  : undefined
                              }
                            >
                              {!queued && item.deleted_at
                                ? "Message deleted"
                                : search.active && item.body
                                  ? splitSearchText(item.body, search.term).map(
                                      (part, i) => (
                                        <AppText
                                          key={i}
                                          style={
                                            part.match
                                              ? {
                                                  backgroundColor:
                                                    search.page?.selected_id ===
                                                    item.id
                                                      ? c.brand
                                                      : "#f7ffd5",
                                                  color: c.text
                                                }
                                              : undefined
                                          }
                                        >
                                          {part.text}
                                        </AppText>
                                      )
                                    )
                                  : item.body}
                            </AppText>
                          )}
                        </Pressable>
                      </View>
                      {!queued && onReact && (
                        <ChatReactions
                          message={item}
                          actorId={actorId}
                          disabled={!available || search.active || reactionBusy}
                          onChoose={(emoji) => void react(item, emoji)}
                        />
                      )}
                      <View style={styles.meta}>
                        {!queued && item.edited_at && !item.deleted_at && (
                          <AppText variant="caption" tone="subtle">
                            Edited
                          </AppText>
                        )}
                        {mine && (
                          <AppText variant="caption" tone="subtle">
                            {new Date(item.created_at).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit"
                              }
                            )}
                          </AppText>
                        )}
                        {queued && item.photo && (
                          <AppText
                            variant="caption"
                            tone={item.state === "failed" ? "danger" : "subtle"}
                          >
                            {item.state === "sending"
                              ? "Uploading…"
                              : item.state === "failed"
                                ? "Couldn’t send"
                                : online
                                  ? "Waiting to send"
                                  : "Waiting for connection"}
                          </AppText>
                        )}
                        {queued ? (
                          !available ? (
                            <AppText variant="caption" tone="subtle">
                              Not sent
                            </AppText>
                          ) : item.state === "sending" ? (
                            <ActivityIndicator
                              size="small"
                              color={c.textSubtle}
                              accessibilityLabel="Sending message"
                            />
                          ) : item.state === "queued" ? (
                            <Clock3
                              size={16}
                              color={c.textSubtle}
                              accessibilityLabel="Waiting to send"
                            />
                          ) : (
                            <AppButton
                              variant="ghost"
                              size="sm"
                              fullWidth={false}
                              icon={RotateCw}
                              accessibilityLabel={`Retry message: ${item.body}`}
                              onPress={() => onRetry(item)}
                            >
                              Retry
                            </AppButton>
                          )
                        ) : mine && !item.deleted_at ? (
                          <ReceiptIcon
                            size={16}
                            color={seen ? c.accent : c.textSubtle}
                            accessibilityLabel={
                              seen
                                ? "Read by recipient"
                                : receipt === "delivered"
                                  ? "Delivered to recipient"
                                  : "Message sent"
                            }
                          />
                        ) : null}
                      </View>
                      {queued && available && item.state === "queued" && (
                        <AppText variant="caption" tone="subtle">
                          Waiting to send. We’ll retry automatically.
                        </AppText>
                      )}
                      {queued && item.state !== "sending" && onDiscard && (
                        <AppButton
                          variant="ghost"
                          size="sm"
                          fullWidth={false}
                          icon={Trash}
                          accessibilityLabel={`Remove waiting message: ${item.body}`}
                          onPress={() =>
                            Alert.alert(
                              "Remove waiting message?",
                              "This stops further attempts to send. If it already went through, it will remain in the conversation.",
                              [
                                { text: "Keep message", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: () => onDiscard(item)
                                }
                              ]
                            )
                          }
                        >
                          Remove
                        </AppButton>
                      )}
                      {queued && !available && (
                        <AppText variant="caption" tone="subtle">
                          Messaging unavailable. This message hasn’t been sent.
                        </AppText>
                      )}
                      {queued && available && item.state === "failed" && (
                        <AppText
                          variant="caption"
                          tone="danger"
                          accessibilityLiveRegion="polite"
                        >
                          Couldn’t send. Tap Retry to try again.
                        </AppText>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
        {!search.active && latest.away && !loading && !selected && (
          <ChatLatestButton count={latest.count} onPress={jumpToLatest} />
        )}
      </View>
      {search.active && (
        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, sp[3]) }
          ]}
        >
          <ChatSearchNavigation search={search} />
        </View>
      )}
      <View
        style={[
          styles.composer,
          (search.active || !available) && { display: "none" },
          { paddingBottom: Math.max(insets.bottom, sp[3]) }
        ]}
      >
        <ChatComposer
          clearDraftVersion={photoSentVersion}
          pickingPhoto={photoComposer.picking}
          onPickPhoto={
            onPhotoSend
              ? (caption) => void photoComposer.pick(caption)
              : undefined
          }
          reply={reply}
          replyAuthor={reply ? quoteAuthor(reply) : name}
          onCancelReply={onCancelReply}
          sendDisabled={
            !editing &&
            (replyLoading ||
              (!!reply && (!reply.available || !!reply.deleted_at)))
          }
          initialDraft={initialDraft}
          draftReady={draftReady}
          onDraftChange={onDraftChange}
          editing={editing}
          saving={busy}
          editError={editError}
          onCancelEdit={() => {
            setEditing(null);
            setEditError(null);
          }}
          onSaveEdit={(body) => void saveEdit(body)}
          onTypingChange={onTypingChange}
          onSend={async (body) => {
            await onSend(body, reply?.id);
            jumpToLatest();
          }}
        />
      </View>
      {!search.active && !available && (
        <View
          style={[
            styles.composer,
            { paddingBottom: Math.max(insets.bottom, sp[3]) }
          ]}
        >
          <ChatBlockNotice
            own={!!summary.blocked_by_me}
            name={summary.other_participant.first_name || name}
            onUnblock={onUnblock}
          />
        </View>
      )}
      {photoComposer.error && (
        <AppText
          variant="caption"
          tone="danger"
          style={{ paddingHorizontal: sp[4] }}
        >
          {photoComposer.error}
        </AppText>
      )}
      {photoComposer.selected && onPhotoSend && (
        <ChatPhotoPreview
          photo={photoComposer.selected.photo}
          caption={photoComposer.selected.caption}
          onClose={photoComposer.cancel}
          disabled={!available}
          onSend={async (body) => {
            await onPhotoSend(body, photoComposer.selected!.photo, reply?.id);
            photoComposer.clear();
            setPhotoSentVersion((v) => v + 1);
            jumpToLatest();
          }}
        />
      )}
      {selected && actionTarget && anchor && (
        <ChatMessageMenu
          message={actionTarget}
          anchor={anchor}
          mine={selected.sender_id === actorId}
          actorId={actorId}
          reacting={reactionBusy}
          onReact={
            onReact && available
              ? (emoji) => void react(actionTarget, emoji, true)
              : undefined
          }
          readSequence={summary.other_read_sequence}
          onClose={() => {
            if (!busy && !reactionBusy) closeMenu();
          }}
          error={actionError}
          actions={
            actionTarget?.deleted_at
              ? []
              : [
                  ...(onReply && available
                    ? [
                        {
                          label: "Reply",
                          icon: Reply,
                          onPress: () => {
                            if (busy || reactionBusy) return;
                            setBusy(true);
                            void Promise.resolve(onReply(actionTarget))
                              .then(() => {
                                setEditing(null);
                                closeMenu();
                              })
                              .catch(() =>
                                setActionError(
                                  "Couldn’t save your reply. Try again."
                                )
                              )
                              .finally(() => setBusy(false));
                          }
                        }
                      ]
                    : []),
                  {
                    label: "Copy",
                    icon: Copy,
                    onPress: () => {
                      if (!actionTarget?.body) {
                        closeMenu();
                        return;
                      }
                      void copyChatText(actionTarget.body)
                        .then(() => {
                          closeMenu();
                          setNotice("Message copied");
                        })
                        .catch(() =>
                          setActionError(
                            "Couldn’t copy this message. Try again."
                          )
                        );
                    }
                  },
                  ...(selected.sender_id === actorId
                    ? [
                        ...(onEdit &&
                        available &&
                        !!actionTarget?.body &&
                        !actionTarget.attachments?.length
                          ? [
                              {
                                label: "Edit",
                                icon: Pencil,
                                onPress: () => {
                                  if (
                                    actionTarget &&
                                    !actionTarget.deleted_at
                                  ) {
                                    setEditing(actionTarget);
                                    setEditError(null);
                                  }
                                  closeMenu();
                                }
                              }
                            ]
                          : []),
                        ...(onDelete
                          ? [
                              {
                                label: "Delete message",
                                icon: Trash2,
                                danger: true,
                                onPress: () => setConfirmDelete(true)
                              }
                            ]
                          : [])
                      ]
                    : [])
                ]
          }
          confirmation={
            confirmDelete ? (
              <ChatActionSheet
                embedded
                title="Delete message?"
                preview={actionTarget.body}
                onClose={closeMenu}
                busy={busy}
                error={actionError}
                confirmation={{
                  description:
                    "This removes the text for both people and leaves a Message deleted placeholder. This can’t be undone.",
                  label: "Delete message",
                  onConfirm: () => void remove()
                }}
              />
            ) : undefined
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    paddingHorizontal: sp[3],
    paddingVertical: sp[3]
  },
  context: {
    alignSelf: "center",
    maxWidth: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 18,
    paddingVertical: sp[2],
    paddingHorizontal: sp[3],
    marginBottom: sp[3]
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  notice: { paddingHorizontal: sp[5], paddingBottom: sp[3] },
  placeholder: { flex: 1, padding: sp[5] },
  messages: { padding: sp[5], gap: sp[4] },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: sp[2],
    maxWidth: "100%"
  },
  outgoingRow: { justifyContent: "flex-end" },
  message: { maxWidth: "85%", flexShrink: 1, gap: sp[1] },
  sender: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: sp[2],
    paddingHorizontal: sp[1],
    marginBottom: sp[1]
  },
  senderName: { ...getSansFontStyle("700"), flexShrink: 1 },
  outgoing: { alignSelf: "flex-end", alignItems: "flex-end" },
  incoming: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: {
    padding: sp[3],
    gap: sp[2],
    borderRadius: 20,
    borderTopLeftRadius: 4,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle
  },
  mine: {
    backgroundColor: c.surfaceRaised,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4
  },
  meta: { flexDirection: "row", alignItems: "center", gap: sp[2] },
  composer: {
    padding: sp[4],
    borderTopWidth: 1,
    borderTopColor: c.borderSubtle,
    backgroundColor: c.surface
  }
});
