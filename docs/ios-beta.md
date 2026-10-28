# iOS beta build and TestFlight

## Build profiles

Use the existing `production` profile for TestFlight. It uses store distribution,
the EAS production environment, automatic build-number increments, and production
telemetry. TestFlight runs the release binary without Metro. `preview` is internal
ad hoc distribution and requires registered iPhones; it is not a TestFlight build.
`development` includes the development client and uses Metro.

```sh
eas build --platform ios --profile production
```

Once the build succeeds, submit that specific build ID (printed by EAS), rather
than relying on whichever build happens to be latest:

```sh
eas submit --platform ios --profile production --id <build-id>
```

Submission uploads to App Store Connect; TestFlight processing, beta review where
applicable, and tester invitations are separate steps. This does not publish the
app publicly on the App Store.

## Before signing

- [ ] Apple confirms the paid membership is active. Accept any pending agreements.
- [ ] Account owner signs into Apple through EAS and completes two-factor
      authentication. Do not put the password, verification codes, certificates,
      or APNs keys in this repository.
- [ ] Confirm the team and register `com.florenciasoldavini.palla`; let EAS create
      the distribution certificate and App Store provisioning profile.
- [ ] Set the actual `APPLE_TEAM_ID` in EAS and the hosted association-file
      environment, then verify session Universal Links. See `session-sharing.md`.
- [ ] Configure the APNs push key in EAS. Follow `chat-push.md` for device delivery
      acceptance; a successful build does not verify push.
- [ ] Create the Palla App Store Connect record with the same bundle identifier.
      Capture its numeric app ID when configuring submission.

## Release environment

EAS production variables must include `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `GOOGLE_MAPS_IOS_API_KEY`.
The Maps key must authorize Maps SDK for iOS and the exact bundle identifier.
`EXPO_PUBLIC_SITE_URL` and `EXPO_PUBLIC_SESSION_SHARE_URL` use the documented
public HTTPS origin from `src/config/session-link-defaults.json`.
`EXPO_PUBLIC_APP_ENV` is set by each build profile in `eas.json`.

The local `.env.local` remains the development source of truth. Its localhost
site URL is intentional for local use and must not overwrite release settings.
Do not run an unrestricted environment sync as release preparation.

- [ ] Verify all production variables in EAS before building; ignored local env
      files are not uploaded to the builder.
- [ ] Configure `EXPO_PUBLIC_SENTRY_DSN` for crash reporting and
      `SENTRY_AUTH_TOKEN` for source-map upload. Neither is currently available
      locally. Confirm the native Sentry upload step can authenticate before
      treating the release build as ready.
- [ ] Confirm native auth callbacks (`palla://callback` and password reset),
      email links, and the hosted sharing origin work with the intended backend.

## Beta acceptance

- [ ] Install the TestFlight binary on a physical iPhone and launch without Metro.
- [ ] Test signup/sign-in, Google name prefill, onboarding, sign-out, and account
      recovery with disposable accounts.
- [ ] Exercise organizer publication, player discovery/join, full capacity,
      waitlist, cancellation, and automatic promotion with two accounts.
- [ ] Check Maps, session sharing, photo selection, chat, offline recovery, and
      foreground/background/cold-start push navigation.
- [ ] Check keyboards, safe areas, back navigation, scrolling, large text,
      VoiceOver, and loading/error states. iPad is enabled in app configuration;
      its layout and supported-device behavior also need validation.
- [ ] Repeat applicable native flows on Android and record that platform
      separately; iOS success does not establish Android readiness.
- [ ] Prepare accessible privacy-policy/support pages, beta contact information,
      review notes, and a working review account if required.
- [ ] Record build ID, app/build version, device/OS, environment, checks, failures,
      and cleanup in `native-testing.md`. Keep untested items marked unverified.

## Preparation record — 26 October 2026

Apple membership activation is pending according to the account owner. Expo CLI
successfully authenticated as the project owner. The EAS production environment
was initially empty. Configured its backend URL/publishable key, restricted iOS
Maps key (sensitive visibility), and public site/share origins. The local site
URL remains localhost and the Apple Team ID is absent.

Attempted the production build with `--non-interactive --freeze-credentials
--no-wait`. EAS loaded the five production variables and the production telemetry
label, initialized the remote iOS build number to 1, then stopped with
`Credentials are not set up. Run this command again in interactive mode.`
No cloud compilation job or signed IPA was produced. Retry the interactive build
command above after membership activation with the account owner available for
Apple sign-in and two-factor authentication.

`npm run verify` passed (68 files, 325 tests; 22 existing lint warnings).
An iOS Hermes JavaScript/assets export succeeded in
`/private/tmp/palla-ios-beta-export`. That export uses local development settings
and is a compilation check, not an installable IPA or a distributable beta.
No new iOS/Android device runtime validation was performed for this configuration
change. Signed distribution and physical-device push remain unverified.

References: [EAS iOS builds](https://docs.expo.dev/build-reference/ios-builds/),
[EAS environment variables](https://docs.expo.dev/eas/environment-variables/),
and [TestFlight submission](https://docs.expo.dev/submit/ios/).
