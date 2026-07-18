import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  Screen,
  TextField
} from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import {
  BellIcon,
  ClockIcon,
  LevelIcon,
  PlusIcon,
  SearchIcon
} from "@/components/icons";
import { SessionCard, SessionListItem } from "@/features/session/components";
import type { SessionPreview } from "@/features/session/types/session";
import { Pressable, ScrollView, View } from "react-native";

const courtImage =
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80";
const eveningCourtImage =
  "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=900&q=80";

const featuredSessions: SessionPreview[] = [
  {
    club: "MAD4PADEL",
    id: "elite-open",
    imageUrl: eveningCourtImage,
    level: "Level 4.0–5.0",
    location: "Palermo",
    price: "$12.50",
    spotsFilled: 3,
    spotsTotal: 4,
    startsAt: "18:30",
    title: "Elite open match",
    urgency: "Starts in 15m"
  },
  {
    club: "PADEL HOUSE",
    id: "evening-social",
    imageUrl: courtImage,
    level: "Level 2.5–3.5",
    location: "Belgrano",
    price: "$10",
    spotsFilled: 2,
    spotsTotal: 4,
    startsAt: "20:00",
    title: "Evening social"
  }
];

const availableSessions: SessionPreview[] = [
  {
    club: "Serrano Padel",
    id: "indoor-training",
    imageUrl: courtImage,
    level: "Level 3.0",
    location: "Villa Crespo",
    price: "$10",
    spotsFilled: 2,
    spotsTotal: 4,
    startsAt: "18:30",
    title: "Padel indoor training"
  },
  {
    club: "City Padel",
    id: "mixed-doubles",
    imageUrl: eveningCourtImage,
    level: "Level 3.5–4.5",
    location: "Núñez",
    price: "$8",
    spotsFilled: 3,
    spotsTotal: 4,
    startsAt: "21:00",
    title: "Mixed doubles social"
  }
];

function FilterChip({
  active = false,
  icon: Icon,
  label
}: {
  active?: boolean;
  icon: typeof ClockIcon;
  label: string;
}) {
  return (
    <Pressable
      style={{
        alignItems: "center",
        backgroundColor: active ? atomPalette.brand : atomPalette.surfaceLow,
        borderColor: active ? atomPalette.brand : atomPalette.border,
        borderRadius: atomRadii.full,
        borderWidth: 1,
        flexDirection: "row",
        gap: atomSpacing[2],
        minHeight: 36,
        paddingHorizontal: atomSpacing[3]
      }}
    >
      <Icon
        color={active ? atomPalette.brandText : atomPalette.textMuted}
        size="xs"
      />
      <AppText
        style={{ color: active ? atomPalette.brandText : atomPalette.text }}
        variant="bodySm"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <Screen
      contentContainerStyle={{ paddingBottom: atomSpacing[20] }}
      floatingAction={
        <AppButton
          accessibilityLabel="Create a session"
          fullWidth={false}
          icon={PlusIcon}
          layout="icon"
          shape="pill"
          size="iconLg"
        />
      }
    >
      <View style={{ gap: atomSpacing[8] }}>
        <View style={{ gap: atomSpacing[5] }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <View style={{ gap: 2 }}>
              <AppText tone="muted" variant="meta">
                Location
              </AppText>
              <AppHeading variant="card">Buenos Aires, AR</AppHeading>
            </View>
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

          <TextField
            label={null}
            leftIcon={SearchIcon}
            placeholder="Search clubs or sessions"
            rightSlot={
              <AppButton fullWidth={false} size="sm">
                Search
              </AppButton>
            }
            size="md"
          />

          <ScrollView
            contentContainerStyle={{ gap: atomSpacing[2] }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <FilterChip active icon={ClockIcon} label="Today" />
            <FilterChip icon={LevelIcon} label="Level 3.5+" />
            <FilterChip icon={ClockIcon} label="Evening" />
          </ScrollView>
        </View>

        <View style={{ gap: atomSpacing[4] }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <AppHeading variant="section">Starting soon</AppHeading>
            <AppText tone="accent" variant="label">
              See all
            </AppText>
          </View>
          <ScrollView
            contentContainerStyle={{
              gap: atomSpacing[3],
              paddingRight: atomSpacing[4]
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {featuredSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: atomSpacing[4] }}>
          <AppHeading variant="section">Available today</AppHeading>
          <View style={{ gap: atomSpacing[3] }}>
            {availableSessions.map((session) => (
              <SessionListItem key={session.id} session={session} />
            ))}
          </View>
        </View>

        <AppCard
          style={{
            backgroundColor: atomPalette.surfaceLow,
            borderColor: atomPalette.borderSubtle,
            gap: atomSpacing[2]
          }}
        >
          <AppHeading variant="card">Can’t find your level?</AppHeading>
          <AppText tone="muted" variant="bodySm">
            Adjust your filters or create a session and invite your group.
          </AppText>
        </AppCard>
      </View>
    </Screen>
  );
}
