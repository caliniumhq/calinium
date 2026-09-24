# Generated Theme Manifest Schema

`schemas/calinium-generated-theme.schema.json` validates `manifests/generated-theme.json` in every review workspace.

Required top-level fields are version metadata, a generation ID, immutable approval identifiers, source strategy version, deterministic generation timestamp, workspace, generated files, generated section instances, generated settings, merchant references, validation status, warnings, and unsupported items.

Every generated file, section instance, setting, merchant reference, and unsupported item carries a trace with `source_draft`, `source_mapping`, `compiler_decision`, `reasoning`, evidence-based `confidence`, and `approval_reference`.

The schema deliberately represents a manifest, not a theme archive. Its generated paths allow only `theme/templates/`, `theme/config/`, `reports/`, and `manifests/`. The workspace validator further restricts `theme/` to template JSON and copied `settings_data.json`.

`schemas/calinium-generation-approval.schema.json` is the companion approval contract. It requires a positive approval, approval reference, immutable completion timestamp, completed confirmations, merchant resource references, and references for each asset marked required by the Draft.
