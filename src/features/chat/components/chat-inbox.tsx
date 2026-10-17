import { matchesInboxFilter, type InboxFilter } from "../inbox-domain";
import { getSansFontStyle } from "@/theme/fonts";
import { useIsFocused } from "@react-navigation/native";
import { useChatPresence } from "../hooks/use-chat-presence";
import { ChatParticipantAvatar } from "./chat-participant-avatar";
import { categoryLabels } from "@/features/profile/playing-category";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonBlock,
  TextField
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { ArrowLeft, MessageSquare, Search, Pin } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  FlatList,
  Pressable,
  StyleSheet,
  ScrollView,
  View,
  type ViewToken
} from "react-native";
import {
  isConversationUnread,
  chatMessagePreview,
  type ChatAction,
  type ConversationSummary
} from "../domain";
import type { ChatReportInput, ChatReportResult } from "../report-domain";
import { ChatConversationMenu } from "./chat-conversation-menu";
import { participantName } from "./chat-thread";
import type { MessageAnchor } from "./chat-message-menu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export function ChatInbox({
  conversations,
  actorId,
  onOpen,
  onChatAction,
  onReport,
  onBack,
  loading = false,
  error,
  onReload,
  preview = false,
  previewOnlineIds = [],
  refreshing = false,
  filters,
  counts,
  hasMore = false,
  loadingMore = false,
  loadMoreError = false,
  onLoadMore
}: {
  filters?: {
    search: string;
    unread: boolean;
    category?: InboxFilter;
    onCategory?: (value: InboxFilter) => void;
    onSearch: (value: string) => void;
    onUnread: (value: boolean) => void;
  };
  counts?: {
    all: number;
    unread: number;
    total_unread: number;
    upcoming?: number;
    past?: number;
  };
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  onLoadMore?: () => Promise<unknown>;
  preview?: boolean;
  previewOnlineIds?: string[];
  conversations: ConversationSummary[];
  actorId: string;
  onOpen: (id: string) => void;
  onChatAction?: (id: string, action: ChatAction) => Promise<void>;
  onReport?: (input: ChatReportInput) => Promise<ChatReportResult>;
  onBack?: () => void;
  loading?: boolean;
  error?: string | null;
  onReload: () => void;
  refreshing?: boolean;
}) {
  const focused = useIsFocused();
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const viewability = useRef({ itemVisiblePercentThreshold: 20 }).current;
  const onVisible = useRef(
    ({
      viewableItems
    }: {
      viewableItems: ViewToken<ConversationSummary>[];
    }) => {
      const ids = new Set(
        viewableItems
          .filter((v) => v.isViewable)
          .map((v) => v.item.conversation.id)
      );
      setVisible((previous) =>
        previous.size === ids.size && [...ids].every((id) => previous.has(id))
          ? previous
          : ids
      );
    }
  ).current;
  const [menu, setMenu] = useState<{
    summary: ConversationSummary;
    anchor: MessageAnchor;
  } | null>(null);
  const [localSearch, setSearch] = useState("");
  const search = filters?.search ?? localSearch;
  const [localFilter, setFilter] = useState<InboxFilter>("all");
  const filter =
    filters?.category ??
    (filters ? (filters.unread ? "unread" : "all") : localFilter);
  const unread = filter === "unread";
  const [pressedFilter, setPressedFilter] = useState<InboxFilter | null>(null);
  const term = search.trim().toLocaleLowerCase();
  const matching = filters
    ? conversations
    : conversations.filter(
        (row) =>
          !term ||
          `${participantName(row)} ${row.last_message?.body ?? ""}`
            .toLocaleLowerCase()
            .includes(term)
      );
  const unreadCount =
    counts?.unread ??
    matching.filter((row) => isConversationUnread(row)).length;
  const rows = !filters
    ? matching.filter((row) => matchesInboxFilter(row, filter))
    : matching;
  const showCounts = !loading && !(error && !conversations.length);
  const list = useRef<FlatList<ConversationSummary>>(null);
  const loadingPage = useRef(false);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search, filter]);
  const loadMore = async (retry = false) => {
    if (
      !hasMore ||
      !onLoadMore ||
      loading ||
      loadingMore ||
      loadingPage.current ||
      (loadMoreError && !retry)
    )
      return;
    loadingPage.current = true;
    try {
      await onLoadMore();
    } catch {
      /* Query owns recovery state. */
    } finally {
      loadingPage.current = false;
    }
  };
  const header = (
    <View style={{ gap: sp[5] }}>
      {onBack && (
        <AppButton
          variant="ghost"
          layout="icon"
          fullWidth={false}
          icon={ArrowLeft}
          accessibilityLabel="Back from messages"
          onPress={onBack}
        />
      )}
      <AppHeading variant="title">Messages</AppHeading>
      {preview && (
        <AppText variant="caption" tone="subtle">
          Design preview · No account changes
        </AppText>
      )}
      <TextField
        leftIcon={Search}
        placeholder="Search conversations"
        accessibilityLabel="Search conversations"
        value={search}
        onChangeText={(value) =>
          filters ? filters.onSearch(value) : setSearch(value)
        }
        maxLength={200}
        returnKeyType="search"
      />
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {(["all", "unread", "upcoming", "past"] as const).map((value) => {
          const selected = filter === value;
          const label = {
            all: "All",
            unread: "Unread",
            upcoming: "Upcoming",
            past: "Past"
          }[value];
          const count =
            value === "unread"
              ? unreadCount
              : value === "all"
                ? (counts?.all ?? matching.length)
                : (counts?.[value] ??
                  matching.filter((row) => matchesInboxFilter(row, value))
                    .length);
          return (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityLabel={`${label}${showCounts ? `, ${count} ${count === 1 ? "conversation" : "conversations"}` : ""}`}
              accessibilityState={{ selected }}
              onPress={() =>
                filters
                  ? filters.onCategory
                    ? filters.onCategory(value)
                    : filters.onUnread(value === "unread")
                  : setFilter(value)
              }
              onPressIn={() => setPressedFilter(value)}
              onPressOut={() => setPressedFilter(null)}
              style={[
                styles.filter,
                selected && styles.filterSelected,
                pressedFilter === value && {
                  backgroundColor: selected
                    ? c.surfaceInversePressed
                    : c.surfaceStrong
                }
              ]}
            >
              <AppText
                variant="label"
                style={{ color: selected ? c.textInverse : c.textSubtle }}
              >
                {label}
              </AppText>
              {showCounts && (
                <View
                  style={[
                    styles.filterCount,
                    selected && styles.filterCountSelected
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{ color: selected ? c.text : c.textSubtle }}
                  >
                    {count > 99 ? "99+" : count}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
  return (
    <Screen
      scrollable={false}
      contentStyle={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 0 }}
    >
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: sp[12] }}
        data={loading ? [] : rows}
        keyExtractor={(row) => row.conversation.id}
        onViewableItemsChanged={onVisible}
        viewabilityConfig={viewability}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: sp[5], paddingBottom: sp[5] }}>
            {header}
            {error && conversations.length > 0 && (
              <ErrorState
                variant="inline"
                title="Couldn’t refresh messages"
                description="Your last loaded conversations are shown below."
                onRetry={onReload}
                retrying={refreshing}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonBlock height={240} />
          ) : error ? (
            <ErrorState
              title="Messages couldn’t load"
              onRetry={onReload}
              retrying={refreshing}
            />
          ) : (
            <EmptyState
              contained
              icon={MessageSquare}
              title={
                term
                  ? "No conversations found"
                  : unread
                    ? "No unread messages"
                    : filter === "upcoming"
                      ? "No upcoming session chats"
                      : filter === "past"
                        ? "No past session chats"
                        : "No messages yet"
              }
              description={
                term
                  ? "Try another name or message."
                  : unread
                    ? "You’re up to date with your conversations."
                    : filter === "upcoming"
                      ? "Chats with people in your upcoming sessions will appear here."
                      : filter === "past"
                        ? "Chats with ended shared sessions and no upcoming session together will appear here."
                        : "Your conversations with players and organizers will appear here."
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: sp[4], alignItems: "center", gap: sp[2] }}>
              <ActivityIndicator
                color={c.accent}
                accessibilityLabel="Loading more conversations"
              />
              <AppText variant="caption" tone="subtle">
                Loading more conversations…
              </AppText>
            </View>
          ) : loadMoreError ? (
            <View style={{ padding: sp[4], alignItems: "center", gap: sp[2] }}>
              <AppText variant="caption" tone="subtle">
                More conversations couldn’t load.
              </AppText>
              <AppButton
                variant="ghost"
                size="sm"
                onPress={() => void loadMore(true)}
              >
                Retry conversations
              </AppButton>
            </View>
          ) : null
        }
        renderItem={({ item: row }) => (
          <ConversationRow
            summary={row}
            actorId={actorId}
            presenceEnabled={
              !preview && focused && visible.has(row.conversation.id)
            }
            previewOnline={
              preview && previewOnlineIds.includes(row.other_participant.id)
            }
            onPress={() => onOpen(row.conversation.id)}
            onActions={
              onChatAction
                ? (anchor) => setMenu({ summary: row, anchor })
                : undefined
            }
          />
        )}
      />
      {menu && onChatAction && (
        <ChatConversationMenu
          summary={
            conversations.find(
              (row) => row.conversation.id === menu.summary.conversation.id
            ) ?? menu.summary
          }
          onReport={onReport}
          anchor={menu.anchor}
          onAction={(action) =>
            onChatAction(menu.summary.conversation.id, action)
          }
          onClose={() => setMenu(null)}
        />
      )}
    </Screen>
  );
}
function ConversationRow({
  summary,
  actorId,
  presenceEnabled,
  previewOnline,
  onPress,
  onActions
}: {
  summary: ConversationSummary;
  actorId: string;
  presenceEnabled: boolean;
  previewOnline: boolean;
  onPress: () => void;
  onActions?: (anchor: MessageAnchor) => void;
}) {
  const liveOnline = useChatPresence(
    summary.other_participant.id,
    false,
    presenceEnabled && summary.messaging_available !== false
  );
  const online =
    summary.messaging_available !== false && (previewOnline || liveOnline);
  const category = summary.other_participant.playing_category;
  const tag =
    summary.other_role === "organizer"
      ? "Host"
      : category
        ? categoryLabels[category]
        : null;
  const [pressed, setPressed] = useState(false);
  const rowRef = useRef<View>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();
  useEffect(() => () => clearTimeout(timer.current), []);
  const openActions = () => {
    if (!onActions) return;
    const measure = () =>
      rowRef.current?.measureInWindow((x, y, width, height) => {
        if (width && height)
          onActions({
            x,
            y: y + (Platform.OS === "android" ? insets.top : 0),
            width,
            height
          });
      });
    clearTimeout(timer.current);
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      timer.current = setTimeout(measure, 350);
    } else measure();
  };
  const name = participantName(summary);
  const latest = summary.last_message;
  const elapsed = latest
    ? Math.max(0, Date.now() - new Date(latest.created_at).getTime())
    : 0;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const time = !latest
    ? ""
    : minutes < 1
      ? "Now"
      : minutes < 60
        ? `${minutes}m ago`
        : hours < 24
          ? `${hours}h ago`
          : days < 7
            ? `${days}d ago`
            : new Date(latest.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short"
              });
  return (
    <View
      cssInterop={false}
      ref={rowRef}
      collapsable={false}
      style={[styles.row, pressed && { backgroundColor: c.surfaceRaised }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${name}${tag ? `, ${summary.other_role === "organizer" ? "Host" : `category ${tag}`}` : ""}${online ? ", online" : ""}${summary.unread_count ? `, ${summary.unread_count} unread messages` : summary.marked_unread ? ", marked as unread" : ""}`}
        onPress={onPress}
        onLongPress={openActions}
        accessibilityHint={
          onActions ? "Long press for conversation actions" : undefined
        }
        accessibilityActions={
          onActions
            ? [{ name: "showActions", label: "Conversation actions" }]
            : undefined
        }
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "showActions") openActions();
        }}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: sp[3]
        }}
      >
        <ChatParticipantAvatar
          summary={summary}
          size={52}
          online={online}
          showStatus={summary.messaging_available !== false}
          statusBackground={pressed ? c.surfaceRaised : c.surface}
        />
        <View style={{ flex: 1, gap: sp[2] }}>
          <View style={[styles.line, { alignItems: "flex-start" }]}>
            <View style={styles.identityLine}>
              <AppText variant="body" numberOfLines={1} style={styles.name}>
                {name}
              </AppText>
              {tag && (
                <View style={styles.roleTag}>
                  <AppText variant="caption" style={getSansFontStyle("700")}>
                    {tag}
                  </AppText>
                </View>
              )}
            </View>
            {summary.pinned_at && (
              <Pin
                size={14}
                color={c.textSubtle}
                accessibilityLabel="Pinned chat"
              />
            )}
            <AppText variant="caption" tone="subtle">
              {time}
            </AppText>
          </View>
          <View style={styles.line}>
            <AppText
              variant="body"
              tone={isConversationUnread(summary) ? "default" : "subtle"}
              numberOfLines={1}
              style={[
                { flex: 1 },
                isConversationUnread(summary) && getSansFontStyle("600")
              ]}
            >
              {summary.blocked_by_me
                ? "You blocked this person"
                : summary.messaging_available === false
                  ? "Messaging unavailable"
                  : latest
                    ? `${latest.sender_id === actorId ? "You: " : ""}${chatMessagePreview(latest)}`
                    : "Start the conversation"}
            </AppText>
            {summary.unread_count > 0 && (
              <View style={styles.badge}>
                <AppText variant="caption">
                  {summary.unread_count > 99 ? "99+" : summary.unread_count}
                </AppText>
              </View>
            )}
          </View>
        </View>
        {summary.marked_unread && !summary.unread_count && (
          <View
            style={styles.unreadDot}
            accessibilityLabel="Marked as unread"
          />
        )}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.brand
  },
  filters: { flexDirection: "row", gap: sp[2], paddingVertical: sp[1] },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    minHeight: 48,
    paddingHorizontal: sp[4],
    paddingVertical: sp[2],
    borderRadius: 999,
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.borderSubtle
  },
  filterSelected: { backgroundColor: c.text, borderColor: c.text },
  filterCount: {
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: sp[1],
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceStrong
  },
  filterCountSelected: { backgroundColor: c.brand },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: sp[4],
    minHeight: 104,
    marginBottom: sp[3],
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 24
  },
  line: { flexDirection: "row", alignItems: "center", gap: sp[2] },
  identityLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: sp[2],
    rowGap: sp[1]
  },
  name: { ...getSansFontStyle("700"), flexShrink: 1 },
  roleTag: {
    backgroundColor: c.surfaceStrong,
    borderRadius: 4,
    paddingHorizontal: sp[1],
    paddingVertical: 1
  },
  badge: {
    minWidth: 24,
    minHeight: 24,
    paddingHorizontal: sp[1],
    borderRadius: 12,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center"
  }
});
