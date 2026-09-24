# Review State Machine

The session begins in `in_review`. The derived state is obtained by replaying the append-only log.

```text
in_review ──approve──> approved
     │                     (terminal)
     ├─request changes──> changes_requested ──resume──> in_review
     └─reject──────────> rejected ──reopen──> in_review
```

Allowed transitions are enforced by `ai/review-engine/state-machine.js`. No transition can bypass review decisions. In particular, `in_review → approved` is rejected unless every required item is approved, the generated workspace remains valid and unchanged, and the captured fingerprint still matches.

An `approved` transition creates one immutable approval manifest. The engine refuses a second approval manifest and has no deployment transition.
