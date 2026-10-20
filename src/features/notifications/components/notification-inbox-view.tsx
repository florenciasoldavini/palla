import { cancellationReasons } from "@/features/cancellations/domain";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View
} from "react-native";
import {
  ArrowLeft,
  Bell,
  CalendarX,
  Check,
  ChevronRight,
  Megaphone,
  Star
} from "lucide-react-native";
import {
  AppBadge,
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  FilterChip,
  FilterChipGroup,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c, atomRadii } from "@/components/atoms/theme";
import {
  isExpiredReviewInvitation,
  type InboxItem,
  type NotificationMode
} from "../inbox-domain";
import { reviewDate } from "@/features/reviews/format";
const today = (date: string) =>
  new Date(date).toLocaleDateString() === new Date().toLocaleDateString();
function ago(date: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 60000)
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
export function NotificationInboxView({
  mode,
  items,
  loading,
  error,
  unread,
  onFilter,
  onBack,
  onOpen,
  onRefresh,
  refreshing,
  onMore,
  more,
  moreError,
  onRetryMore,
  preview = false
}: {
  mode: NotificationMode;
  items: InboxItem[];
  loading: boolean;
  error: boolean;
  unread: boolean;
  onFilter: (value: boolean) => void;
  onBack: () => void;
  onOpen: (item: InboxItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onMore: () => void;
  more: boolean;
  moreError?: boolean;
  onRetryMore?: () => void;
  preview?: boolean;
}) {
  return (
    <Screen scrollable={false} contentStyle={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 16 }}>
        <View style={styles.header}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Notifications
          </AppHeading>
        </View>
        {preview && (
          <AppText variant="caption" tone="subtle">
            Design preview · No account changes
          </AppText>
        )}
        <FilterChipGroup>
          {[false, true].map((value) => (
            <FilterChip
              key={String(value)}
              label={value ? "Unread" : "All"}
              selected={unread === value}
              onPress={() => onFilter(value)}
            />
          ))}
        </FilterChipGroup>
        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonBlock height={112} />
            <SkeletonBlock height={112} />
          </View>
        ) : error ? (
          <ErrorState title="Couldn’t load notifications" onRetry={onRefresh} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={onMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <EmptyState
                icon={Bell}
                title={unread ? "You’re all caught up" : "No notifications yet"}
                description={
                  unread
                    ? "You have no unread notifications."
                    : mode === "player"
                      ? "Session updates and review reminders will appear here."
                      : "New reviews of your sessions will appear here."
                }
              />
            }
            ListFooterComponent={
              more ? (
                <ActivityIndicator color={c.textSubtle} />
              ) : moreError ? (
                <ErrorState title="Couldn’t load more" onRetry={onRetryMore} />
              ) : null
            }
            renderItem={({ item, index }) => {
              const group = today(item.created_at) ? "Today" : "Earlier";
              const showGroup =
                index === 0 ||
                today(items[index - 1].created_at) !== today(item.created_at);
              const cancellation =
                item.notification_type === "session_cancellations";
              const announcement =
                item.notification_type === "session_announcements";
              const reminder = item.notification_type === "review_reminders";
              const expired = isExpiredReviewInvitation(item);
              const reviewed =
                reminder &&
                (item.review_status === "published" ||
                  item.review_status === "hidden");
              const title = cancellation
                ? "Session cancelled"
                : announcement
                  ? `Announcement from ${item.host_name || "your host"}`
                  : reminder
                    ? "How was your session?"
                    : `${item.reviewer_name || "A player"} left a review`;
              return (
                <View style={{ gap: 12 }}>
                  {showGroup && (
                    <AppHeading
                      variant="card"
                      style={{ marginTop: index ? 12 : 4 }}
                    >
                      {group}
                    </AppHeading>
                  )}
                  <Pressable
                    onPress={() => onOpen(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}. ${item.session_title}.${item.read_at ? " Read." : " Unread."}${reviewed ? " Reviewed." : ""}`}
                    accessibilityHint={
                      cancellation
                        ? "Read the cancellation details."
                        : announcement
                          ? "Read the session announcement."
                          : expired
                            ? "Learn about the 14-day review period."
                            : reminder
                              ? "Open your session review."
                              : "Open the received review."
                    }
                    style={styles.row}
                  >
                    <View
                      style={[
                        styles.icon,
                        (reminder || announcement || cancellation) &&
                          styles.reviewIcon
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {cancellation ? (
                        <CalendarX size={25} color={c.textSubtle} />
                      ) : announcement ? (
                        <Megaphone size={25} color={c.textSubtle} />
                      ) : reminder ? (
                        <Star size={25} color={c.textSubtle} />
                      ) : (
                        <AppText variant="label">
                          {item.reviewer_name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("") || "P"}
                        </AppText>
                      )}
                      {!reminder && !announcement && !cancellation && (
                        <View style={styles.reviewBadge}>
                          <Star size={12} color={c.text} fill={c.text} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                      <AppText variant="label">{title}</AppText>
                      <AppText variant="bodySm" tone="subtle">
                        {reminder
                          ? `${item.session_title} with ${item.host_name}.`
                          : item.session_title}
                      </AppText>
                      {cancellation && item.session_starts_at && (
                        <AppText variant="bodySm" tone="subtle">
                          {new Date(item.session_starts_at).toLocaleDateString(
                            undefined,
                            {
                              day: "numeric",
                              month: "short",
                              timeZone: item.session_timezone
                            }
                          )}{" "}
                          ·{" "}
                          {new Date(item.session_starts_at).toLocaleTimeString(
                            undefined,
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                              timeZone: item.session_timezone
                            }
                          )}
                        </AppText>
                      )}
                      {cancellation && item.cancellation_reason_code && (
                        <AppText variant="bodySm" tone="subtle">
                          {cancellationReasons[item.cancellation_reason_code]}
                        </AppText>
                      )}
                      {announcement && (
                        <AppText
                          variant="bodySm"
                          tone="subtle"
                          numberOfLines={2}
                        >
                          {item.announcement_preview}
                        </AppText>
                      )}
                      <AppText variant="caption" tone="subtle">
                        {ago(item.created_at)}
                        {reminder && item.can_review && !reviewed
                          ? ` · Review by ${reviewDate(item.deadline)}`
                          : ""}
                      </AppText>
                      {reminder &&
                        (reviewed ? (
                          <AppBadge tone="essential" icon={Check}>
                            Reviewed
                          </AppBadge>
                        ) : item.review_status === "removed" ? (
                          <AppText variant="caption" tone="subtle">
                            Review removed
                          </AppText>
                        ) : null)}
                    </View>
                    {!item.read_at && <View style={styles.dot} />}
                    <ChevronRight size={18} color={c.textSubtle} />
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: {
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 18
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  reviewIcon: { borderRadius: atomRadii.md },
  reviewBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: atomRadii.full,
    backgroundColor: c.surfaceStrong,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.brand,
    marginTop: 7
  }
});
