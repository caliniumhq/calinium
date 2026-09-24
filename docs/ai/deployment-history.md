# Deployment History

Each successful deployment creates:

- `output/deployments/deployment-*/reports/deployment-history.json`
- `output/deployment-history/events/deployment-*.json`

The second location is authoritative and append-only: each deployment ID is written with exclusive creation, and a duplicate ID is rejected. Every record contains package identity, review/approval-derived traceability, target role and ID, upload list, timestamp supplied by the caller, preview URL, and deployment status.

History is a record of development-theme uploads, never a publish ledger.
