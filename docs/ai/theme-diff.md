# Theme Diff

Every run writes `reports/theme-diff.json`. It records generated configuration files, generated section instances, preserved source-facing areas, proposed global setting IDs, unsupported plans, and intentionally skipped items.

It is an explainable structural comparison, not a line-oriented diff. The source theme is not edited, so the manifest lists source runtime directories as untouched and preserved. Use it together with the change manifest and preview report before any later deployment workflow.
