import {
  AppCard,
  AppHeading,
  AppLink,
  AppText,
  Screen
} from "@/components/atoms";
import {
  atomControlHeights,
  atomControlRadius,
  atomLayout,
  atomPalette,
  atomRadii,
  atomSpacing
} from "@/components/atoms/theme";
import { HStack } from "@/components/ui/hstack";
import type { LinkProps } from "expo-router";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";

const palette = {
  background: atomPalette.background,
  surfaceLowest: atomPalette.surface,
  surfaceLow: atomPalette.surfaceLow,
  surfaceContainer: atomPalette.surfaceRaised,
  onSurface: atomPalette.text,
  onSurfaceVariant: atomPalette.textMuted,
  inverseSurface: atomPalette.text,
  inverseOnSurface: atomPalette.textInverse,
  outline: atomPalette.borderStrong,
  outlineVariant: atomPalette.border,
  primary: atomPalette.accent,
  inversePrimary: atomPalette.accentHover,
  onPrimary: atomPalette.accentText
} as const;

export const authCardMaxWidth = Platform.select({
  default: atomLayout.maxWidthFormNative,
  web: 440
});

function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <AppText tone="muted" variant="eyebrow">
      {children}
    </AppText>
  );
}

export function AuthStatusMessage({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <AppCard
      padding="sm"
      tone="muted"
      style={{
        backgroundColor: authPalette.surfaceLow,
        borderColor: authPalette.outlineVariant
      }}
    >
      <AppText tone={tone === "danger" ? "danger" : "default"} variant="meta">
        {children}
      </AppText>
    </AppCard>
  );
}

export function AuthDivider({ label }: { label: ReactNode }) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: atomSpacing[3]
      }}
    >
      <View
        style={{
          backgroundColor: authPalette.outlineVariant,
          flex: 1,
          height: 1
        }}
      />
      <AppText tone="subtle" variant="meta">
        {label}
      </AppText>
      <View
        style={{
          backgroundColor: authPalette.outlineVariant,
          flex: 1,
          height: 1
        }}
      />
    </View>
  );
}

export function AuthFooterLink({
  actionLabel,
  href,
  prompt
}: {
  actionLabel: ReactNode;
  href: LinkProps["href"];
  prompt: ReactNode;
}) {
  return (
    <View
      style={{
        borderTopColor: authPalette.outlineVariant,
        borderTopWidth: 1,
        marginTop: atomSpacing[2],
        paddingTop: atomSpacing[5]
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: atomSpacing[2],
          justifyContent: "center"
        }}
      >
        <AppText style={{ textAlign: "center" }} tone="muted">
          {prompt}
        </AppText>
        <AppLink href={href}>{actionLabel}</AppLink>
      </View>
    </View>
  );
}

export function AuthShell({
  children,
  eyebrow,
  title,
  description,
  hidePanelHeader = false,
  panelTag = "Access / Palla"
}: {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  hidePanelHeader?: boolean;
  panelTag?: string;
  title: string;
}) {
  return (
    <Screen centered keyboardSafe>
      <View
        style={{
          alignSelf: "center",
          maxWidth: authCardMaxWidth,
          width: "100%"
        }}
      >
        <AppCard
          padding="md"
          style={{
            borderRadius: authCardRadius,
            padding: 0,
            width: "100%"
          }}
        >
          {hidePanelHeader ? null : (
            <View
              style={{
                borderBottomColor: palette.outlineVariant,
                borderBottomWidth: 1,
                paddingHorizontal: atomSpacing[5],
                paddingVertical: atomSpacing[3]
              }}
            >
              <HStack className="items-center justify-between gap-3">
                <MonoLabel>{panelTag}</MonoLabel>
                <AppText tone="subtle" variant="meta">
                  SYSTEM / ENTRY
                </AppText>
              </HStack>
            </View>
          )}
          <View style={{ padding: atomSpacing[5] }}>
            <View style={{ gap: atomSpacing[4] }}>
              {eyebrow ? <MonoLabel>{eyebrow}</MonoLabel> : null}
              <AppHeading variant="title">{title}</AppHeading>
              <AppText tone="muted">{description}</AppText>
              <View
                style={{
                  backgroundColor: palette.primary,
                  height: 2,
                  width: atomSpacing[24]
                }}
              />
              <View>{children}</View>
            </View>
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}

export const authPalette = palette;
export const authCardRadius = atomRadii.xl;
export const authControlHeight = atomControlHeights.lg;
export const authControlRadius = atomControlRadius;
export const authFormStackGap = atomSpacing[6];
export const authFormControlSize = Platform.select({
  default: "lg",
  web: "sm"
}) as "sm" | "lg";
export const authFieldSize = Platform.select({
  default: "lg",
  web: "md"
}) as "md" | "lg";
export const authSocialButtonSize = Platform.select({
  default: "iconLg",
  web: "md"
}) as "md" | "iconLg";
