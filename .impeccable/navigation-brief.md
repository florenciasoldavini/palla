# Role navigation proposal

Mode: Operate. Status: navigation approved and implemented; screen content deferred.

User direction: three bottom tabs for each role and a notification bell in the header. Retain Palla's established light-only colors, typography, wordmark, and outline icons.

Mockup: `mocks/role-navigation.png`. Generation prompt and provenance accompany the image. Data in the mockup is illustrative.

| Role      | First tab | Second tab | Third tab |
| --------- | --------- | ---------- | --------- |
| Player    | Discover  | My games   | Profile   |
| Organizer | Overview  | Sessions   | Profile   |

Both headers share a notification bell at the right, without an unread-count badge until real unread data exists. Notifications open a separate screen, not a fourth tab. Profile remains in the same position for both roles. Each tab retains its icon and readable label; the selected tab uses pale lime and olive, not lime text on white.

Discover uses a Search icon as explicitly requested after the mockup. Create session stays in organizer content, not a tab. No mode switch or playing-level selection is introduced in organizer navigation.

The screens show representative home content to contextualize the navigation, not an approved feature specification. Search, filters, session data, registration counts, and attention rows require separate implementation work.

Implementation uses the shared `RoleTabs` Expo Router navigator and `NavigationHeader` under `src/components/navigation/`. Player Discover/My games/Profile and organizer Overview/Sessions/Profile share the same positions and chrome. The header supplies the existing wordmark and a 48-unit notification target; duplicate embedded header elements were removed. Existing production body content is preserved. My games, Sessions, and Notifications currently contain minimal placeholders; their product content remains deferred.

Selected tiles use the existing pale lime `volt[50]` and olive `atomPalette.accent`, with medium (12-unit) rounding on both tab item and native PlatformPressable. The white bar uses `borderSubtle`, a 24-unit outline icon, and Hanken Grotesk labels (12/17, 600 active and 400 inactive). The header is 64 units plus the top safe inset. The bar is `max(76, 72 × fontScale)` plus the bottom inset and hides on keyboard appearance. This static mockup does not establish runtime behavior.

Native verification exercised `/navigation-preview/[role]/home`, a development-only no-write fixture using the same navigator. Both roles passed selection of all three tabs and the notification/Back round trip on iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17 with Expo Go SDK 54. Native captures: `.impeccable/review/native/navigation/player-ios.png`, `organizer-ios.png`, `player-android.png`, and `organizer-android.png`. The fixture does not establish production authenticated routing or actual profile content. Screen-reader interaction, large text, tablets, notification data, and live account persistence were not tested. Detailed evidence and repeatable Android checks are in `docs/native-testing.md`. No browser validation or CLI visual detector was used.
