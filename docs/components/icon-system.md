# Calinium Icon Registry

## Purpose

This implementation companion records the stable Calinium One icon-renderer contract and the current approved registry. It supports the authoritative [Icon System](Foundation/icon-system.md) specification without creating a second icon component or registry.

## Responsibilities

The registry records renderer inputs, supported compatibility aliases, Theme Editor selector coverage, and schema-synchronization validation.

It does not define visual design, action ownership, feedback semantics, or a new merchant-facing component; those remain owned by Icon System and the composing component.

## User Goals

Customers should encounter consistent, labelled, accessible icons through the owning storefront component.

## Merchant Goals

Merchants should select only stable approved icon values in existing eligible Theme Editor controls and retain documented no-icon or image-first behavior.

## Structure

The registry consists of the canonical Liquid renderer, stable renderer inputs, approved values, static Theme Editor selector coverage, and the icon-schema validation workflow.

## Required Elements

Every registry use requires `snippets/icon.liquid`, one approved semantic name, an explicit decorative or informative intent, and an accessible label when the icon is informative.

## Optional Elements

Supported calls may include `size` and `label`. The compatibility aliases `name` and `aria_label` remain supported by the renderer but must not become a basis for new divergent component APIs.

## Supported Variants

### Decorative Renderer Call

Use when surrounding content already supplies the meaning.

### Informative Renderer Call

Use when an owning component supplies an accurate text equivalent.

### Theme Editor Selection

Use when an existing documented schema selector exposes the approved registry value.

## Component-Specific Rules

### Renderer Contract

`snippets/icon.liquid` is Calinium One’s only icon renderer. It renders 98 optimized `currentColor` SVGs with a shared `0 0 24 24` view box.

```liquid
{% render 'icon', icon: 'truck', size: 24, decorative: true %}
{% render 'icon', icon: 'search', size: 20, decorative: false, label: 'Search' %}
```

### Registry

| Category | Icons |
| --- | --- |
| Commerce and delivery | `cart`, `bag`, `package`, `truck`, `return`, `exchange`, `receipt`, `tag`, `gift`, `discount`, `box`, `credit-card`, `storefront` |
| Trust and security | `shield`, `shield-check`, `verified`, `lock`, `certificate`, `medal`, `guarantee`, `key` |
| Navigation and interface | `arrow-left`, `arrow-right`, `arrow-up`, `arrow-down`, `chevron-left`, `chevron-right`, `chevron-up`, `chevron-down`, `plus`, `minus`, `close`, `menu`, `search`, `filter`, `external-link`, `more-horizontal`, `more-vertical`, `check`, `info`, `alert`, `eye`, `eye-off`, `trash`, `edit` |
| Communication | `heart`, `star`, `chat`, `phone`, `email`, `share`, `account`, `bell`, `bookmark`, `thumbs-up`, `send` |
| Media | `play`, `pause`, `camera`, `image`, `gallery`, `video`, `volume-high`, `volume-mute`, `zoom-in`, `zoom-out`, `upload`, `download` |
| Brand and sustainability | `globe`, `leaf`, `recycle`, `sparkle`, `diamond`, `crown`, `factory`, `award` |
| Lifestyle | `home`, `airplane`, `suitcase`, `coffee`, `mountain`, `sun`, `moon`, `map-pin`, `calendar`, `clock` |
| Technology | `lightning`, `ai`, `robot`, `cloud`, `database`, `code`, `settings`, `wifi`, `mobile`, `desktop`, `link`, `spinner` |

### Theme Editor Coverage

Existing selectors cover Icon row → Item → Icon, Image with text → Icon/text → Icon, Marquee → Item → Icon, and Multicolumn → Column → Icon. Marquee and Multicolumn retain their documented `None` option. Icon row and Multicolumn preserve image-first rendering when a custom image is present.

### Schema Synchronization

Static schema JSON cannot read Liquid dynamically. The ordered selector values must match `iconOptions` in `scripts/validate-icon-schemas.js`; that validator checks renderer support, coverage, duplicate values, labels, translations, defaults, legacy values, and order. Additions require a renderer branch, registry entry, translation, applicable selector update, icon-schema validation, and Theme Check.

## Supported States

### Supported

The value is present in the renderer and required static selectors where applicable.

### Decorative

The rendered output is hidden from assistive technology because nearby content supplies the meaning.

### Informative

The output has an accurate label supplied by its owner.

### Unavailable

An absent value must be omitted or handled by the owning component’s safe fallback; it must not be approximated by an unrelated icon.

## Responsive Behaviour

Registry values render through the canonical scalable SVG contract. The owning component controls semantic size and responsive placement; registry values must not introduce direction, overflow, or touch-only ambiguity.

## Accessibility

The renderer distinguishes decorative from informative output. Informative icons require a meaningful label; decorative icons must not duplicate adjacent text. No registry value alone communicates an essential action, error, status, or instruction.

## Shopify Settings

Merchants can choose only approved existing values in supported selectors. The registry, renderer contract, labels, translations, accessibility behavior, and selector list remain system-controlled. Raw SVG, arbitrary icon names, and raw ARIA controls are not merchant settings.

## Design Tokens

The registry inherits Icon System size, color, gap, and focus-context tokens through its owning component. It declares no independent visual tokens.

## Motion Rules

The registry has no independent motion. Any animation is governed by the documented composing component and must respect reduced-motion preferences.

## Performance Rules

The renderer ships no storefront JavaScript and avoids external icon requests. The validator is development tooling only and is not referenced by theme assets.

## AI Guidelines

AI may select only an existing registry value for a verified supported action or state, through the canonical renderer and documented owner. It must preserve the renderer contract, accessible intent, selector coverage, and no-icon fallback.

AI must not invent names, alter registry or schema data, expose implementation tooling to merchants, or use an icon to fabricate merchant content, status, or an integration.

## Quality Checklist

- The name exists in the registry and canonical renderer.
- Decorative or informative intent and any label are accurate.
- The owning component retains action, state, and feedback responsibility.
- Existing Theme Editor selectors, translation keys, and validation remain synchronized.
- No additional client bundle, SVG duplication, or raw merchant markup is introduced.

## Future Compatibility

This companion may record validated renderer and schema changes while Icon System remains the authoritative component specification. Future changes must retain stable values and aliases where supported, add only demonstrated semantic icons, and preserve a single deterministic registry rather than creating parallel or merchant-editable icon sets.
