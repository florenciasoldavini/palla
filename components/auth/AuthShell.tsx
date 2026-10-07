import {
  AppCard,
  AppHeading,
  AppLink,
  AppText,
  Screen
} from "@/components/atoms";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import {
  atomControlHeights,
  atomControlRadius,
  atomLayout,
  atomPalette,
  atomSpacing
} from "@/components/atoms/theme";
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
  primary: atomPalette.brand,
  inversePrimary: atomPalette.accentHover,
  onPrimary: atomPalette.accentText
} as const;

export const authCardMaxWidth = Platform.select({
  default: atomLayout.maxWidthFormNative,
  web: 440
});

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
        paddingTop: atomSpacing[2]
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
  panelTag = "Member access"
}: {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  hidePanelHeader?: boolean;
  panelTag?: string;
  title: string;
}) {
  return (
    <Screen
      keyboardSafe
      contentContainerStyle={{ paddingBottom: atomSpacing[8] }}
    >
      <View
        style={{
          alignSelf: "center",
          gap: atomSpacing[8],
          maxWidth: authCardMaxWidth,
          width: "100%"
        }}
      >
        <PallaWordmark compact />
        <View style={{ gap: atomSpacing[3] }}>
          {!hidePanelHeader ? (
            <AppText tone="accent" variant="label">
              {panelTag}
            </AppText>
          ) : null}
          {eyebrow ? (
            <AppText tone="accent" variant="label">
              {eyebrow}
            </AppText>
          ) : null}
          <AppHeading variant="title">{title}</AppHeading>
          <AppText tone="muted">{description}</AppText>
        </View>
        <View>{children}</View>
      </View>
    </Screen>
  );
}

export const authPalette = palette;
export const authCardRadius = atomControlRadius;
export const authControlHeight = atomControlHeights.lg;
export const authControlRadius = atomControlRadius;
export const authFormStackGap = atomSpacing[4];
export const authFormControlSize = Platform.select({
  default: "lg",
  web: "sm"
}) as "sm" | "lg";
export const authFieldSize = "lg" as const;
export const authSocialButtonSize = "lg" as const;
