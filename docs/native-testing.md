# Native testing

Palla targets iOS and Android. UI and flow acceptance must use iOS Simulator and Android Emulator. Do not use browser testing or mobile browser viewports as substitutes. Unit tests, type checks, linting, and formatting remain useful independent code checks.

## Repeatable onboarding QA

Start Metro in Expo Go mode on port 8081, boot the iOS simulator and Android emulator, and install Expo Go for SDK 54. Then run:

```sh
python3 scripts/test-native-onboarding.py --platform ios
python3 scripts/test-native-onboarding.py --platform android
```

The runner uses the only booted device on each platform; pass `--device` when more than one is running. It discovers XcodeBuildMCP's installed `bundled/axe` driver, or accepts `--axe /path/to/axe`. Android defaults to the SDK's adb path and accepts `--adb`. Use `--port` if Metro is running elsewhere. Repeat `--case` to focus on specific cases, such as `--case organizer-skipped --case player-known`. Use `--resume` to retain completed cases from the same device and retry unfinished ones. The current phone targets are iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17.

The development-only `onboarding-preview?nativeQa=1` prepares Expo Go through its experience-scoped runtime API: mark the developer tutorial complete, disable automatic menu opening and developer keyboard shortcuts, and close the menu. Production still redirects the preview to sign-in; regular app routes do not run this preparation. Editing Expo Go's host preference file does not reliably configure a project experience.

XcodeBuildMCP's compact semantic snapshot omits React Native radio controls represented as `GenericElement` with radio semantics in `AXValue`. Use the bundled driver's full `describe-ui` tree and physical touch input instead of changing the app's accessibility roles. The runner resolves coordinates from fresh native accessibility frames. It paces iOS HID text input and scrolls offscreen controls into view. It re-delivers a cold-start URL once if Expo Go drops it. On iOS, it also checks for a late Expo Go tutorial sheet on the initial role screen and dismisses it through physical input. Subsequent cases reset with Review again instead of repeatedly cold-launching Expo Go. Disable the emulator's Gboard stylus-handwriting tutorial if it intercepts text input (`adb shell settings put secure stylus_handwriting_enabled 0`); this is a test-device input setting.

Screenshots and machine-readable results are saved under `.impeccable/review/native/onboarding-ios/` and `onboarding-android/`. Preview completion displays the submitted category so the tests check the callback payload as well as the visible selection. These runs exercise the actual form from step one through completion, without creating users or writing profiles. They do not establish live authentication, Supabase saving from a device, persistence after restart, screen-reader behavior, large text, or tablet acceptance. Use authenticated disposable test accounts for live save checks, and record those separately.

Record the device, OS, runtime (Expo Go or development build), screens/flows checked, and any blockers. Cover keyboard behavior, safe areas, scrolling, back navigation, text scaling, accessibility, loading/error states, persistence after restart, and actual authentication handoff. Use a development build for Palla's custom `palla://` OAuth redirects.

## October 13, 2026

- Code checks: `npm run verify` passed; 26 unit tests passed. Google name tests cover explicit given/family names, Google identity data, full-name fallback, missing names, and preservation of user-entered/completed profiles.
- Android: Pixel_8, Android 17, Expo Go with Expo SDK 54. Native app launched and the mode-selection preview was visually inspected. This revealed missing role-card styles from a callback-based Pressable style; the style now uses a static object with explicit pressed state. A second native capture confirmed the corrected panels. Evidence: `.impeccable/review/native/android-pixel8.png`.
- Android limits: this was a launch/layout smoke check, not complete flow, keyboard, accessibility, or actual Google-auth validation. No account was created or changed during this check.
- iOS: the Xcode license blocker is resolved. iPhone 17 Pro, iOS 26.5, Xcode 27.0, Expo Go 54.0.7 / SDK 54. The simulator booted and Palla launched natively. Mode-selection layout, navigation to the name screen, and empty-first-name validation were checked through native screenshots and UI automation. Evidence: `.impeccable/review/native/ios-iphone17pro.png`.
- iOS limits: text-entry automation unexpectedly reloaded Expo Go, so completion, draft preservation, keyboard behavior, and full accessibility acceptance remain unverified. Actual Google authentication and name-prefill still need a development build with Palla's custom redirect. No account was created or changed.
- iOS launch workaround: Expo's automatic `--ios` launch could not detect the installed Simulator app. XcodeBuildMCP successfully booted the simulator and installed the cached SDK 54 Expo Go app; Metro on port 8085 and `simctl openurl` opened the native preview directly.
- No browser testing was performed for these changes. Older web captures are historical evidence only.

### Google sign-in cancellation

- Native OAuth `cancel` and `dismiss` results now return quietly on sign-in, signup, and identity linking. Genuine Google sign-in failures show a short retry/email message instead of raw provider errors or redirect setup instructions.
- Regression tests cover both cancellation outcomes, incomplete callbacks, and successful code exchange. `npm run verify` passed with 32 tests.
- Android: Pixel_8 / Android 17 / Expo Go. Opened the provider window and used system Back without entering credentials; the sign-in form returned without an error message.
- iOS: iPhone 17 Pro / iOS 26.5 / Expo Go. Updated app loaded and the Google sign-in sheet opened. Its close button was missing from XcodeBuildMCP's semantic snapshot; Device Hub computer input failed with no window available. Actual sheet dismissal remains unverified on iOS. No credentials were entered or accounts changed.

### Guided Argentine category onboarding

- User approved mockup C (guided choice). Onboarding now has three steps; the third offers known category, beginner, unknown, and a non-playing option for organizers. Profile editing uses the same selector.
- `npm run verify` passed with 36 tests and no lint errors (13 pre-existing warnings). Category tests cover explicit answers, all eight categories, rejected fractional/out-of-range values, unknown/beginner separation, and organizer-only non-playing onboarding.
- Database migration was exercised on an isolated PostgreSQL 16 database with simulated Supabase roles: own-profile RPC save, category bounds, RLS visibility, organizer creation, and clearing an earlier known category all passed. Fixtures were rolled back and the local server stopped. Connected Supabase migration and five-argument RPC were confirmed; security advisors reported no findings. No remote account or profile was created for these checks.
- Android: Pixel_8 / Android 17 / Expo Go SDK 54. Opened the guided picker, selected 6ta, confirmed its label, and completed the development preview. Final collapsed selected-state screenshot: `.impeccable/review/native/category-android.png`.
- iOS: iPhone 17 Pro / iOS 26.5 / Expo Go SDK 54. Required-answer validation was exercised on the native category screen. The selected 6ta fixture loaded, but Expo Go's developer overlay blocked remaining interactions and an unobstructed final capture; semantic snapshots omit its close button and radio choices. `.impeccable/review/native/category-ios.png` is obstructed and is not acceptance evidence. iOS category selection/completion and full visual acceptance remain unverified.
- Real account persistence on devices, full onboarding back/draft behavior, profile editing, screen-reader navigation, large text, keyboard behavior, and tablet layouts were not validated end to end in this pass. No browser testing was used.

### Full native onboarding form matrix — October 13, 2026

- iOS: iPhone 17 Pro / iOS 26.5 / Expo Go SDK 54: all 25 checks passed across five cases. Android: Pixel_8 / Android 17 / Expo Go SDK 54: all 25 checks passed across the same five cases. iOS results include completed player cases retained through `--resume` while fixing the late developer tutorial interception, followed by both organizer cases.
- Cases: player with 6ta, beginner, unknown; organizer who does not play; organizer with 4ta. Each case checks empty-name validation, native name entry and draft preservation after back navigation, required-category validation, category preservation after back navigation, and completion callback category/mode data. Known-category paths also open the native selector and guidance. Android's first case also exercises system Back from category to name.
- Native physical touch, keyboard input, scrolling, accessibility-tree assertions, and screenshots were used. Player and organizer completion captures were visually inspected on both platforms. No browser testing was used. Reports and captures: `.impeccable/review/native/onboarding-ios/` and `.impeccable/review/native/onboarding-android/`. These supersede the earlier blocked iOS preview checks above for this tested scope.
- Setup fixes: full AXe tree/physical input bypasses the plugin's missing radio controls; paced iOS typing avoids HID character reordering; startup retries and tutorial dismissal prevent Expo Go intercepting form interactions; Android's stylus tutorial was disabled on the QA emulator.
- Code checks: `npm run verify` passed (36 tests; 13 existing lint warnings, no errors). Native runner Python syntax and changed source/document formatting also passed.
- Remaining: these tests complete the real form in its development preview, which deliberately performs no account writes. Authentication, Google-provided name prefill in a live session, actual Supabase save, real destination routing, and restart persistence on devices still require authenticated disposable test sessions. Profile editing, screen-reader interaction, large text, and tablets are outside this run.

### Organizer onboarding simplification

Organizer onboarding now ends after the name, with a two-step progress count and Start organizing action. Players keep their three-step flow and required category answer. The runner now covers three player answers and an organizer-skipped case; historical five-case reports above describe the previous version. Skipped organizer category arguments are null, preserving existing database category data rather than assigning not_playing. No migration is required.

- Verification for this change: `npm run verify` passed with 37 tests and 13 existing lint warnings, no errors. Direct iOS Device Hub accessibility input confirmed player name entry, required category validation, preserved names after Back and role switching, organizer 2-of-2 progress, and direct organizer completion with no category answer. Capture: `.impeccable/review/native/onboarding-ios/organizer-skipped-name.png`. The completion callback reported organizer dashboard and an empty category.
- Android verification is inconclusive in this pass. Google Play services displayed an ANR dialog, and subsequent automation encountered changing UI state. A fresh final native tree showed a completed Flor/8va player preview, different from the runner's Alex draft; further automated interaction was stopped to avoid interfering with an active manual session. The Android report records a failed automation run, not a confirmed app defect. The revised organizer flow still needs an isolated Android check.
- These native checks used the no-write preview. Real account save and restart persistence remain unverified for the revised flow.

### Updated onboarding regression — October 13, 2026

- iOS (iPhone 17 Pro, iOS 26.5, Expo Go SDK 54): 9 direct native Device Hub accessibility checks passed on the current form. Organizer: 2-of-2 progress and Start organizing action, empty-name validation, entered names preserved after Back, direct completion with organizer destination and no category answer. Player: empty-name validation, required-category validation, selection of 6ta, absence of placeholder Help me choose, name/category preservation after Back, completion callback with player destination and 6ta. Native name input used accessible setValue because AXe HID typing had failed in the earlier run.
- Android (Pixel_8, Android 17, Expo Go SDK 54): the focused `--case player-known --case organizer-skipped` native runner completed all 9 checks. Both names survived Back; category validation and preserved 6ta passed for player; organizer completed after the name without a category step or answer. Android system Back was also exercised for the player category step. This supersedes the earlier inconclusive Android organizer check.
- Fresh category and organizer-name screenshots were inspected. The known-category panel no longer contains Help me choose; organizer name screen shows 2 of 2 and Start organizing. Reports/captures are under `.impeccable/review/native/onboarding-ios/` and `.impeccable/review/native/onboarding-android/`.
- No app changes were needed during this run. No browser testing or account writes were performed. These are actual native form checks through development preview completion, not live-auth/Supabase-save or restart-persistence evidence. Beginner/unknown branches were not rerun in this focused pass.

### Role navigation — October 13, 2026

- iOS: iPhone 17 Pro / iOS 26.5 / Expo Go SDK 54. Native Device Hub input and screenshots checked player Discover, My games, Profile and organizer Overview, Sessions, Profile; selected states and notification/Back round trips passed for both roles (8 checks).
- Android: Pixel_8 / Android 17 / Expo Go SDK 54. Native accessibility-tree assertions and physical input checked the same 8 cases. All passed; machine-readable results are in `.impeccable/review/native/navigation/android-report.json`.
- Both platform captures were inspected for shared wordmark/bell placement, readable labeled tabs, selected pale-lime tile, and safe-area spacing. Captures: `.impeccable/review/native/navigation/player-ios.png`, `organizer-ios.png`, `player-android.png`, and `organizer-android.png`.
- These checks use `/navigation-preview/[role]/home`, a development-only fixture mounting the same shared Expo Router `RoleTabs` and `NavigationHeader` as the role layouts. The fixture performs no account writes. Its preview profile body is not the production profile screen. No browser testing or CLI visual detector was used.
- Repeat Android checks with Metro/Expo Go running on port 8081 and Pixel_8 at `emulator-5554`: `python3 scripts/test-native-navigation-android.py`. The script uses the local SDK adb path, opens each role fixture, asserts each tab's native selected state, checks the notification placeholder and Back return, then saves captures and its report. The iOS checks were performed directly through Device Hub.
- Code verification passed with 37 unit tests. Native tests do not establish production authenticated role routing, actual profile-screen behavior, real notification delivery/unread state, live account persistence, screen-reader interaction, large text, tablet layouts, keyboard behavior, or full loading/error coverage. The notification badge is intentionally absent until real unread data exists.

- Final navigation review: the reviewer scored the selected-highlight rounding and brief-persistence fixes resolved in all four phone captures. This ship disposition applies to those navigation fixes, not full-screen content or authenticated routing. The final PlatformPressable override preserves all supplied Expo Router tab props. Android asserts the settled destination heading as well as selected tab state before notification Back checks.
