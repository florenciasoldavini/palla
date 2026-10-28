# Legal policy drafts

Status: draft, not effective or ready for publication. Prepared 26 October 2026.

## Documents

- [Términos — español](terms.es.md)
- [Terms — English](terms.en.md)
- [Privacidad — español](privacy.es.md)
- [Privacy — English](privacy.en.md)

Both language versions must remain equivalent and eventually follow the user's app language. A development-only native viewer is available at `/sessions-preview/legal`, also linked from Profile → About Palla in development. It automatically displays Spanish for a Spanish runtime locale and English otherwise, with no page-specific selector or saved preference. No shared app language/translation provider was found in this checkout; connect the reader to that provider if introduced. It does not implement app-wide translation, publication or acceptance tracking.

Run `node scripts/generate-legal-preview.js` from the project root after editing a document. The generated offline content in `src/features/legal/drafts.json` is checked against all four Markdown sources by the test suite. Use `node scripts/generate-legal-preview.js --check` for a read-only consistency check.

## Agreed decisions

- Operator: Florencia Soldavini, an individual, not a company.
- Initial market: Argentina. Contact: support.palla@gmail.com.
- Launch is free for players and organizers. Future organizer subscriptions are undecided and not authorized by these drafts.
- Players 16+, organizers 18+. Players aged 16–17 must have parent/legal guardian permission and confirm it. This is a chosen platform rule, not a claim that every minor requires an identical statutory consent process. A declaration is not verified guardian consent.
- Independent hosts arrange sessions, venues and payments. Florencia does not host sessions herself.
- Player cancellation before deadline: full refund or player-selected credit if offered by host. After deadline/no-show: refund or credit at host discretion. Host cancellation: full refund available, or player-selected credit if offered. Mandatory rights prevail.
- Hosts handle money and credits externally. No automated refund or credit balance is promised.
- Florencia moderates manually. Proportionate warnings/suspensions/bans, preventive restrictions for serious investigations, and reconsideration by email. No promised response time.
- No data sale, advertising/marketing use, or AI-training use planned at launch. Necessary service providers still process data.

## Publication blockers and deferred work

- Supply an appropriate operator contact address; do not use or invent a home address.
- Define deletion, retention, backup expiry and exceptions. The previously suggested periods were proposals, not approved decisions. Deferral does not suspend statutory rights.
- Confirm production provider activation, legal entities, hosting regions, international transfer arrangements and provider retention. The inventory below is source-code evidence only.
- Implement age/guardian declarations and appropriate eligibility handling. Existing signup must not be represented as collecting them already. Determine suitable identity/consent verification where required; no blanket claim of valid minor consent.
- Verify executable moderation restrictions, account deletion and handling of upcoming registrations/hosted sessions before promising them.
- Make cancellation/refund terms visible before joining and reconcile the existing post-deadline cancellation UI with the policy; the Terms do not implement refund handling.
- Add accessible legal routes and public policy URLs, language selection, and versioned acceptance where appropriate. Confirm language selection infrastructure; current source inspection did not establish a shared localization mechanism.
- Complete data-rights procedures and policy notices, including the applicable AAIP complaint notice, before publication.
- No effective date or user acceptance is created by these draft files.

## Provider inventory: configured integrations, not deployment verification

| Integration             | Purpose / source evidence                                                                                                       | Still to verify                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Supabase                | Auth, profiles, sessions, registrations, chat, storage, RPCs and Edge Functions; `src/lib/supabase.ts`, feature repositories    | Project region, provider terms, transfers, backups and deletion |
| Google                  | Optional Google sign-in, Maps/Places venue/address search; auth adapters, `app.config.js`, `supabase/functions/places-address/` | Enabled services and provider data flows                        |
| Expo / Apple / Firebase | Native push tokens, notification delivery; `src/features/notifications/services/push.service.ts`                                | Credentials, activation, delivery metadata and retention        |
| Resend                  | Welcome email; `supabase/functions/welcome-to-palla/`, `env-sync.config.json`                                                   | Active sender, email processing and retention                   |
| Vercel                  | Public sharing pages/hosting; project configuration                                                                             | Production deployment, request logs and region                  |
| Sentry                  | Error/performance monitoring only when DSN is configured; `src/lib/sentry.ts`                                                   | Production activation, event contents, scrubbing and retention  |

Do not expose environment values, credentials or user records while verifying this inventory.

## Legal research supporting the drafting approach

- [Law 25,326](https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/actualizacion): data quality, notice, consent, rights and international transfers.
- [AAIP Resolution 4/2019](https://www.argentina.gob.ar/normativa/nacional/resolucion-4-2019-318874/texto): progressive autonomy and minor data consent. Guardian confirmation is required where the minor lacks sufficient capacity; the resolution does not create an automatic universal 16+ exemption.
- [Civil and Commercial Code](https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion): articles 25, 26 and 684. Data consent, contractual capacity and sports participation are distinct questions.
- [Law 26,061](https://www.argentina.gob.ar/normativa/nacional/ley-26061-110778/texto): children's privacy, dignity and integrity.

Drafting choices are not a certification of compliance. Do not invent broad liability waivers, parental verification, insurance or supervision guarantees.
