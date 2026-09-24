# Merchant Interview UI

## Flow

```text
Welcome
  → Discovery → Business → Brand → Audience → Products → Design → Brand References
  → Features → Content → Goals → Review → Confirmed Merchant Profile
```

The ordering comes from the versioned catalog categories. The Dashboard renders question titles, descriptions, choices, requirements, and answer types directly from the catalog returned by the API adapter.

## Dynamic behavior

- Answer changes are sent to the engine through `saveProgress`.
- The engine resolves visibility and removes inactive branch answers.
- The returned session’s `visible_question_ids` controls the next render.
- The UI never evaluates a dependency itself.
- Required validation comes from the existing answer validator. A user cannot advance through a required incomplete current category, and full completion is required before review.

## Summary and completion

The summary endpoint invokes the existing profile-builder preview. Confirming the modal calls the engine’s existing completion operation, which creates the canonical Merchant Profile and attaches it to the completed session. Phase 9A.2 stops there: it does not run the Strategy Compiler.

## Supported answer types

The renderer supports `text`, `textarea`, `number`, `currency`, `boolean`, `single_choice`, `multiple_choice`, `tags`, `url`, `url_or_domain`, `email`, `upload_placeholder`, `image_placeholder`, `color`, `asset_reference`, `color_palette`, and `reference_list`. Asset, palette, and reference controls use the authenticated application API; they do not duplicate validation, branching, or profile mapping in the UI.
