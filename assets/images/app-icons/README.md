# Palla native icons

Artwork supplied by the user in **App splash screen design.zip** on2026-10-16. The selected colorway is a cream padel-racket/P symbol and lime ball on Court Green (#062C22). These are supplied brand assets, not the illustrative P icon from the notification mockups.

## Assets and configuration

| File                           | Format                               | Used by                                                                   |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------- |
| `palla-app-icon.png`           | 1024×1024 RGB PNG, fully opaque      | Expo fallback icon, iOS app/notification icon and Android legacy fallback |
| `palla-android-foreground.png` | 1024×1024 RGBA PNG                   | Android adaptive icon foreground                                          |
| `palla-android-background.png` | 1024×1024 RGB PNG, solid #062C22     | Android adaptive icon background                                          |
| `palla-android-monochrome.png` | 1024×1024 RGBA PNG, black silhouette | Android themed icon alpha mask                                            |
| `palla-notification-icon.png`  | 96×96 RGBA PNG, white silhouette     | expo-notifications Android small icon                                     |

Every PNG embeds the sRGB IEC61966-2.1 profile. The unused alpha channels were removed from the fully opaque app icon and background. All decoded pixel values match the original exports exactly, including alpha on the transparent assets. The adaptive symbol fits the central66/108 safe zone; its farthest visible pixel is280.5px from center, inside the312.9px safe radius on the1024px canvas. Racket holes remain transparent in symbol-only files.

`app.json` references these files explicitly, including `ios.icon`, replacing the previous Expo Icon Composer override. Android notification tint remains #D4FF00. iOS uses its app icon automatically; Android uses the supplied white notification mask and system tint. The existing splash-screen animation and legacy web favicon are separate from this asset set.

## Verification and rebuilding

PNG dimensions, color types, opacity/transparency, white notification pixels, embedded profile and unchanged decoded pixels were verified. Expo SDK54's installed asset generators were used in an isolated temporary directory to check generated iOS and Android resources. See `docs/native-testing.md` for the result and runtime limits.

A new native build is required for home-screen and notification icon changes. Expo Go cannot verify the installed Palla launcher icon or replace its own native notification resources. The iOS launcher icon was verified in an installed Palla Debug build on iPhone17 Pro/iOS26.5 (2026-10-16). The Android launcher icon was also verified in an installed Palla Debug build on Pixel8/Android17 (2026-10-16). OS notification-icon rendering remains pending native checks; actual remote notification delivery still requires the setup tracked in GitHub issue #7.

## Provenance

Source ZIP SHA-256: `afb4e72d50191b513f4bb5f137f0dd301737eddb028b4c82e31f1d302622f4d4`

Normalized production files:

| File                           | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `palla-android-background.png` | `00da188442a4da5eb019894129deef0049456c01f30550e6969a09d172821d32` |
| `palla-android-foreground.png` | `a707ca0d2639bd83edf59897d7566418bdebcf1032c447955a8134ced0b3b98b` |
| `palla-android-monochrome.png` | `86060ed5522e941bb250a01218635797889a7dc0b0b1a5a4f710993c43ad4b71` |
| `palla-app-icon.png`           | `3eb7ff91a287bfeb34593a62d53b02808f1bf2110f07cc24af4c2775b03a406d` |
| `palla-notification-icon.png`  | `6aa16fafed09264e0e2e34f4d9404c120325d54eb84ff200b0fd2bfaf4264027` |
