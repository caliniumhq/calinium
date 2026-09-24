# Section Specifications

## Purpose

This document establishes the authoritative foundation for Calinium’s canonical Shopify Section Specification phase. A canonical Section Specification defines one reusable Shopify Online Store 2.0 section that Calinium may compose, configure, validate, and select deterministically.

It documents the section’s purpose, responsibilities, structure, blocks, settings, data dependencies, variants, states, responsive behavior, accessibility, SEO boundaries, performance, Theme Editor behavior, and deterministic AI selection rules.

A Section Specification does not replace a Page Specification, Component Specification, future Block Specification, theme architecture, merchant strategy, Shopify source-of-truth data, or a raw reference/requirement brief. It defines the bounded behavior of one merchant-configurable region after that region has been classified and audited.

## Documentation Layers

Calinium maintains three distinct documentation and implementation layers.

### Reference or Requirement Brief

A Reference or Requirement Brief captures early source material, including:

- business intent;
- feature idea;
- inspiration;
- merchant value;
- rough settings;
- high-level dependencies.

It may be concise, exploratory, feature-led, family-level, or implementation-adjacent. It is valuable evidence, but it does not automatically define canonical ownership, a stable schema, safe settings, block limits, or an implemented capability.

### Canonical Section Specification

A Canonical Section Specification defines the approved reusable contract for a classified section. It records:

- exact ownership and boundaries;
- Shopify context;
- structure and hierarchy;
- settings and blocks;
- variants and states;
- accessibility and performance;
- Theme Editor governance;
- AI selection and omission rules;
- implementation evidence and known gaps.

It is the governance layer between a brief and runtime implementation. It must be explicit, deterministic, implementation-aware, and safe for merchants, customers, presets, and future generation.

### Runtime Implementation

Runtime Implementation contains the actual theme behavior:

- Liquid;
- schema;
- CSS;
- JavaScript;
- assets;
- template assignments.

Runtime code is evidence for what currently exists. It does not silently become a complete specification, and a specification does not claim a runtime capability until the audit identifies source evidence.

```text
Brief ≠ Specification ≠ Implementation
```

Each layer informs the next, but none is equivalent to another. A brief can remain source material only; a specification can require future hardening; and implementation can expose a capability that is not yet approved for page composition or AI selection.

## Relationship to Existing Section Briefs

The existing Markdown library in `docs/sections/` is preserved exactly where it is. These files are valuable section-related briefs, feature concepts, requirement summaries, composition packs, and source evidence. They must not be renamed, relocated, overwritten, or silently reclassified by this README.

Before a future canonical document is created, each existing brief must be audited to determine whether it represents:

- a standalone section;
- a section family;
- a variant;
- a composition pack;
- a global theme area;
- a page pattern;
- a component group;
- a commerce behavior;
- an implementation requirement;
- a duplicate or overlapping concept.

No existing filename proves that it is a standalone Shopify section. For example, `awards-certifications.md` is a concise requirement brief with useful purpose, block, asset-truth, accessibility, performance, and composition evidence. It still requires a full implementation, schema, component, page-role, settings, block-limit, lifecycle, and overlap audit before it can become a canonical specification.

Existing briefs remain source material even when a future canonical specification is created. The canonical document must identify the relevant brief or briefs in its Implementation Audit, explain any changed interpretation, and preserve the evidence trail. A brief can also remain source material only when no canonical section is justified.

## Architecture Hierarchy

Calinium documentation and runtime decisions follow this hierarchy:

```text
Philosophy
↓
Design Principles
↓
Design System
↓
Components
↓
Pages
↓
Sections
↓
Blocks
↓
Theme Architecture
↓
Merchant Intelligence
↓
AI Generation Rules
↓
Presets
↓
Verification
```

Pages define what a storefront destination must achieve: customer purpose, required regions, ordering, H1 ownership, page-level SEO, and conversion flow. Sections assemble meaningful regions inside those page compositions. Blocks compose repeatable content units inside sections. Components implement reusable primitives and do not surrender their behavior to each section that uses them.

Theme Architecture defines runtime placement, templates, section groups, schema constraints, and global surfaces. Merchant Intelligence provides approved merchant inputs and resource truth. AI Generation Rules select only documented and verified capabilities. Presets combine approved sections, variants, blocks, and tokens. Verification confirms that the resulting storefront remains accurate, accessible, performant, and compatible.

## Section Definition

A Shopify section is a reusable, merchant-configurable page region with:

- a clear purpose;
- bounded responsibilities;
- a Liquid implementation;
- a Shopify schema;
- settings;
- optional blocks where they add real composition value;
- responsive behavior;
- accessibility behavior;
- Theme Editor lifecycle behavior.

Not every visual region requires a standalone section. A section exists only when it provides meaningful merchant configurability, reuse, composition value, or page-level responsibility. A one-off layout detail may be a component, a block, a snippet, a global surface, a page rule, or an implementation concern instead.

Sections should be independently reusable but must not be selected merely because their schema permits placement. Technical availability is not a page-composition recommendation.

## Section Ownership

A canonical section may own:

- local layout;
- local content hierarchy;
- section settings;
- block ordering;
- supported blocks;
- section-local interactions;
- responsive composition;
- local accessibility behavior;
- Theme Editor lifecycle;
- local progressive enhancement;
- section-level empty states.

Ownership is local and bounded. A section specifies how its own region works once a Page Specification, approved strategy, or merchant composition has selected it. It must name every component, Shopify object, integration, or global setting on which it depends.

## Section Boundaries

Sections must not own:

- an entire storefront page;
- Shopify checkout;
- Shopify account systems;
- authoritative Shopify data;
- unrelated global navigation;
- global theme architecture;
- arbitrary business logic;
- unsupported integrations;
- fabricated merchant content;
- components that belong to the shared component layer;
- AI strategy outside the section’s selection rules.

Header, Footer, Announcement Bar, Cart Drawer, localization controls, predictive search, and similar global surfaces may require a separate architecture classification. They are not automatically ordinary page sections simply because they use Shopify section files or section groups.

Sections also must not create page-level H1, canonical URL, global metadata, Product, Article, Collection, Organization, Breadcrumb, or WebPage schema ownership unless a Page Specification and centralized runtime rule explicitly establish that ownership.

## Section Categories

The following categories are provisional targets for future canonical Section Specifications:

| Category | Responsibility |
| --- | --- |
| `foundation/` | Structural, compositional, or shared section-level foundations that are not merely components or global settings. |
| `content/` | Merchant-authored explanatory, informational, FAQ, newsletter, and general content regions. |
| `commerce/` | Product discovery, merchandising, recommendation, comparison, bundle, and commerce-support regions. |
| `media/` | Image, video, gallery, mosaic, lookbook, and other media-led regions with distinct merchant composition. |
| `editorial/` | Story, journal, process, material, craft, founder, team, timeline, and narrative regions. |
| `marketing/` | Approved campaign, promotion, lead, conversion-support, or announcement regions with strict truth and urgency limits. |
| `social/` | Verified testimonials, social proof, community, review-adjacent, and social-content regions. |
| `navigation/` | Section-level navigation, discovery, or wayfinding regions that are not global navigation architecture. |
| `forms/` | Merchant-configurable Shopify-native form regions such as contact or newsletter, without owning account or application backends. |
| `utility/` | Bounded supporting regions whose responsibility is neither generic component behavior nor a complete page. |
| `system/` | System-facing regions, recovery, global architecture classifications, or platform-state surfaces with verified Shopify scope. |

These categories are provisional until the existing brief library and current implementation are audited. Files are categorized by responsibility, not by a marketing name, historical filename, visual treatment, or assumed theme placement.

## Folder Structure

The target canonical structure is:

```text
docs/
  sections/
    README.md
    foundation/
    content/
    commerce/
    media/
    editorial/
    marketing/
    social/
    navigation/
    forms/
    utility/
    system/
```

Existing briefs remain preserved in their current `docs/sections/` location. Future canonical specifications will be created under an appropriate category directory only after classification. No canonical document may overwrite a source brief, and no source brief is moved merely to make the target structure look complete.

When relevant, each future canonical document must link or name its source brief or briefs in the Implementation Audit. A canonical filename must use a stable, responsibility-led kebab-case name; it must not depend on a merchant, template instance, store identifier, campaign, or generated artifact.

## Canonical Section Template

Every future Canonical Section Specification must use this exact template. It contains one H1 and 25 ordered H2 sections—26 headings in total.

```markdown
# Section Name

## Purpose

## Customer Goals

## Merchant Goals

## Shopify Context

## Responsibilities

## Boundaries

## Section Structure

## Required Blocks

## Optional Blocks

## Block Composition

## Component Dependencies

## Content Rules

## Asset Requirements

## Supported Variants

## Supported States

## Theme Editor Settings

## Responsive Behaviour

## Accessibility

## SEO and Structured Data

## Performance Rules

## Motion Rules

## AI Guidelines

## Implementation Audit

## Quality Checklist

## Future Compatibility
```

No deviation is permitted unless this README is intentionally revised in a separate documentation-governance task. A section may state that a heading is not applicable, but it must not omit, merge, rename, or reorder a heading.

## Required and Optional Sections

Page composition classifies sections as:

| Classification | Meaning |
| --- | --- |
| Required | Necessary for a page’s core customer purpose and supported by a safe implementation. |
| Recommended | Usually useful when approved content and page context support it, but not mandatory. |
| Optional | Improves comprehension, trust, or discovery only when evidence exists. |
| Context-dependent | Appropriate only for specific page types, merchant goals, content states, or customer tasks. |
| Integration-dependent | Requires verified Shopify or third-party capability, approved data, and a safe omission path. |
| Prohibited | Would duplicate a page purpose, break architecture, create unsupported behavior, or violate content/accessibility/performance rules. |

Classification depends on page type, merchant goals, approved content, available assets, Shopify capabilities, integration availability, accessibility, performance, and conversion priorities. A section is never required merely because it exists in the brief library, runtime directory, a preset, or Theme Editor.

## Section Instance Rules

Every future specification must classify its placement and repetition behavior as applicable:

| Instance rule | Meaning |
| --- | --- |
| Single-instance | One instance may appear in a defined page or global context. |
| Repeatable | Multiple instances can appear when each has a distinct documented role. |
| Merchant-repeatable | A merchant may add repeated instances through Theme Editor within documented limits. |
| System-repeatable | Theme/runtime composition may repeat an instance under controlled rules, not arbitrary merchant duplication. |
| Mutually exclusive | Selecting one section or variant prevents another because their purpose or implementation overlaps. |
| Conditionally exclusive | Sections can coexist only when documented page context, asset, hierarchy, and performance conditions are satisfied. |

Every future Section Specification must state whether it can appear more than once, maximum recommended instances, unsafe duplication cases, page-context constraints, ordering constraints, and the safe result when duplicated content is unsupported.

## Section and Block Relationship

Sections compose Blocks. Blocks never own Sections.

Sections define allowed block types, their ordering, quantity limits, visible hierarchy, and section-level fallback when a block lacks required content. Blocks define reusable content units within that bounded section context. A block does not independently select pages, create its own section schema, own global state, or assume that an identically named setting in another section has the same meaning.

Block documentation will be created in the next phase. Until then, a canonical Section Specification must not invent block types unsupported by current implementation or approved architecture. It must distinguish existing runtime blocks from planned blocks and state the implementation gap clearly.

## Section and Component Relationship

Sections orchestrate local layout and merchant configuration. Components provide reusable interface primitives.

A section may depend on documented components for fields, buttons, responsive media, cards, disclosures, navigation, feedback, layout, localization, and accessible controls. It must not duplicate Component Specifications, redefine component semantics, or use Custom Liquid to bypass a component’s accessibility, motion, performance, or Shopify-native behavior.

Every Section Specification must list component dependencies and explain why each is used. Component behavior remains governed by the component layer; a section owns only its local composition and settings.

## Page Composition Relationship

Page Specifications determine:

- why a section belongs on a page;
- the section’s role;
- ordering;
- page-level hierarchy;
- H1 ownership;
- page-level SEO ownership;
- page-level conversion flow.

Section Specifications determine:

- how a section behaves once selected;
- which settings and blocks it exposes;
- how it responds;
- how it remains accessible and performant.

A Section Specification does not independently decide that it belongs on a page, change the page’s H1 owner, replace a mandatory main section, or alter page-level metadata. The Page Specification and approved merchant strategy decide selection; the section contract governs the selected region.

## Theme Editor Governance

Canonical specifications must document Theme Editor behavior for adding, removing, reordering, duplicating, presets, defaults, app blocks, section IDs, block IDs, lifecycle events, cleanup, design mode, disabled sections, empty states, and merchant preview behavior.

- Adding must expose only an approved section category and page context.
- Removing must preserve page function; mandatory functional regions cannot become optional through Theme Editor.
- Reordering must respect page-level hierarchy, commerce flow, H1 ownership, and ordering constraints.
- Duplicating must follow the Section Instance Rules and never create duplicate section purpose, IDs, schema ownership, or unsafe asset load.
- Presets must compose documented sections, variants, blocks, and safe defaults; they do not create merchant facts or override approvals.
- Section and block IDs remain Shopify/runtime identifiers, not merchant-facing configuration or AI-generated content.
- App Blocks are conditional on a verified app capability, merchant approval, accessible fallback, performance budget, and safe omission.
- Design mode placeholders are clearly non-merchant preview states and must not become storefront claims.
- Disabled sections require an explicit page/preset rationale and must not hide mandatory functionality.

JavaScript-enhanced sections must initialize safely, avoid duplicate initialization, and clean up listeners, observers, timers, media playback, temporary DOM state, and stateful controls on section load, unload, select, deselect, block select, block deselect, reorder, and settings refresh.

## Settings Governance

Settings must be necessary, understandable, bounded, stable, deterministic, merchant-safe, and compatible with Shopify schema constraints.

Future specifications must distinguish:

| Setting owner | Meaning |
| --- | --- |
| Section settings | Bounded configuration for the section as a whole. |
| Block settings | Bounded configuration for one allowed repeatable content unit. |
| Global theme settings | Shared system behavior such as tokens, color schemes, typography, or broad theme preferences. |
| Shopify-owned data | Product, Collection, Blog, Article, cart, localization, routes, Page, and platform facts. |
| Integration-owned data | Verified optional app or external capability data with a safe failure boundary. |

Settings must not include redundant controls, purely technical labels, contradictory choices, hidden dependencies, excessive decorative controls, unsupported behavior, or unstable IDs without migration planning. They expose merchant intent, content, and approved bounded choices—not DOM, ARIA, CSS, JavaScript, raw schema, or platform-internal implementation details.

## Content and Asset Truth

Every canonical section requires real merchant content, real Shopify data, approved merchant assets, verified links, and verified awards, certifications, claims, dates, people, locations, products, collections, and integrations.

Merchant-only facts must be marked explicitly as merchant-controlled. AI must omit unsupported content rather than fabricate it. A section must not convert a placeholder, source brief, design-mode sample, empty field, inferred industry convention, or generic luxury phrase into a merchant fact.

Every Asset Requirement must identify source, ownership, purpose, accessibility treatment, performance role, approval requirement, and safe no-asset behavior. A section can omit optional media or use a documented non-factual placeholder state; it cannot invent an image, video, product, route, logo, certificate, person, or claim.

## Supported Variants

Variants are functional and deterministic. They are not decorative marketing names without behavioral meaning.

Variant selection can depend on:

- available content;
- asset quantity and quality;
- merchant goal;
- page context;
- product count;
- text length;
- content hierarchy;
- device constraints.

Every future Section Specification must define selection criteria, required dependencies, prohibited contexts, safe fallback, and merchant-review posture for each variant. Variants must preserve the same canonical responsibility; if a proposed variation changes the customer task, data model, runtime behavior, or page role materially, it may require a different section, composition pack, or Page Specification instead.

## Supported States

Every Section Specification must document only the states applicable to its actual and planned role, such as:

- empty;
- partially configured;
- fully configured;
- loading;
- unavailable data;
- integration unavailable;
- error;
- localized;
- RTL;
- reduced motion;
- Theme Editor;
- no JavaScript;
- stale data;
- sold out;
- pagination;
- filtered;
- disabled.

States remain source-truthful. Loading is not empty; unavailable is not error; partial is not complete; and a safe placeholder is not merchant content. A future specification must explain the visible result, accessible feedback, safe fallback, and whether the state is implemented, planned, Shopify-owned, or integration-owned.

## Responsive Behaviour

Every canonical section must be mobile first and support from 320 px upward. It must document:

- logical source order;
- no horizontal overflow;
- translated-text resilience;
- large-text resilience;
- RTL support;
- touch-safe controls;
- responsive images;
- readable media and tables.

Specifications must identify desktop-to-mobile composition changes, which controls stack or move, how media adapts, and what remains visible first. CSS visual ordering must not make the content read differently for keyboard or screen-reader users. A wide desktop composition is never justification for hiding a required customer task on a narrow screen.

## Accessibility

Canonical Section Specifications target WCAG 2.2 AA. Every specification must audit applicable requirements for:

- heading hierarchy;
- landmarks;
- semantic structure;
- keyboard interaction;
- focus;
- labels;
- instructions;
- errors;
- live feedback;
- media alternatives;
- motion;
- contrast;
- touch targets;
- zoom;
- RTL;
- no-JavaScript behavior.

The section must use the least disruptive semantic and live-feedback pattern. It cannot rely on colour, icons, motion, hover, visual order, or JavaScript alone. Optional integrations and Custom Liquid require the same standard and cannot weaken the accessible baseline.

## SEO and Structured Data

Most sections do not independently own page-level SEO or structured data. Every Section Specification must document whether it contributes indexable content, heading constraints, internal-link behavior, image alternative text, duplicate-content risk, and schema ownership boundaries.

Sections must not emit competing Product, Article, Collection, Organization, Breadcrumb, WebPage, Blog, Search, Review, AggregateRating, Offer, or other schema without an explicit centralized ownership rule. A Section Specification must distinguish current source evidence from a future schema proposal and require every structured-data field to match verified visible content.

Section headings begin below the page-level H1 unless the Page Specification explicitly assigns the H1 owner. Internal links must resolve to verified destinations, and a section must not use hidden keywords, duplicate content, misleading labels, or fabricated metadata to influence indexing.

## Performance Rules

Every canonical section must document:

- LCP implications;
- CLS prevention;
- responsive images;
- lazy loading;
- eager-loading exceptions;
- video restraint;
- JavaScript restraint;
- progressive enhancement;
- lifecycle cleanup;
- third-party integration cost;
- duplicate-section cost;
- rendering stability.

Sections should server render meaningful content, preserve useful no-JavaScript behavior, reserve media geometry, use Shopify-native responsive delivery, and defer optional media or integrations. Eager loading and high fetch priority are exceptional decisions for a verified first-view LCP candidate, not a default.

Every specification must identify whether duplication, autoplay, observers, timers, app embeds, external video, recommendations, galleries, or dynamic data add cost. It must state the safe behavior when the enhancement is absent or fails.

## AI Generation Rules

For every section, AI must decide deterministically:

- include or omit;
- page placement;
- ordering;
- variant;
- settings;
- block types;
- block count;
- content density;
- asset assignment.

AI may use only approved merchant inputs, Shopify data, documented capabilities, verified integrations, documented design tokens, Page Specifications, Section Specifications, and future Block Specifications. The current generated section-capability catalog describes accepted runtime settings and blocks; it does not authorize a section’s placement or the population of merchant-facing content.

AI must never invent merchant claims, awards, certifications, testimonials, people, dates, products, collections, assets, routes, settings, app capabilities, Shopify capabilities, or integration results. It must not bypass merchant approval, immutable snapshots, page constraints, component boundaries, setting ownership, accessibility, performance, or safe omission. The same approved inputs and versioned contracts must produce the same selected section configuration and traceable rationale.

## Implementation Audit Requirements

Before creating a Canonical Section Specification, the author must inspect:

- relevant source briefs;
- Liquid;
- schema;
- section settings;
- block settings;
- presets;
- templates using the section;
- snippets;
- components;
- CSS;
- JavaScript;
- Theme Editor lifecycle;
- localization;
- accessibility;
- SEO;
- structured data;
- performance;
- progressive enhancement;
- current implementation gaps.

The audit must also inspect the generated section-capability profile, implementation rules, Page Specifications, and relevant merchant/AI content classifications where they govern an existing source. Current behavior is always separated from the target specification. No feature may be claimed without implementation evidence, and no existing schema setting may be represented as a recommended AI or merchant choice without a documented authority boundary.

## Conversion Workflow

Every existing brief follows this conversion workflow:

```text
Existing Brief or Requirement
↓
Classification
↓
Overlap and Duplicate Audit
↓
Current Implementation Audit
↓
Page Responsibility Mapping
↓
Component Dependency Mapping
↓
Canonical Section Specification
↓
Validation
↓
Future Block Specification
↓
Implementation Hardening
```

For each existing brief, the classification step must first decide whether it becomes:

- one canonical section;
- multiple canonical sections;
- a variant;
- a composition pack;
- a component reference;
- a global architecture document;
- a preset input;
- a deprecated duplicate;
- source material only.

The workflow is omission-first. A brief is not converted solely because a similarly named Liquid file exists, and a runtime section does not force a new canonical document until its purpose, page role, overlap, settings, blocks, accessibility, performance, and AI selection boundaries are clear.

## Validation Standard

Every future Canonical Section Specification must report:

**A. File created**

**B. Files modified**

**C. Source briefs inspected**

**D. Implementation files inspected**

**E. Classification**

**F. Canonical template validation**

**G. Ownership**

**H. Boundaries**

**I. Required blocks**

**J. Optional blocks**

**K. Settings**

**L. Component dependencies**

**M. Variants**

**N. States**

**O. Responsive behaviour**

**P. Accessibility**

**Q. SEO and structured data**

**R. Theme Editor behavior**

**S. Performance**

**T. AI generation rules**

**U. Current implementation findings**

**V. Implementation gaps**

**W. Founder decisions**

**X. Readiness**

Validation must confirm exact canonical-heading order, source-brief preservation, implementation evidence, responsibility classification, ownership boundaries, stable setting/block identifiers, applicable states, page constraints, no-fabrication rules, Theme Editor lifecycle safety, and documented omission/fallback behavior. A canonical specification is not complete merely because a Markdown file exists.

## Future Roadmap

The Section Specification phase follows this roadmap:

```text
Section Foundation
↓
Existing Brief Classification
↓
Canonical Section Specifications
↓
Block Specifications
↓
Theme Architecture
↓
Merchant Intelligence
↓
Generation Rules
↓
Preset Specifications
↓
Verification Engine
↓
Calinium AI
```

The immediate next task is classification of the existing brief library, not bulk conversion or implementation change. Classification should identify duplicates, packs, families, global surfaces, and source-only materials before any category directory is populated.

## Quality Checklist

- [x] Existing section briefs remain preserved in their current location and are not renamed, moved, or overwritten.
- [x] Briefs, Canonical Section Specifications, and Runtime Implementation are explicitly distinct.
- [x] The framework prevents unsupported assumptions and requires current implementation evidence.
- [x] Section ownership and boundaries are explicit, including global-surface classification.
- [x] The canonical template is defined as one H1 plus 25 ordered H2 sections.
- [x] Provisional responsibility-led categories and target canonical folder structure are defined.
- [x] Block, Component, Page, template, preset, and AI relationships are explicit.
- [x] Theme Editor and settings governance include IDs, duplication, lifecycle, design mode, app blocks, and safe defaults.
- [x] WCAG 2.2 AA, responsive, no-JavaScript, SEO/schema, and performance requirements are defined.
- [x] Deterministic AI selection, asset truth, merchant approval, and no-fabrication rules are defined.
- [x] Implementation audit, conversion workflow, and validation-standard reporting are defined.
- [x] The repository is ready for the first existing-section-library classification task.
