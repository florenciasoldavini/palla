# Security Policy

Palla treats security and user privacy as product requirements. This policy explains how to report a suspected vulnerability without exposing users, project data, credentials, or an unfixed issue.

For implementation and release guardrails, see [`docs/security-baseline.md`](../docs/security-baseline.md).

## Supported versions

| Version                                  | Support                   |
| ---------------------------------------- | ------------------------- |
| Current production release on `main`     | Supported                 |
| Current `development` and preview builds | Best-effort investigation |
| Older commits, branches, and builds      | Not supported             |

## Report a vulnerability privately

Do not disclose suspected vulnerabilities in a public issue, pull request, discussion, screenshot, roadmap item, or social-media post.

Use GitHub's private **Report a vulnerability** flow for this repository:

[Privately report a vulnerability](https://github.com/florenciasoldavini/palla/security/advisories/new)

If that private flow is unavailable, do not publish the details. Contact the repository owner through the [GitHub profile](https://github.com/florenciasoldavini) to arrange a private reporting channel first.

Include only sanitized information:

- the affected URL, app platform, build, branch, or commit;
- a concise description of the impact;
- the smallest reproducible steps;
- whether authentication or a specific account role is required;
- sanitized screenshots, logs, or proof-of-concept material;
- any suggested mitigation, if known.

Never include passwords, access tokens, private keys, service-role credentials, database contents, personal information, or another user's project data.

## Testing boundaries

- Test only with accounts and data you own or are explicitly authorized to use.
- Do not access, modify, retain, or disclose another user's data.
- Do not run denial-of-service, destructive, persistence, social-engineering, spam, or automated high-volume testing.
- Do not attempt to bypass provider quotas, billing controls, rate limits, app-store controls, or third-party terms.
- Stop testing if you encounter sensitive data or could affect service availability.
- Preserve evidence securely and delete it when it is no longer needed for coordinated remediation.

This policy does not grant permission to access systems or data beyond the authorization already provided to you.

## Response and disclosure

The maintainer will aim to:

- acknowledge a complete report within five business days;
- validate the affected scope and severity;
- communicate whether the report is accepted, requires more information, or is out of scope;
- prepare and verify a fix before public disclosure;
- coordinate disclosure timing and credit when appropriate.

Do not disclose the vulnerability until the maintainer confirms that remediation is available and disclosure is appropriate.

## Scope notes

Reports may cover the Palla web application, iOS or Android builds, Supabase configuration and policies, Storage, Edge Functions, authentication flows, or repository/deployment configuration.

Vulnerabilities that exist only in an upstream dependency or third-party platform should normally be reported to that provider. Reports remain relevant to Palla when its configuration or use of that dependency creates an exploitable product issue.

Palla does not currently operate a paid bug-bounty program. Submission of a report does not create an entitlement to payment, reward, employment, or public credit.
