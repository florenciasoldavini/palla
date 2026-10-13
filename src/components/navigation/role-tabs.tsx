import { PlatformPressable } from "@react-navigation/elements";
import { Tabs, useRouter, type Href } from "expo-router";
import {
  CalendarDays,
  LayoutGrid,
  Search,
  UserRound
} from "lucide-react-native";
import { Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { atomPalette } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import { designTokens } from "@/theme/tokens";
import { NavigationHeader } from "./navigation-header";
import { NavigationChromeContext, RoleModeContext } from "./chrome-context";

export function RoleTabs({
  mode,
  routes,
  notificationsPath = "/notifications"
}: {
  mode: "player" | "organizer";
  routes: { home: string; secondary: string; profile: string };
  notificationsPath?: Href;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const tabs = [
    {
      name: routes.home,
      label: mode === "player" ? "Discover" : "Overview",
      icon: mode === "player" ? Search : LayoutGrid
    },
    {
      name: routes.secondary,
      label: mode === "player" ? "My games" : "Sessions",
      icon: CalendarDays
    },
    { name: routes.profile, label: "Profile", icon: UserRound }
  ];
  return (
    <RoleModeContext.Provider value={mode}>
      <NavigationChromeContext.Provider value={true}>
        <Tabs
          initialRouteName={routes.home}
          backBehavior="history"
          screenOptions={{
            header: () => (
              <NavigationHeader
                onNotifications={() => router.push(notificationsPath)}
              />
            ),
            headerStyle: { height: insets.top + 64 },
            sceneStyle: { backgroundColor: atomPalette.background },
            tabBarActiveTintColor: atomPalette.accent,
            tabBarInactiveTintColor: atomPalette.textMuted,
            tabBarActiveBackgroundColor: designTokens.colors.primitive.volt[50],
            tabBarHideOnKeyboard: true,
            tabBarButton: ({ style, ...props }) => (
              <PlatformPressable
                {...props}
                style={[style, { borderRadius: 12, overflow: "hidden" }]}
              />
            ),
            tabBarStyle: {
              height: Math.max(76, 72 * fontScale) + insets.bottom,
              paddingTop: 6,
              paddingBottom: insets.bottom + 6,
              backgroundColor: atomPalette.surface,
              borderTopColor: atomPalette.borderSubtle,
              borderTopWidth: 1,
              elevation: 0,
              shadowOpacity: 0
            },
            tabBarItemStyle: {
              overflow: "hidden",
              marginHorizontal: 6,
              borderRadius: 12,
              paddingVertical: 4
            },
            tabBarLabelPosition: "below-icon"
          }}
        >
          {tabs.map(({ name, label, icon: Icon }) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title: label,
                tabBarAccessibilityLabel: label,
                tabBarIcon: ({ color }) => <Icon size={24} color={color} />,
                tabBarLabel: ({ color, focused }) => (
                  <Text
                    style={{
                      color,
                      fontSize: 12,
                      lineHeight: 17,
                      ...getSansFontStyle(focused ? "600" : "400")
                    }}
                  >
                    {label}
                  </Text>
                )
              }}
            />
          ))}
        </Tabs>
      </NavigationChromeContext.Provider>
    </RoleModeContext.Provider>
  );
}
