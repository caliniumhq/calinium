# Security Policy

Calinium is a public open-source project distributed under AGPL-3.0.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities or security-sensitive findings in a public issue, pull request, discussion, or other public channel.

Repository collaborators should use GitHub Security Advisories to coordinate privately. External private vulnerability reporting is not currently enabled, and this repository does not publish an alternate private security contact. Until an approved private reporting route is documented here or in the repository's Security tab, do not transmit vulnerability details through public repository features.

When a private reporting route is available, include the affected component, reproduction steps, expected and observed behavior, potential impact, and a minimal proof of concept when it can be shared safely.

Use synthetic data and identifiers whenever possible. Do not include real merchant or customer data, credentials, API keys, tokens, production secrets, database contents, session cookies, webhook secrets, or other sensitive information that is not necessary to assess the issue.

## Security-sensitive boundaries

Changes affecting the following areas require focused review and tests:

- Shopify OAuth, App Bridge, session-token, webhook, and scope validation;
- organization, shop, project, and operator authorization;
- tenant isolation and durable state ownership;
- secrets, encryption keys, credential envelopes, and log redaction;
- generated-artifact provenance and checksum validation;
- Shopify theme targeting, MAIN-theme exclusion, and publication controls;
- payment idempotency and purchase identity;
- provider input/output handling; and
- dependency and public-contributor supply-chain risk.

Healthy process liveness must never substitute for protected operational readiness. Preview readiness must never authorize publication or live-theme mutation.

## Supported versions

Calinium is under active development. No stable public release, including v0.1.0, has been published. Security fixes currently target the latest public repository state. This policy will be versioned when supported releases are published.
