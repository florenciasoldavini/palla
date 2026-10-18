import { BadgeCheck, CircleHelp, Sprout } from "lucide-react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import { designTokens } from "@/theme/tokens";
import type { User } from "@/types/models/user";
import { categoryLabels } from "../playing-category";
import {
  handLabels,
  playerCategoryLabel,
  sideLabels,
  sideDetails
} from "../player-traits";

const lilacInk = designTokens.colors.primitive.lilac[800];
type Props = { user: User; isOrganizer: boolean };

/** Visual host marker only; it does not read or set a verification status. */
export function ProfilePhotoBadge({ user, isOrganizer }: Props) {
  const { fontScale } = useWindowDimensions();
  if (!isOrganizer && user.category_status === "not_playing") return null;
  const category =
    user.category_status === "known" && user.playing_category
      ? categoryLabels[user.playing_category]
      : null;
  const label = isOrganizer
    ? "Session host"
    : `${playerCategoryLabel(user.category_status, user.playing_category)}${category ? ", self-reported" : ""}`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.photoBadge, isOrganizer && styles.hostBadge]}
    >
      {isOrganizer ? (
        <BadgeCheck size={18} color={c.brand} fill={c.text} strokeWidth={2} />
      ) : category ? (
        <AppText
          variant="caption"
          style={[
            styles.category,
            { fontSize: 11 * fontScale, lineHeight: 16 * fontScale }
          ]}
        >
          {category}
        </AppText>
      ) : user.category_status === "beginner" ? (
        <Sprout size={14} color={lilacInk} />
      ) : (
        <CircleHelp size={14} color={lilacInk} />
      )}
    </View>
  );
}

export function ProfileIdentityChip({ user, isOrganizer }: Props) {
  const details = [
    user.preferred_court_side &&
      `${sideLabels[user.preferred_court_side]} (${sideDetails[user.preferred_court_side]})`,
    user.dominant_hand && handLabels[user.dominant_hand]
  ].filter(Boolean);
  const text = isOrganizer
    ? "Session host"
    : user.category_status === "not_playing"
      ? ["Not playing", ...details].join(" · ")
      : details.join(" · ");
  if (!text) return null;
  return (
    <View style={styles.chip}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {isOrganizer ? (
          <BadgeCheck size={18} color={lilacInk} />
        ) : (
          <RacketIcon />
        )}
      </View>
      <AppText variant="bodySm" style={styles.chipText}>
        {text}
      </AppText>
    </View>
  );
}

function RacketIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={lilacInk}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Ellipse cx={15} cy={8.5} rx={6} ry={7} transform="rotate(38 15 8.5)" />
      <Path d="m10 13-2 4-4 5-2-2 4-5 4-2" />
      {[
        [14, 5],
        [17, 7],
        [12, 8],
        [15, 10],
        [18, 10],
        [13, 12]
      ].map(([cx, cy]) => (
        <Circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={0.5}
          fill={lilacInk}
          stroke="none"
        />
      ))}
    </Svg>
  );
}
const styles = StyleSheet.create({
  photoBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 26,
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: c.surface,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2
  },
  hostBadge: { backgroundColor: c.brand },
  category: {
    color: lilacInk,
    fontSize: 11,
    lineHeight: 16,
    ...getSansFontStyle("700")
  },
  chip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceLow
  },
  chipText: { color: lilacInk, flexShrink: 1 }
});
