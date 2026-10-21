import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import { Image } from "expo-image";
import { Plus, UserRound, Users } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import {
  categoryLabel,
  type PublicPlayer,
  type PublicSession
} from "../domain";

function Player({
  player,
  open = false
}: {
  player?: PublicPlayer;
  open?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: c.surfaceLow,
          borderWidth: player ? 2 : 1,
          borderStyle: open ? "dashed" : "solid",
          borderColor: player ? c.accent : c.borderSubtle,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {player?.avatar_url ? (
          <Image
            source={{ uri: player.avatar_url }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
            contentFit="cover"
            accessible={false}
          />
        ) : player ? (
          <AppText variant="label">
            {player.name
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </AppText>
        ) : open ? (
          <Plus color={c.textMuted} size={22} />
        ) : (
          <UserRound color={c.textMuted} size={22} />
        )}
        {player?.category ? (
          <View
            style={{
              position: "absolute",
              right: -4,
              bottom: -3,
              borderRadius: 16,
              paddingHorizontal: 6,
              paddingVertical: 2,
              backgroundColor: c.accent
            }}
          >
            <AppText variant="caption" style={{ color: c.textInverse }}>
              {categoryLabel(player.category)}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="caption" style={{ textAlign: "center" }}>
        {player?.name ?? (open ? "Open" : "Player")}
      </AppText>
    </View>
  );
}
export function PublicSessionPlayers({
  session: s
}: {
  session: PublicSession;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = Math.min(s.capacity, s.confirmed_count);
  const slots = Math.min(s.capacity, 4);
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <AppHeading variant="section">Joined players</AppHeading>
          <AppText variant="bodySm" tone="muted">
            {count} {count === 1 ? "spot" : "spots"} filled ·{" "}
            {Math.max(0, s.capacity - count)} remaining
          </AppText>
        </View>
        {s.players.length > 0 ? (
          <AppButton
            fullWidth={false}
            variant="ghost"
            color="accent"
            size="sm"
            onPress={() => setExpanded(true)}
          >
            Details
          </AppButton>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {Array.from({ length: slots }, (_, i) => (
          <Player key={i} player={s.players[i]} open={i >= count} />
        ))}
      </View>
      {s.confirmed_count > slots ? (
        <AppText variant="bodySm" tone="muted">
          +{s.confirmed_count - slots} more players
        </AppText>
      ) : null}
      {!s.players.length && s.confirmed_count > 0 ? (
        <AppText variant="bodySm" tone="subtle">
          Player profiles are visible when you’re signed in.
        </AppText>
      ) : null}
      {expanded ? (
        <AppBottomSheet
          busy={false}
          title="Joined players"
          onClose={() => setExpanded(false)}
        >
          <View style={{ gap: 16 }}>
            {s.players.map((p, i) => (
              <View
                key={i}
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
              >
                <Users size={20} color={c.accent} />
                <AppText style={{ flex: 1 }}>{p.name}</AppText>
                <AppText variant="bodySm" tone="muted">
                  {p.category ? categoryLabel(p.category) : ""}
                </AppText>
              </View>
            ))}
            {s.confirmed_count > s.players.length ? (
              <AppText tone="muted" variant="bodySm">
                Showing {s.players.length} of {s.confirmed_count} players.
              </AppText>
            ) : null}
          </View>
        </AppBottomSheet>
      ) : null}
    </View>
  );
}
