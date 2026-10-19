import { useContext } from "react";
import { useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { useAppToast } from "@/components/atoms";
import {
  useAnnouncements,
  useAnnouncementChat
} from "../hooks/use-announcements";
import { AnnouncementReaderView } from "./announcement-reader";
export function AnnouncementSheet({
  id,
  onClose
}: {
  id: string;
  onClose: () => void;
}) {
  const { query } = useAnnouncements(id, true);
  const { user } = useContext(AuthContext);
  const router = useRouter(),
    toast = useAppToast();
  const context = query.data;
  const message = useAnnouncementChat(context);
  const openChat = () =>
    message.mutate(undefined, {
      onSuccess: (conversation) => {
        onClose();
        router.push({
          pathname: "/messages/[id]",
          params: { id: conversation.id }
        });
      },
      onError: () =>
        toast.show({
          title: "Couldn’t open chat",
          description: "Check your connection and try again.",
          tone: "error"
        })
    });
  return (
    <AnnouncementReaderView
      context={context}
      announcement={context?.announcements[0]}
      loading={query.isPending}
      error={query.isError}
      onRetry={() => void query.refetch()}
      messaging={message.isPending}
      onMessage={
        context && context.organizer_id !== user?.id ? openChat : undefined
      }
      onClose={onClose}
    />
  );
}
