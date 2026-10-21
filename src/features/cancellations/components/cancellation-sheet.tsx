import { useContext } from "react";
import { useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { useAppToast } from "@/components/atoms";
import {
  useCancellation,
  useCancellationChat
} from "../hooks/use-cancellation";
import { CancellationReader } from "./cancellation-reader";
export function CancellationSheet({
  id,
  onClose
}: {
  id: string;
  onClose: () => void;
}) {
  const { query } = useCancellation(id, true);
  const chat = useCancellationChat(query.data),
    router = useRouter(),
    toast = useAppToast();
  const { user } = useContext(AuthContext);
  return (
    <CancellationReader
      context={query.data}
      loading={query.isPending}
      error={query.isError && !query.data}
      onRetry={() => void query.refetch()}
      onClose={onClose}
      messaging={chat.isPending}
      onMessage={
        query.data && user?.id !== query.data.organizer_id
          ? () =>
              chat.mutate(undefined, {
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
              })
          : undefined
      }
    />
  );
}
