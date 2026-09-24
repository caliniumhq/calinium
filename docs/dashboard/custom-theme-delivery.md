# Custom-theme delivery

When a paid order reaches `ready`, Calinium exposes only order-scoped download endpoints for the authenticated project member. The server keeps local workspace paths private; API responses expose artifact availability and a download filename, never filesystem paths.

Available artifacts are:

- Shopify-shaped theme ZIP
- canonical Theme Specification
- package validation report
- read-only package manifest
- generation metadata

The delivery page displays the validation outcome, source version, and manual installation instructions. Its required merchant notice is:

> Calinium has not modified or published your Shopify theme. Download and install the generated package when you are ready.

## Manual installation

1. Download the Shopify theme ZIP.
2. Add it in Shopify as a new unpublished theme.
3. Review it before deciding whether to publish it.

This milestone does not upload, install, update, duplicate, delete, or publish a Shopify theme. Preview creation and any deployment remain guarded by their separate existing workflows.

## Recovery

Generation state and attempts are durable. On restart, a paid order in `queued`, `generation_failed`, `validation_failed`, or `blocked` can be retried through the server. A retry uses the original snapshot and paid order; it never takes payment again. Validation and source-checksum failures remain visible to the merchant and require review before a valid package can be delivered.
