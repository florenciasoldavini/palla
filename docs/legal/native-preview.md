# Native legal draft preview

The preview is available only in development at `/sessions-preview/legal` (Expo Go: `exp://127.0.0.1:8081/--/sessions-preview/legal`). In development, Profile → About Palla also provides a preview link. It automatically uses Spanish for a Spanish runtime locale and English otherwise. There are no language tabs or page-specific preference. A shared app language/translation provider was not found in this checkout; reuse it when available.

The viewer is an offline reading surface. Opening a document does not accept Terms, publish a policy or change an account. Warnings and pending sections intentionally remain visible. Release builds redirect this preview to sign-in, and the enclosing preview stack is development-only.

Markdown under `docs/legal/` remains the source of truth. After edits, run `node scripts/generate-legal-preview.js` from the project root. `node scripts/generate-legal-preview.js --check` and the four source-parity tests detect stale generated content.

Native QA evidence and limitations are recorded in [native testing](../native-testing.md#legal-policy-draft-viewer--october-26-2026). The checked user story is opening each complete draft, reading in both languages, automatic locale selection, and returning to the document list. There is no feature-specific network/API boundary or account write.
