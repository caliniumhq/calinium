# Rollback workflow

Rollback restores a previously verified configuration only to the exact same unpublished/development theme. It is a controlled recovery action, not a production publishing mechanism.

## Eligibility gate

The manager requires:

1. A valid append-only release candidate with revalidatable source preview evidence.
2. Immutable M8B rollback metadata and a non-empty pre-deployment snapshot.
3. Exactly one prior deployment on the same theme whose approved configuration fingerprint equals the snapshot fingerprint.
4. A terminal `verified` preview report for that prior deployment.
5. A current Shopify target with the same ID, name, and role as the verified development target.
6. An explicit rollback ID, timestamp, reason, store, and `--execute`.

## Execution

```text
Release candidate
  → revalidate release + preview + deployment history
  → identify exact previous verified deployment
  → backup source repository and pull current development configuration
  → stage only templates/*.json and config/settings_data.json
  → upload with M8B's allowlisted configuration transport
  → pull target again and compare approved checksums
  → write rollback record + append-only history
```

The execution record contains both expected and actual configuration fingerprints, restored file checksums, target identity, reason, prior verification reference, and inherited traceability. A checksum mismatch is recorded as `rollback_failed`; it is never represented as successful restoration.

No generated workspace is modified. The rollback staging directory is an isolated transport copy and does not modify source theme runtime files.
