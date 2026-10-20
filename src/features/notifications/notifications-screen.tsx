import { CancellationSheet } from "@/features/cancellations/components/cancellation-sheet";
import { AnnouncementSheet } from "@/features/announcements/components/announcement-sheet";
import { useContext, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import { useAppToast } from "@/components/atoms";
import { ReviewExpiredSheet } from "@/features/reviews/components/review-expired-sheet";
import { isExpiredReviewInvitation, type InboxItem } from "./inbox-domain";
import { ReviewSheet } from "@/features/reviews/components/review-sheet";
import { NotificationInboxView } from "./components/notification-inbox-view";
import { useNotificationInbox } from "./hooks/use-notifications";
import {
  loadNotificationTarget,
  markNotificationsRead
} from "./services/inbox.service";
export default function NotificationsScreen() {
  const { mode: rawMode, notificationId } = useLocalSearchParams<{
    mode?: string;
    notificationId?: string;
  }>();
  const { user } = useContext(AuthContext),
    router = useRouter(),
    { show } = useAppToast();
  const mode =
    rawMode === "organizer" && user?.organizer_status === "active"
      ? "organizer"
      : "player";
  const [cancellation, setCancellation] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [unread, setUnread] = useState(false),
    [registration, setRegistration] = useState<string | null>(null),
    [expiredInvitation, setExpiredInvitation] = useState<InboxItem | null>(
      null
    );
  const { query, read } = useNotificationInbox(mode, unread);
  const refetch = query.refetch;
  const client = useQueryClient();
  useEffect(() => {
    if (!notificationId || !user?.id) return;
    let alive = true;
    void loadNotificationTarget(notificationId)
      .then((target) => {
        if (!alive) return;
        if (target.mode !== mode) {
          router.setParams({ mode: target.mode });
          return;
        }
        setExpiredInvitation(null);
        setCancellation(target.cancellation_id ?? null);
        setAnnouncement(target.announcement_id ?? null);
        setRegistration(
          target.announcement_id || target.cancellation_id
            ? null
            : target.registration_id
        );
        void markNotificationsRead(mode, target.id)
          .then(() => {
            void refetch();
            void client.invalidateQueries({
              queryKey: ["notification-count", user?.id]
            });
          })
          .catch(() =>
            show({
              title: "Couldn’t mark notification as read",
              description: "Refresh and try again.",
              tone: "error"
            })
          );
      })
      .catch(() => {
        if (alive)
          show({
            title: "Notification unavailable",
            description:
              "It may no longer be available. Refresh your notifications and try again.",
            tone: "error"
          });
      });
    return () => {
      alive = false;
    };
  }, [notificationId, mode, user?.id, router, show, refetch, client]);
  const items = query.data?.pages.flat() ?? [];
  const failedRead = () =>
    show({
      title: "Couldn’t mark notifications as read",
      description: "Check your connection and try again.",
      tone: "error"
    });
  return (
    <>
      <NotificationInboxView
        mode={mode}
        items={items}
        loading={query.isPending}
        error={query.isError && !query.data}
        unread={unread}
        onFilter={setUnread}
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace(
                mode === "organizer" ? "/organizer-profile" : "/profile"
              )
        }
        onOpen={(item) => {
          setCancellation(null);
          setAnnouncement(null);
          setRegistration(null);
          setExpiredInvitation(null);
          if (item.cancellation_id) setCancellation(item.cancellation_id);
          else if (item.announcement_id) setAnnouncement(item.announcement_id);
          else if (isExpiredReviewInvitation(item)) setExpiredInvitation(item);
          else setRegistration(item.registration_id);
          if (!item.read_at) read.mutate(item.id, { onError: failedRead });
        }}
        onRefresh={() => {
          void query.refetch();
        }}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onMore={() => {
          if (
            query.hasNextPage &&
            !query.isFetchingNextPage &&
            !query.isFetchNextPageError
          )
            void query.fetchNextPage();
        }}
        more={query.isFetchingNextPage}
        moreError={query.isFetchNextPageError}
        onRetryMore={() => {
          void query.fetchNextPage();
        }}
      />
      {cancellation && (
        <CancellationSheet
          key={cancellation}
          id={cancellation}
          onClose={() => {
            setCancellation(null);
            if (notificationId) router.setParams({ notificationId: "" });
          }}
        />
      )}
      {announcement && (
        <AnnouncementSheet
          key={announcement}
          id={announcement}
          onClose={() => {
            setAnnouncement(null);
            if (notificationId) router.setParams({ notificationId: "" });
          }}
        />
      )}
      {expiredInvitation && (
        <ReviewExpiredSheet
          sessionTitle={expiredInvitation.session_title}
          deadline={expiredInvitation.deadline}
          onClose={() => setExpiredInvitation(null)}
        />
      )}
      {registration && (
        <ReviewSheet
          key={registration}
          registration={registration}
          onClose={() => {
            setRegistration(null);
            if (notificationId) router.setParams({ notificationId: "" });
          }}
        />
      )}
    </>
  );
}
