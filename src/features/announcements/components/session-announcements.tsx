import type { Attendee } from "@/features/registrations/domain";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Megaphone, Trash2 } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  ErrorState,
  SkeletonBlock,
  useAppToast
} from "@/components/atoms";
import { useAnnouncements } from "../hooks/use-announcements";
import { AnnouncementComposer } from "./announcement-composer";
import { AnnouncementSheet } from "./announcement-sheet";
export function SessionAnnouncements({
  sessionId,
  recipients = [],
  recipientsLoading = false
}: {
  sessionId: string;
  recipients?: Attendee[];
  recipientsLoading?: boolean;
}) {
  const { query, send, remove } = useAnnouncements(sessionId);
  const toast = useAppToast();
  const [composing, setComposing] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const context = query.data;
  return (
    <View style={{ gap: 12 }}>
      <AppHeading variant="section">Announcements</AppHeading>
      {query.isPending ? (
        <SkeletonBlock height={100} />
      ) : query.isError && !context ? (
        <ErrorState
          title="Couldn’t load announcements"
          onRetry={() => void query.refetch()}
        />
      ) : (
        context && (
          <>
            {context.can_send && (
              <AppButton
                icon={Megaphone}
                iconAfter={false}
                onPress={() => setComposing(true)}
              >
                Message players
              </AppButton>
            )}
            {context.announcements.length === 0 && (
              <AppText variant="bodySm" tone="subtle">
                Session updates you send to confirmed players will appear here.
              </AppText>
            )}
            {context.announcements.map((a) => (
              <AppCard key={a.id} surface="panel" style={{ gap: 8 }}>
                <AppText
                  numberOfLines={3}
                  tone={a.removed_at ? "subtle" : "default"}
                >
                  {a.removed_at ? "This announcement was removed." : a.body}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {new Date(a.created_at).toLocaleString()} · Sent to{" "}
                  {a.recipient_count}{" "}
                  {a.recipient_count === 1 ? "player" : "players"}
                </AppText>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <AppButton
                    variant="ghost"
                    fullWidth={false}
                    size="sm"
                    onPress={() => setSelected(a.id)}
                  >
                    View announcement
                  </AppButton>
                  {!a.removed_at && (
                    <AppButton
                      variant="ghost"
                      color="danger"
                      size="sm"
                      fullWidth={false}
                      icon={Trash2}
                      iconAfter={false}
                      loading={remove.isPending && remove.variables === a.id}
                      isDisabled={remove.isPending}
                      onPress={() =>
                        Alert.alert(
                          "Remove announcement?",
                          "Players will see that it was removed. Push alerts already delivered cannot be recalled.",
                          [
                            { text: "Keep announcement", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () =>
                                remove.mutate(a.id, {
                                  onSuccess: () =>
                                    toast.show({
                                      title: "Announcement removed",
                                      tone: "success"
                                    }),
                                  onError: () =>
                                    toast.show({
                                      title: "Couldn’t remove announcement",
                                      description: "Try again.",
                                      tone: "error"
                                    })
                                })
                            }
                          ]
                        )
                      }
                    >
                      Remove
                    </AppButton>
                  )}
                </View>
              </AppCard>
            ))}
          </>
        )
      )}
      {composing && context && (
        <AnnouncementComposer
          context={context}
          recipients={recipients
            .filter(
              (row) =>
                row.player_id !== context.organizer_id &&
                row.status === "confirmed"
            )
            .slice(0, context.recipient_count)
            .map((row) => ({
              id: row.player_id,
              name:
                [row.player.first_name, row.player.last_name]
                  .filter(Boolean)
                  .join(" ") || "Player",
              imageUrl: row.player.avatar_url
            }))}
          recipientsLoading={recipientsLoading}
          busy={send.isPending}
          onClose={() => setComposing(false)}
          onSend={async (input) => {
            try {
              const result = await send.mutateAsync(input);
              setComposing(false);
              toast.show({
                title: `Sent to ${result.announcements[0].recipient_count} ${result.announcements[0].recipient_count === 1 ? "player" : "players"}`,
                tone: "success"
              });
            } catch (error) {
              void query.refetch();
              toast.show({
                title: "Couldn’t send announcement",
                description:
                  error instanceof Error ? error.message : "Please try again.",
                tone: "error"
              });
            }
          }}
        />
      )}
      {selected && (
        <AnnouncementSheet id={selected} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}
