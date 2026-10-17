import { AppHeading, AppText } from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import { designTokens } from "@/theme/tokens";
import type { UserMode } from "@/features/onboarding/validation";
import { CalendarDays, Users } from "lucide-react-native";
import { Platform, Pressable, View } from "react-native";
import { useState, type KeyboardEvent } from "react";

const choices = [
  {
    mode: "player",
    title: "Player",
    description: "Find sessions and meet people on court.",
    Icon: Users
  },
  {
    mode: "organizer",
    title: "Organizer",
    description: "Host sessions and manage your players.",
    Icon: CalendarDays
  }
] as const;

export function ModeChoice({
  value,
  onChange
}: {
  value: UserMode;
  onChange: (mode: UserMode) => void;
}) {
  const [pressedMode, setPressedMode] = useState<UserMode | null>(null);
  const keyboardProps =
    Platform.OS === "web"
      ? {
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (
              ![
                "ArrowDown",
                "ArrowUp",
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End"
              ].includes(event.key)
            )
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "player"
                : event.key === "End"
                  ? "organizer"
                  : value === "player"
                    ? "organizer"
                    : "player";
            onChange(next);
            const index = next === "player" ? 0 : 1;
            event.currentTarget
              .querySelectorAll<HTMLElement>('[role="radio"]')
              [index]?.focus();
          }
        }
      : {};
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Starting mode"
      style={{ gap: atomSpacing[4] }}
      {...keyboardProps}
    >
      {choices.map(({ mode, title, description, Icon }) => (
        <Pressable
          key={mode}
          accessibilityRole="radio"
          aria-checked={mode === value}
          accessibilityLabel={`${title}. ${description}`}
          accessibilityState={{ checked: mode === value }}
          tabIndex={value === mode ? 0 : -1}
          onPress={() => onChange(mode)}
          onPressIn={() => setPressedMode(mode)}
          onPressOut={() => setPressedMode(null)}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: atomSpacing[5],
            padding: atomSpacing[6],
            minHeight: 144,
            backgroundColor:
              mode === value
                ? designTokens.colors.primitive.volt[50]
                : pressedMode === mode
                  ? atomPalette.surfaceLow
                  : atomPalette.surface,
            borderColor:
              mode === value ? atomPalette.focus : atomPalette.border,
            borderWidth: mode === value ? 2 : 1,
            borderRadius: atomRadii.md
          }}
        >
          <Icon
            size={36}
            strokeWidth={1.6}
            color={mode === value ? atomPalette.accent : atomPalette.textMuted}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View style={{ flex: 1, gap: atomSpacing[2] }}>
            <AppHeading
              variant="card"
              level={2}
              style={{
                ...getSansFontStyle("600"),
                fontSize: designTokens.typeScale.onboardingRole.fontSize,
                lineHeight: designTokens.typeScale.onboardingRole.lineHeight
              }}
            >
              {title}
            </AppHeading>
            <AppText tone="muted">{description}</AppText>
          </View>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: atomRadii.full,
              borderWidth: 2,
              borderColor:
                mode === value ? atomPalette.focus : atomPalette.borderStrong,
              alignItems: "center",
              justifyContent: "center",
              marginTop: atomSpacing[1]
            }}
          >
            {mode === value ? (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: atomRadii.full,
                  backgroundColor: atomPalette.focus
                }}
              />
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
