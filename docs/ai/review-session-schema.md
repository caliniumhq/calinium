# Review Session and Audit Schemas

`schemas/calinium-review-session.schema.json` validates immutable `session.json` roots. It captures the generated workspace identity and hash, review items, strategy-to-generated-theme traceability, and initial validation result. Current state is intentionally absent: it is replayed from audit events.

`schemas/calinium-review-audit-event.schema.json` validates one append-only audit event. Events require an explicit sequence, event ID, timestamp, actor, event type, payload, previous-event hash, and deterministic event hash.

`schemas/calinium-approval-manifest.schema.json` validates the immutable approval record created only after an approved state. It records deployment eligibility, the audit-chain head, workspace fingerprint, approver, approval event, and full upstream traceability.

These contracts are versioned at `1.0.0`. The engine rejects unsupported schema/engine versions through the schema constants and validator checks.
