# Change Manifest

Every run writes `reports/change-manifest.json`. It makes the proposed scope reviewable without inspecting template JSON.

The report lists homepage and page-level added and preserved section counts, always reports zero removed and modified merchant sections, and lists copied global settings that differ from the baseline `apps/theme/config/settings_data.json`.

The `safety` object must retain `source_theme_modified: false`. This report describes the generated review workspace only; it is not an instruction to mutate the source theme.
