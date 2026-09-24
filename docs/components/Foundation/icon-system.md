# Icon System

## Purpose

Icon System defines the single visual language and semantic registry for compact symbolic communication across Calinium. Icons support understanding, navigation, commerce, and verified state; they never substitute for essential text or become decoration without function.

## Responsibilities

Icon System owns approved icon names, visual consistency, semantic use, sizing, color inheritance, accessible decorative versus informative treatment, and the canonical Shopify renderer contract.

It does not own an action, label, feedback message, product state, Badge, Status Indicator, or interactive control. Those responsibilities remain with the composing component.

## User Goals

Customers should recognize familiar actions quickly, receive text-equivalent meaning where required, and encounter quiet, consistent symbols that reduce rather than add visual noise.

## Merchant Goals

Merchants should select only approved semantic icons in supported Theme Editor settings, retain image-first content where documented, and avoid icon styling or registry changes at section level.

## Structure

Icon System consists of a canonical renderer, a stable lowercase kebab-case registry, semantic categories, shared view-box rules, and documentation for decorative and informative usage.

## Required Elements

Every rendered icon requires a registry name and an explicit decorative or informative intent. Informative use requires an accessible text equivalent supplied by the owning component.

## Optional Elements

An icon may receive a documented size, contextual label, or adjacent visible text. It inherits approved component color and must not receive arbitrary inline artwork, hard-coded color, or an unsupported name.

## Supported Variants

### Decorative

Supports nearby content without adding independent meaning and is hidden from assistive technology.

### Informative

Conveys a verified meaning that is also available through an accurate accessible text equivalent.

### Interactive Companion

Composes with Button, Icon Button, Disclosure, gallery, or another documented owner; the composing component retains action and state responsibility.

## Component-Specific Rules

### Registry and Naming

Use the canonical renderer and stable semantic name, such as `search`, `cart`, `close`, `arrow-left`, or `play`. Names describe intent, not appearance, color, or temporary design treatment. Reuse an existing semantic value before proposing a new one.

### Visual Language

Icons use the shared `0 0 24 24` view box, `currentColor`, consistent stroke treatment, balanced proportions, and approved small, medium, or large semantic sizes. They must not mix illustration systems, icon fonts, bitmap substitutes, or arbitrary dimensions.

### Accessibility

Decorative icons are hidden from assistive technology. Informative icons require an accurate label and must not be the sole carrier of an essential instruction, status, or error. Icon Button owns compact-action labelling; Status Indicator, Alert, and Validation Message own state text.

### Shopify Renderer

Theme components render icons only through `snippets/icon.liquid`, using the documented `icon`, `size`, `decorative`, and where required `label` contract. Compatibility aliases remain governed by the implementation reference, not new section-level APIs.

### Theme Editor

Only existing schema selectors expose registry values. Changes to the registry and static schema options require the documented validation workflow; merchants may choose an approved value or documented no-icon option but cannot upload SVG code or define arbitrary names.

## Supported States

### Present

The approved icon supports an adjacent component without duplicating its text or meaning.

### Decorative

The icon is intentionally unavailable to assistive technology because nearby content already communicates its purpose.

### Informative

The icon has a verified text equivalent and its owning component exposes the relevant state.

### Unavailable

If no approved icon accurately represents the purpose, omit it rather than selecting an approximate or decorative substitute.

## Responsive Behaviour

Icons preserve proportions, readable contrast, and touch-adjacent spacing at 320 px, browser zoom, large-text settings, and RTL layouts where direction matters. They must not be the only cue that disappears on touch devices or narrow screens.

## Accessibility

Use semantic adjacent text, accurate labels for informative icons, visible focus supplied by the interactive owner, and non-color-only meaning. Directional icons must follow document direction where applicable. Do not use raw ARIA to compensate for a missing semantic owner.

## Shopify Settings

Merchants may select an existing registry value, show or hide an optional icon, and use documented image-first/no-icon choices in eligible blocks.

The Design System controls artwork, view box, sizing scale, color inheritance, spacing, accessibility treatment, responsive behavior, and validation. Shopify schema and implementation control available values and translation keys.

## Design Tokens

Icon System uses icon-size-small, icon-size-medium, icon-size-large, icon-color-inherit, icon-gap-inline, icon-gap-control, and icon-focus-context tokens. Components select semantic token use rather than direct icon styling.

## Motion Rules

An icon may participate in a documented owner’s restrained state transition. It must not rotate, pulse, bounce, flash, or animate indefinitely for decoration. Reduced-motion preferences remove nonessential movement.

## Performance Rules

Inline renderer output avoids icon fonts, duplicate SVG markup, external requests, and runtime icon libraries. Any interactive owner initializes once and cleans up on Theme Editor section unload; icon rendering itself requires no client JavaScript.

## AI Guidelines

AI may select only a verified canonical icon whose semantic meaning matches a documented component action or state. It must reuse names, preserve decorative/informative intent, provide a text equivalent when required, and omit an uncertain icon.

AI must not invent registry entries, use icons as the only meaningful text, add decorative symbols to create visual interest, alter static schema lists, or select an integration-dependent state icon without verified source data.

## Quality Checklist

- The icon comes from the canonical registry and renderer.
- Its semantic name, intent, label, size, color inheritance, and adjacent relationship are correct.
- It does not duplicate Button, Icon Button, Badge, Status Indicator, Alert, or Validation Message ownership.
- Theme Editor values and translations are validated where the registry changes.
- The result remains legible, localizable, responsive, and performant.

## Future Compatibility

Registry expansion requires a demonstrated repeated need, semantic naming review, accessibility review, translation coverage, schema validation, and theme compatibility validation. Future refinement must preserve the single renderer, stable existing values, merchant-safe choices, and deterministic AI selection rather than creating parallel icon libraries.
