# Approval Manifest

`manifests/approval-manifest.json` is created only after a session reaches `approved`. It is a deterministic readiness record, not Shopify deployment configuration.

It contains the generation and session identities, the approval event and actor supplied by the reviewer, immutable workspace fingerprint, audit-chain head, computed eligibility, validation status, and the trace from Strategy → Mapping → Draft → Generated Theme.

Because the manifest is written with exclusive creation and its audit event is chained, no later review command can overwrite it. A deployment layer must independently consume this manifest; Milestone 8A performs no deployment.
