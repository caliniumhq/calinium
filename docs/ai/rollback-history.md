# Rollback history

Rollback history is append-only execution evidence at `output/rollback-history/events/<rollback-id>.json`. Each event validates against `schemas/calinium-rollback-record.schema.json` and is equivalent to the immutable rollback record in its isolated output directory.

The history includes the source release, source and restored deployment IDs, original M8B rollback metadata checksum, expected and actual restored configuration fingerprints, prior verification reference, target development theme, timestamp, reason, validation result, and Strategy-to-Approval traceability.

Use:

```sh
node release-theme.js history --type rollbacks
```

An existing rollback ID is rejected. Existing history files are never overwritten, and the manager never rolls back a `main`, published, or otherwise non-development target.
