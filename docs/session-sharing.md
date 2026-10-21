# Session sharing

The organizer occurrence and public detail share the same occurrence URL:
`https://palla-pink.vercel.app/session?id=<UUID>`. Set
`EXPO_PUBLIC_SESSION_SHARE_URL` to change the shared HTTPS origin. The auth site
URL is independent; localhost auth redirects never become public share links.

The native share sheet receives the title, a normalized description (up to 240
characters), and the link. iOS gets a separate URL item; Android includes the URL
in the shared text. Receiving apps control their own previews and caching.

## Metadata and images

Vercel rewrites `/session` to an anonymous server handler that injects the
occurrence title, description, canonical URL, Open Graph and Twitter image tags
into the built Expo page. The image URL is stable and resolves the current cover
rather than exposing an expiring Storage URL. Uploaded cover comes first, then
the venue Google photo (with attribution), then the Palla brand image. Responses
use no-store and recheck public visibility; private or missing sessions return 404. External apps may retain a preview they already fetched.

Server configuration:

- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for anonymous detail lookup.
- `SESSION_SHARE_SUPABASE_ANON_KEY`: legacy **public anon** JWT for the existing JWT-verified cover function. Never use a service-role key here.
- `APPLE_TEAM_ID`: signing team for the iOS association file.
- `ANDROID_APP_LINK_FINGERPRINTS`: comma-separated release/Play signing SHA-256 fingerprints. Do not publish development signing certificates as production trust.

Missing signing identities return 503 from the association endpoint. Native
configuration declares the domain, but automatic HTTPS app opening requires the
public association files to match the installed signed app. Changing native
configuration requires a new native build, not just a JS refresh.

## Local checks

Run `npm run build`, then `node scripts/session-sharing-local.mjs`. It serves the
actual metadata/image/association handlers on port 8084 using `.env.local`.
Optionally `SESSION_SHARE_ANON_FILE=/absolute/temp/file` reads the public anon JWT
without putting it in shell history. Never commit that file.

Request `/session?id=<public occurrence UUID>` and `/api/session-image?id=<UUID>`.
The canonical metadata deliberately keeps the public HTTPS origin. To exercise a
native share sheet against localhost, open the development-only route
`palla://sessions-preview/session-sharing?id=<UUID>`. Android needs
`adb reverse tcp:8084 tcp:8084`. This uses the same share-payload builder as the
production buttons and changes no account data.

Local HTTP validation cannot prove public-domain OS verification or previews in
external services such as WhatsApp. Those services must fetch a publicly deployed
URL. Deployment and signed association verification remain separate acceptance
checks.
