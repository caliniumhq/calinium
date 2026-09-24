# Security Policy

## Reporting a vulnerability

Do not disclose suspected vulnerabilities, credentials, tokens, private merchant data, or exploitable store details in a public issue or pull request.

Before the repository is made public, security reports should be sent through the private channel provided by the maintainers. After publication, the maintainers intend to enable GitHub private vulnerability reporting and document any additional public security contact here.

Include only the information needed to reproduce and assess the issue. Use synthetic store, project, flow, job, artifact, and theme identifiers whenever possible. Never attach a production database, access token, private key, session cookie, webhook secret, or merchant export.

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

Calinium is under active development and has not published a stable public release line. Security fixes currently target the latest public repository state. This policy will be versioned when supported releases are published.
