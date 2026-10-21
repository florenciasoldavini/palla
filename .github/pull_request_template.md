## Problem

<!-- What product or engineering problem does this solve? Why is the change necessary, and who is affected? -->

## Solution

<!-- Summarize what changed, how it solves the problem, and what is intentionally outside this PR's scope. -->

## User impact

<!-- Describe new or changed behavior, including important loading, empty, error, or disabled states. Note accessibility and responsive implications. For infrastructure-only work, write "No direct user-facing impact." -->

## Architecture and decisions

<!-- Record important technical decisions, affected boundaries or data flow, tradeoffs, and any new dependencies or architectural consequences. If appropriate, write "No significant architecture changes." -->

## Screenshots

<!-- Add before/after screenshots for visual changes, mobile and web evidence when both are affected, and a short video or GIF for interaction-heavy work. Use real product evidence; do not fabricate screenshots. For non-visual changes, write "Not applicable." -->

## Verification

<!-- Check the commands and manual checks relevant to this PR. Conditional checks are not required when their scope is unaffected. -->

- [ ] `npm run env:check`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run format:check`
- [ ] `npm run build`
- [ ] Supabase tests (when migrations, RLS policies, or database functions change)
- [ ] Manual web verification (when applicable)
- [ ] Manual native verification (when applicable)

**Skipped or unavailable checks:**

<!-- Explain any skipped, unavailable, or failing checks and why they do not block this PR. -->

## Data, security and environment impact

<!-- Select all that apply. Select the first item only when none of the remaining items apply. -->

- [ ] No data, security or environment impact
- [ ] Database migration added or changed
- [ ] RLS policies or permissions reviewed
- [ ] Environment metadata updated
- [ ] `.env.example` regenerated
- [ ] Edge Functions changed
- [ ] External API or secret boundaries reviewed
- [ ] Required deployment or provider-console steps documented

## Documentation

<!-- Select the outcome and every repository document relevant to this change. -->

- [ ] Documentation affected by this change was updated
- [ ] No documentation update was needed
- [ ] `README.md` updated for setup, commands, CI, or deployment changes
- [ ] `AGENTS.md` updated for architecture or implementation rules
- [ ] `supabase/README.md` updated for migrations, RLS, or Supabase behavior
- [ ] `env-sync.config.json` and `.env.example` remain synchronized
- [ ] Design-system documentation updated when shared UI rules changed

## Known limitations

<!-- State known limitations, incomplete behavior, risks, or compatibility concerns. Write "None known." when appropriate. -->

## Follow-up

<!-- List work intentionally deferred to separate PRs. Write "None." when no follow-up is planned. -->
