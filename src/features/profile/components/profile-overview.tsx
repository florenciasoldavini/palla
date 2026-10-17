import { PlayerSpecifications } from "./player-specifications";
import { useState } from "react";
import { Image } from "expo-image";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { ChevronRight, LogOut, Pencil, UserRound } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  FieldMessage,
  NavScreenHeader,
  Screen
} from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { categoryLabels } from "../playing-category";
import { profileMenu, type ProfileMenuId } from "../profile-menu";
import type { User } from "@/types/models/user";

type Props = {
  user: User;
  mode: "player" | "organizer";
  onEdit: () => void;
  onMenu: (id: ProfileMenuId) => void;
  onLogout: () => void;
  loggingOut?: boolean;
  logoutError?: string | null;
  preview?: boolean;
};
export function ProfileOverview({
  user,
  mode,
  onEdit,
  onMenu,
  onLogout,
  loggingOut,
  logoutError,
  preview
}: Props) {
  const { fontScale } = useWindowDimensions();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const isOrganizer = mode === "organizer";
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    "Your profile";
  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((part) => part![0])
    .join("")
    .toUpperCase();
  const category =
    user.category_status === "known" && user.playing_category
      ? categoryLabels[user.playing_category]
      : user.category_status === "beginner"
        ? "Just starting"
        : user.category_status === "not_playing"
          ? null
          : "Category not set";
  return (
    <Screen>
      <View style={styles.page}>
        <NavScreenHeader title="Profile" />
        {preview && (
          <AppText variant="caption" tone="subtle">
            Design preview · No account changes
          </AppText>
        )}
        <AppCard surface="panel" style={styles.summary}>
          <View style={[styles.topRow, fontScale > 1.3 && styles.stacked]}>
            <View style={styles.avatar}>
              {user.avatar && user.avatar !== failedAvatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel="Profile photo"
                  onError={() => setFailedAvatar(user.avatar)}
                />
              ) : initials ? (
                <AppText style={{ fontSize: 28, lineHeight: 36 }}>
                  {initials}
                </AppText>
              ) : (
                <UserRound color={c.textSubtle} size={32} />
              )}
            </View>
            <AppButton
              icon={Pencil}
              iconAfter={false}
              fullWidth={false}
              variant="bordered"
              color="neutral"
              shape="pill"
              size="sm"
              onPress={onEdit}
              style={styles.edit}
            >
              Edit profile
            </AppButton>
          </View>
          <View style={{ gap: sp[2] }}>
            <AppHeading variant="title">{name}</AppHeading>
            <View style={styles.roleRow}>
              <AppText tone="subtle">
                {isOrganizer ? "Organizer" : "Player"}
              </AppText>
              {!isOrganizer && category && (
                <View style={styles.category}>
                  <AppText variant="caption">{category}</AppText>
                </View>
              )}
            </View>
          </View>
          {!!user.bio?.trim() && <AppText tone="subtle">{user.bio}</AppText>}
        </AppCard>
        {!isOrganizer && <PlayerSpecifications user={user} />}
        <AppCard surface="panel" style={styles.menu}>
          <View style={styles.menuHeading}>
            <AppHeading variant="card">Preferences & account</AppHeading>
          </View>
          {profileMenu.map((item) => (
            <MenuRow
              key={item.id}
              title={item.title}
              description={item.description}
              Icon={item.icon}
              onPress={() => onMenu(item.id)}
            />
          ))}
          <MenuRow
            title={loggingOut ? "Logging out…" : "Log out"}
            Icon={LogOut}
            danger
            onPress={onLogout}
            disabled={loggingOut}
          />
        </AppCard>
        {logoutError && <FieldMessage tone="error">{logoutError}</FieldMessage>}
      </View>
    </Screen>
  );
}
function MenuRow({
  title,
  description,
  Icon,
  onPress,
  danger,
  disabled
}: {
  title: string;
  description?: string;
  Icon: typeof LogOut;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.row, pressed && styles.pressed]}
    >
      <View
        style={[styles.icon, danger && styles.dangerIcon]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon
          size={23}
          color={danger ? c.errorText : c.text}
          strokeWidth={1.8}
        />
      </View>
      <View style={styles.rowCopy}>
        <AppText variant="label" tone={danger ? "danger" : "default"}>
          {title}
        </AppText>
        {description && (
          <AppText variant="bodySm" tone="subtle">
            {description}
          </AppText>
        )}
      </View>
      {!danger && (
        <ChevronRight
          size={20}
          color={c.textSubtle}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", gap: sp[5] },
  summary: { gap: sp[5], padding: sp[5] },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: sp[3]
  },
  stacked: { flexDirection: "column" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  edit: { borderColor: c.borderSubtle },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    flexWrap: "wrap"
  },
  category: {
    backgroundColor: c.surfaceRaised,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1],
    borderRadius: 999
  },
  menu: { padding: 0 },
  menuHeading: { padding: sp[5] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    minHeight: 88,
    paddingVertical: sp[4],
    paddingHorizontal: sp[5],
    borderTopWidth: 1,
    borderTopColor: c.borderSubtle
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerIcon: { backgroundColor: c.errorSurface },
  rowCopy: { flex: 1, gap: sp[1] },
  pressed: { backgroundColor: c.surfaceLow }
});
