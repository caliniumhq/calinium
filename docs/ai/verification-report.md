# Preview Verification Report

`schemas/calinium-preview-verification.schema.json` defines the canonical report. Each report contains:

- terminal status and validated state history;
- deployment, review-session, approval-manifest, and Strategy → Draft → Review → Approval → Deployment traceability;
- independently listed deployment, theme, checksum, file, settings, template, and section results;
- expected and actual values, verification method, result, and remediation for every check;
- warnings, failures, and deterministic summary counts.

Reports are written only to `output/preview-verifications/preview-verification-*/`. They do not contain credentials and they do not modify the deployment package or generated workspace.

Failures are classified by their check category: deployment/manifest chain, development-theme identity, preview metadata, uploaded file allowlist, SHA-256 checksum, settings, template structure/order, section instance/order, or append-only history. Every failure carries a targeted remediation instruction; failed reports are retained rather than overwritten.
