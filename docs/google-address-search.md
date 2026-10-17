# Google address search setup

Session creation searches a street address using Places API (New). Club name remains organizer-entered. Predictions are restricted to Argentina and street_address/premise/subpremise, biased to Buenos Aires. The integration does not import a directory of clubs or infer court availability.

## Configure Google Cloud

1. Open https://console.cloud.google.com/ and create/select a project.
2. Attach billing, then enable **Places API (New)** in APIs & Services → Library.
3. Create an API key under APIs & Services → Credentials. Restrict its APIs to **Places API (New)**. This is a server web-service key: browser referrer/iOS/Android restrictions do not apply to the Supabase proxy. If your deployment has a fixed outbound IP, restrict it to that IP.
4. Set provider quotas appropriate for your budget in Google Cloud, and billing alerts. Billing alerts do not stop spend.
5. In the Palla Supabase project, open Edge Functions → Secrets and add `GOOGLE_PLACES_API_KEY`. Never use an `EXPO_PUBLIC_` variable or commit the key. The deployed `places-address` function reads this secret at request time.
6. In native Palla, open Create session and type a street and number in Club address. Select a prediction; its formatted street address replaces the field. Verify Google Maps attribution, editing, no matches, offline retry, and provider failures on iOS and Android after configuration.

Official setup: https://developers.google.com/maps/documentation/places/web-service/get-api-key

## Runtime and persistence

The mobile app calls a repository/service through a debounced TanStack Query hook. The authenticated Edge Function validates the user with Supabase Auth and checks the trusted active organizer record. It does not trust user metadata. Durable private database counters enforce 30 requests per minute and 300 per UTC day per organizer, plus a hard app-wide total of 9,000 Google requests per billing month across autocomplete and details combined. The billing month resets at midnight America/Los_Angeles on the first day, matching Google. Atomic reservation happens before Google is called, across all users; failures/timeouts consume slots and are never refunded. Concurrent requests serialize at the boundary. When exhausted, no provider request is made and users can enter the address manually. Search/details requests have bounded input, a fixed Google endpoint, field masks, and an 8-second upstream timeout. Provider messages and keys are never returned to the client. The function gateway JWT check is disabled because the body explicitly verifies bearer tokens with getUser; unsigned callers are rejected.

One session token groups autocomplete and address details, rotating after selection. Predictions live only in memory (query gcTime 0); they are not persisted. Only an end-user-provided street address is selected into the form, under Google's end-user address Autocomplete exception. Business details, reviews, coordinates and directory data are not copied to venue records. Google Maps attribution accompanies predictions. See https://developers.google.com/maps/documentation/places/web-service/policies.

Search errors leave manual street-address entry available. Without the server secret, the API returns a safe not_configured code and the app explains that address search is unavailable; no Google request is made.

## Verification

`deno test --node-modules-dir=none --allow-env supabase/functions/places-address/index.test.ts` covers unsigned callers, active organizers without a provider key, and non-organizer rejection, with mocked network responses and no paid calls, including monthly exhaustion blocking the provider. `supabase/tests/places-search-quota.sql` covers minute/day limits, private-counter isolation, player rejection and anonymous rejection in a rollback-only PostgreSQL fixture.

Google Cloud project palla-502717 now has active pay-as-you-go billing and Places API (New) enabled. Its key is restricted to that API and stored in Supabase as GOOGLE_PLACES_API_KEY (not in the mobile bundle or repository). Live native predictions and selection passed on both iOS and Android; see the October14 live check in native-testing.md. Native control and fallback checks are recorded in docs/native-testing.md.

The security advisor reports two intentional quota findings: RLS has no client policies on the private counter (default deny), and authenticated callers can execute the narrow SECURITY DEFINER quota RPC. The RPC derives its caller from auth.uid(), checks the active organizer record, accepts no target-user argument, and fixes search_path. Local authorization tests and deployed grant checks confirm clients cannot modify counters and anonymous callers cannot execute it. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable. The pre-existing leaked-password-protection warning is unchanged.

Monthly cap verification: supabase/tests/places-monthly-cap.sql covers last permitted request, denial above 9,000, shared exhaustion across organizers, previous-month isolation, anonymous/player rejection and counter privacy. The cap protects requests made through this Palla proxy only; other Google projects, external use of the key, or unrelated Google Cloud services are not capped here. Google aggregates free allowances by billing account, so shared billing usage must be checked before claiming a zero Google bill. Google monthly reset source: https://developers.google.com/maps/billing-and-pricing/pay-as-you-go.

Google Console additionally confirms applied daily quotas of 250 AutocompletePlacesRequest and 250 GetPlaceRequest for palla-502717. The user explicitly approved both values after the confirmation was blocked by automatic review. Daily exhaustion makes the app use its manual-entry fallback; the combined 9,000/month proxy cap remains active. This remains a Palla usage safeguard, not a cap on unrelated/shared-billing Google Cloud charges.

Authorized billing-account audit on October14,2026: Google Cloud Account Management listed only Palla (palla-502717) under linked projects. No other project currently shares this account. This is a point-in-time observation; linking another project or adding other paid features changes the cost assumptions.
