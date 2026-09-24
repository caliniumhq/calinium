# Section Heading

## Purpose

Section Heading is the reusable introductory heading group for one meaningful storefront section. It orients customers with calm hierarchy before the section’s main content, preserving product and merchant content as the focus.

It is not a page-title system, Hero, banner, card title, product title, form legend, or decorative wrapper for every heading in the storefront.

## Responsibilities

Section Heading owns an optional eyebrow, one semantic heading supplied by the parent context, optional concise supporting text, controlled alignment, and an optional directly related contextual action when an approved composition supports one.

It does not own the semantic page region, outer section spacing, page width, background, media, tabs, breadcrumbs, rich-text body content, action behavior, heading-level selection without context, or arbitrary typography styling.

## User Goals

Section Heading should help customers understand what a section contains, scan its purpose quickly, and reach a directly related destination without distracting from the content that follows.

## Merchant Goals

Section Heading should help merchants present approved section context, authentic copy, and an optional relevant action without managing typography, hierarchy, spacing, or implementation details.

## Structure

The conceptual structure is:

```text
Section Heading
├── Text group
│   ├── Eyebrow — optional
│   ├── Semantic heading — required when rendered
│   └── Supporting text — optional
└── Contextual action group — optional
```

The heading is the semantic anchor. Eyebrow remains subordinate, supporting text adds distinct context, and an action must directly relate to the introduced section. Empty wrappers and spacing gaps must not render when optional content is absent.

## Required Elements

Every rendered Section Heading requires:

- visible, meaningful heading text
- a valid parent-supplied semantic heading level
- stable logical reading order
- a clear relationship to the section content it introduces

When no valid heading exists, omit the component rather than fabricate fallback copy or render an empty heading for layout.

## Optional Elements

Section Heading may include:

- short contextual eyebrow
- one concise supporting paragraph
- one verified contextual action
- an approved action icon through Button or Icon System
- start or center alignment
- a controlled readable text measure supplied by composition
- visually hidden clarification only when a section genuinely needs a semantic label without a visible title

Additional actions require deliberate composition outside Section Heading. Supporting text must not become a full Rich Text body.

## Supported Variants

### Start Aligned

The default for functional commerce, collections, product-supporting, and information-dense sections. The current helper exposes this as the legacy `left` alignment value; its unstyled default follows normal document direction.

### Center Aligned

Used selectively for restrained editorial, trust-building, or campaign-supporting sections. It must retain a readable measure and not become the default for dense transactional content.

### Stacked

Text group appears before the optional action in logical source order. This is the current stable composition.

### Split

Heading content and one related action occupy separate wider-screen regions while preserving text-before-action source order. This is an approved future composition, not a current `section-heading` helper API.

### Controlled Density and Measure

Compact, standard, or spacious rhythm and narrow, standard, or wide measure may be supplied by the owning Section, Container, Content Wrapper, and Design System. Section Heading does not independently expose spacing or width controls.

End alignment is not a default storefront variant. Any future use requires a demonstrated design-system requirement.

## Component-Specific Rules

### Ownership and Composition

Section owns the semantic region and outer rhythm; Container owns page width; Content Wrapper owns readable measure; Stack owns internal vertical flow; Cluster owns wrapped inline action grouping; and Split owns wider-screen layout relationships.

Rich Text owns general formatted prose. Button and Icon Button own action behavior. Breadcrumbs owns hierarchy navigation. Hero owns page-leading storytelling. Image Banner is supporting editorial content. Individual cards, products, modal dialogs, and form groups own their own titles.

Section Heading must introduce one section without replacing any of those owners.

Featured Collection and Collection Grid may compose Section Heading before their listings but retain collection and product-discovery ownership. Product Information owns the product title and purchase hierarchy. Account Summary owns account-specific identity and summary content. Empty State and Error Page own their contextual headings and recovery messages. Future page documentation owns page-title composition rather than delegating it to this primitive.

### Heading Hierarchy

The parent determines the level. Current implementation accepts `h1`, `h2`, and `h3`; unsupported values safely render as `h2`. Visual size must never determine semantic level.

Homepage sections normally use `h2` unless page architecture assigns another valid level. Nested subsections may use `h3` when context requires it. Avoid skipped levels and multiple H1 values created for visual preference. Eyebrow cannot replace the heading.

### Copy and Action Rules

Eyebrow is short, contextual, non-duplicative, and not source-authored in all caps merely for styling. Heading copy is concise and descriptive. Supporting text is normally one concise paragraph that adds value, context, or scope without repeating the heading.

One contextual action may appear only with a verified destination or operation. Use a link for navigation and Button only for an in-place operation. Do not use disabled links as placeholders, duplicate an immediately available primary action, add destructive actions, or invent labels or destinations.

### Current Shopify Helper Contract

The stable helper is `apps/theme/snippets/section-heading.liquid`. It currently renders eyebrow, heading, description, `id`, `level`, legacy `left`/`center` `alignment`, small/standard/large `size`, optional `divider`, and an additional class. It renders one server-side `<header>` only when at least one of eyebrow, heading, or description is present.

The current helper has no contextual-action slot, split composition, independent density setting, or independent text-measure setting. Owning sections compose actions separately where needed. This specification does not claim those future capabilities are implemented.

### Theme Editor Rules

Text, alignment, size, and divider changes must reflect through normal section rerendering. Clearing optional fields must remove their markup without stale wrappers or links. If heading text is removed, the target behavior is to omit the component unless the section deliberately supplies a valid semantic alternative; no merchant copy may be invented for preview outside design mode.

## Supported States

### Heading Only

A valid section heading appears without optional elements.

### Eyebrow and Heading

Eyebrow adds concise context without replacing the heading.

### Heading and Supporting Text

Supporting text materially expands the section context.

### Heading and Contextual Action

One verified related action is composed by a supported owning section.

### Full Composition

All valid optional elements appear without empty wrappers or duplicated meaning.

### Missing Optional Content or Unavailable Action

Absent optional content is omitted. An action hides when its destination or capability is unavailable.

### Long Translated Content or Theme Editor Preview

Content wraps naturally, preserves source order, and uses no invented preview copy.

Section Heading has no loading, error, success, disabled-heading, carousel, or independent animated state.

## Responsive Behaviour

Section Heading is mobile-first and stacked. Split compositions collapse predictably when available inline space is insufficient, retaining text before action in source and visual order.

Headings and translated labels wrap naturally at 320 px, browser zoom, and large-text settings. Actions wrap rather than shrinking below a usable touch size. Use logical properties and RTL-safe alignment; do not use JavaScript layout measurement, forced decorative line breaks, unreadably small type, or design-specific breakpoint values.

## Accessibility

Use a native semantic heading with parent-context hierarchy, meaningful visible text, logical reading order, and a named link or button where an action exists. Actions require visible focus, keyboard access, sufficient target size, and WCAG 2.2 AA contrast.

Section Heading must not rely on eyebrow text, color, visual size, or source-order mismatch to communicate hierarchy. Do not add a landmark, live region, arbitrary heading role, duplicate accessible label, or focus movement; the surrounding Section owns landmark semantics.

## Shopify Settings

Merchants may provide approved eyebrow, heading, supporting text, action label and destination, optional action visibility, and controlled composition or density options only where an owning section supports them. Existing helper-backed sections may expose only the current `left`/`center` alignment values; logical start remains the documented design intent for future schema refinement.

The Design System controls typography, font family and weight, line height, casing, spacing, maximum measure, action styling, focus treatment, wrapping, RTL behavior, breakpoints, and motion. Shopify and parent architecture control heading level, section context, section spacing, and data source. Raw HTML, CSS, ARIA, arbitrary colors, widths, typography, heading levels, line breaks, and animation controls are not merchant settings.

## Design Tokens

Section Heading inherits approved typography, foreground, muted-text, spacing, content-measure, alignment, action-gap, responsive-stacking, and focus tokens from its parent composition.

The current helper confirms use of the shared content-width, spacing, heading-size, muted-text, border-width, and border-color token families. It must not introduce component-local visual values where system tokens already exist.

## Motion Rules

Section Heading normally renders without motion. A surrounding section may include it in one restrained coordinated entrance only when that motion is approved, does not delay reading, preserves action availability, and respects reduced-motion preferences.

Typing effects, rotating words, bouncing eyebrows, decorative text splitting, infinite animation, scroll-jacking, forced parallax, and per-child novelty animation are prohibited.

## Performance Rules

Core rendering is server-side semantic HTML with zero JavaScript requirement, no external typography or animation dependency, no layout measurement, no blocking asset, and stable initial geometry. It must not duplicate desktop/mobile heading content or action links.

### Theme Editor Lifecycle

Section Heading has no independent JavaScript controller. It relies on Shopify section rerendering and remains safe when optional settings, blocks, or links change. Any parent enhancement must initialize once, clean up its own listeners, timers, observers, and transient state on section unload, and preserve the server-rendered heading when enhancement does not run.

## AI Guidelines

AI should select Section Heading only to introduce a meaningful section, derive level from approved page hierarchy, preserve approved merchant copy and translation keys, and choose the smallest valid composition.

- Use heading only when the title is self-explanatory.
- Add supporting text only when it adds distinct concise context.
- Add one action only when a verified related destination exists.
- Use split only when an approved implementation supports it and the action benefits from separate wider-screen placement.
- Prefer start alignment for functional commerce; use center selectively for restrained editorial content.
- Omit Section Heading when another authoritative visible heading already introduces the section or no meaningful heading exists.

AI must not invent headings, eyebrows, claims, links, or destinations; choose hierarchy for visual size; duplicate page, Hero, product, collection, card, or modal titles; add multiple actions; use all caps or forced line breaks as source styling; select animation for novelty; or expose unrestricted merchant typography controls.

## Quality Checklist

- Section Heading has one clear introductory responsibility.
- Parent context supplies a correct semantic heading level.
- Heading is concise, visible, and not duplicated nearby.
- Eyebrow and supporting text add distinct verified context.
- At most one action exists, with verified destination or operation and correct semantics.
- Source order, mobile wrapping, translated text, zoom, large text, and RTL remain safe.
- Focus, touch target, contrast, and hierarchy are accessible.
- No arbitrary typography, spacing, color, action, or animation control is exposed.
- No copy, destination, or state is invented.
- Empty wrappers and stale actions do not remain after Theme Editor changes.
- AI selection remains deterministic and composes existing primitives without duplication.

## Future Compatibility

Future work may add approved size refinements, section-index labeling, localization improvements, controlled heading links, structured content sources, Shopify block nesting, or new compositions proven by repeated needs.

Extensions must not turn Section Heading into a page builder, own page-title architecture or section spacing, absorb Hero, Breadcrumbs, Rich Text, or navigation responsibility, add unrestricted styling, create competing actions, weaken semantic hierarchy, require JavaScript for core rendering, or break existing merchant settings.
