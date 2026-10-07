import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  Screen
} from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import {
  BellIcon,
  CalendarIcon,
  PlusIcon,
  UsersIcon
} from "@/components/icons";
import {
  ManagedSessionCard,
  OrganizerStatCard
} from "@/features/organizer/components";
import { Pressable, View } from "react-native";

const courtImage =
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80";

export default function OrganizerDashboardScreen() {
  return (
    <Screen contentContainerStyle={{ paddingBottom: atomSpacing[16] }}>
      <View style={{ gap: atomSpacing[8] }}>
        <View style={{ gap: atomSpacing[6] }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <AppHeading variant="card">Palla</AppHeading>
            <Pressable
              accessibilityLabel="Notifications"
              style={{
                alignItems: "center",
                backgroundColor: atomPalette.surfaceLow,
                borderRadius: atomRadii.full,
                height: 40,
                justifyContent: "center",
                width: 40
              }}
            >
              <BellIcon color={atomPalette.text} size="sm" />
            </Pressable>
          </View>
          <View style={{ gap: atomSpacing[2] }}>
            <AppText tone="accent" variant="label">
              Organizer dashboard
            </AppText>
            <AppHeading variant="hero">Manage your courts</AppHeading>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: atomSpacing[3] }}>
          <OrganizerStatCard
            icon={UsersIcon}
            label="Active players"
            value="0"
          />
          <OrganizerStatCard
            icon={CalendarIcon}
            label="Sessions today"
            value="0"
          />
        </View>

        <AppCard
          style={{
            backgroundColor: atomPalette.brand,
            borderColor: atomPalette.brand,
            gap: atomSpacing[4]
          }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <AppText style={{ color: atomPalette.brandText }} variant="bodySm">
              Quick start
            </AppText>
            <PlusIcon color={atomPalette.brandText} size="sm" />
          </View>
          <AppHeading style={{ color: atomPalette.brandText }} variant="card">
            Create session
          </AppHeading>
        </AppCard>

        <View style={{ gap: atomSpacing[4] }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <AppHeading variant="section">Your sessions</AppHeading>
            <AppText tone="accent" variant="label">
              Filter
            </AppText>
          </View>

          <ManagedSessionCard
            imageUrl={courtImage}
            level="Advanced · 4.5+"
            schedule="Tuesday, 20:00–21:30"
            title="Main court · Session preview"
          />

          <AppCard
            style={{
              alignItems: "center",
              backgroundColor: atomPalette.surfaceLow,
              borderColor: atomPalette.borderSubtle,
              gap: atomSpacing[3],
              paddingVertical: atomSpacing[8]
            }}
          >
            <AppHeading variant="card">
              Create your first live session
            </AppHeading>
            <AppText
              style={{ textAlign: "center" }}
              tone="muted"
              variant="bodySm"
            >
              The preview above shows how registrations and availability will
              appear.
            </AppText>
            <AppButton
              color="essential"
              fullWidth={false}
              icon={PlusIcon}
              size="md"
            >
              Create session
            </AppButton>
          </AppCard>
        </View>
      </View>
    </Screen>
  );
}
