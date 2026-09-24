# Development Preview Report

After upload checksums match, the adapter writes:

- `reports/preview-report.json`
- `reports/preview.md`

The report includes the development theme ID, preview URL, explicit deployment timestamp, allowlisted uploaded files, validation result, and warnings. It describes a preview target only; it does not open a browser or assert visual verification. Milestone 8C should consume this report for browser-level comparison.

Shopify CLI theme push returns a preview URL in its JSON output. [Theme push](https://shopify.dev/docs/api/shopify-cli/theme/theme-push)
