# Review & Approval Session Engine

Milestone 8A turns a validated generated-theme workspace into a review session. It does not regenerate strategies, drafts, or themes; modify the source theme; modify the generated workspace; contact Shopify; or deploy a theme.

## Input and output boundaries

The engine reads an existing `output/generation-run-*` workspace using the Milestone 7 generated-workspace validator. It verifies the generated manifest, reports, configuration JSON, and source-runtime backup archive. It then writes a new, separate session only under:

```text
output/review-sessions/review-session-*/
  session.json
  audit/*.json
  manifests/approval-manifest.json   # only after successful approval
```

The generated workspace is fingerprinted when the session is created. Every later validation recomputes that fingerprint and makes deployment ineligible if it changed.

## Determinism and approval

Session construction uses only the generated manifest and its immutable generation timestamp. It never reads the clock. Audit commands require caller-supplied `event_id`, `recorded_at`, and `actor_id`; there are no generated identities or timestamps.

The session root is immutable. Decisions and state transitions are new audit-event files written with exclusive creation, so prior events and approval history cannot be overwritten. Every event has a contiguous sequence, previous-event hash, and deterministic SHA-256 event hash.

## Commands

```sh
node review-theme.js create --workspace output/generation-run-0001 --session-id review-session-0001
node review-theme.js validate --session output/review-sessions/review-session-0001 --pretty
node review-theme.js decide --session output/review-sessions/review-session-0001 --item generated-configuration --outcome approved --reason "Validated" --event-id review-001 --recorded-at 2026-07-20T00:00:00Z --actor merchant-reviewer
node review-theme.js transition --session output/review-sessions/review-session-0001 --to approved --reason "All required items approved" --event-id approve-001 --recorded-at 2026-07-20T00:10:00Z --actor merchant-reviewer
node review-theme.js explain --session output/review-sessions/review-session-0001
```

All required review items must be explicitly approved before an `approved` transition is accepted.

## Reused components

- Milestone 7 `validateGeneratedWorkspace` and theme-capability mappings.
- Generated-theme manifest, change manifest, diff, preview report, and source backup archive.
- The shared local JSON-schema validator.
- Existing manifest trace fields, which link strategy, mappings, draft, and generated configuration.

## What deployment eligibility means

`ready_for_deployment` means only that the configuration is review-complete. It is not a deployment action or permission to publish. Eligibility requires the approved state, valid generated workspace, unchanged generated-workspace fingerprint, and every required review decision approved.

## Definition of done

Milestone 8A is complete when every generated workspace can produce a deterministic review session that conforms to its schema; state transitions and append-only audit history are enforced; approval manifests are deterministic; deployment eligibility is calculated automatically; and every decision remains traceable from strategy through mapping, draft, and generated theme. Existing builders, generators, mappings, validators, and CLIs must continue to pass, Theme Check must report no new offenses, and no source theme file, generated workspace, merchant content, or storefront runtime behavior may be modified.
