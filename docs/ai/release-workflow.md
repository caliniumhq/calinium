# Release workflow

## Eligibility gate

The manager refuses release-candidate creation unless all of the following are true:

1. The review session and approval manifest are still valid and deployment eligible.
2. The deployment package and deployment history record are intact.
3. The preview verification is terminally `verified`, has no failures, and has no blocking warnings.
4. The deployment target role is `development` or `unpublished`.
5. The Milestone 8B rollback preparation metadata matches the source deployment.
6. The release ID is new and the append-only history is valid.

When eligible, the manager creates only a local candidate package:

```text
Verified preview
  → evidence revalidation
  → source repository backup
  → release manifest + report
  → append-only release-history event
```

No Shopify request is made during candidate creation. The release manifest records the development target solely for traceability; it does not change that target.

## Release manifest

Each manifest records the deployment, review session, approval manifest, preview verification, approved configuration files, configuration checksums, development target, notes, validation result, and inherited strategy-to-approval traceability. All references include checksums so later consumers can reject changed evidence.

The only release status created by this milestone is `release_candidate`. A separate, explicitly authorized future milestone would be needed for any human-reviewed live release workflow.
