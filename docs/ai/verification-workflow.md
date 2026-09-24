# Verification Workflow

```text
Approved deployment record
  → validate review, approval, generated workspace, package, and history
  → validate development-theme identity and preview metadata
  → load immutable post-upload snapshot (or perform a read-only Shopify pull)
  → compare files and checksums
  → parse settings and templates
  → validate section instances and order against the generated manifest
  → persist a terminal verification report and append-only history event
```

Verification rejects incomplete deployment evidence before it creates a report. Once evidence is valid enough to evaluate, a verification reaches exactly one terminal state: `verified` or `failed`.

The only allowed transitions are `pending → running → verified` and `pending → running → failed`. Reports never change deployment history, generated workspaces, approved reviews, or Shopify configuration.
