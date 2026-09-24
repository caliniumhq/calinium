# Rollback Preparation

Milestone 8B does not implement rollback.

Before configuration upload, it pulls the existing target configuration into the isolated deployment directory and records its checksum. `reports/rollback-metadata.json` stores that prior checksum, the development theme ID, deployment package ID, history ID, and generated-workspace reference with `rollback_implemented: false`.

Milestone 8D can use these immutable records to implement a reviewed rollback operation without reconstructing deployment history.
