# Calinium Design DNA

## 1. Purpose

This document is the canonical product contract for Calinium Design DNA: the bounded, deterministic layer that turns approved merchant understanding into a coherent visual direction.

```text
Merchant understanding
+ approved brand intent
+ industry and catalog context
+ approved strategy
+ approved preset
+ approved resource suitability
→ normalized Design DNA
→ later compilation into validated Calinium One capabilities
```

Design DNA answers one question: **How should this merchant's storefront feel and behave visually?** It governs visual relationships, emphasis, density, rhythm, and treatment. It does not own merchant content, approval records, Shopify data, runtime serialization, or generation.

This is product architecture, not an implementation, schema, prompt, settings catalog, or authorization to change the theme. It defines what a future normalized Design DNA contract must mean and the limits within which later systems may implement it.

## 2. Governing Product Contracts

Design DNA is subordinate to, and must remain consistent with, these governing product contracts:

- [Calinium Customer Journey](customer-journey.md) governs the merchant journey, modes, approvals, paid action, delivery, and prohibition on automatic theme publication or updates.
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md) governs Conversation, Live Preview, Decisions, preview states, refinement, accessibility, and recovery.
- [Calinium AI Behaviour](ai-behaviour.md) governs recommendation behavior, confidence, uncertainty, correction, truth, and merchant control.
- [Automatic Merchant Intake](automatic-merchant-intake.md) governs upstream business understanding, source authority, structured observations, and questions remaining.
- [Recommended Resource Set](recommended-resource-set.md) governs resource eligibility, ranking, approval, staleness, suitability, and immutable handoff.

Executable architecture constrains what Design DNA can later compile. The inspected sources are the current brand-personality, design-language, industry-profile, layout-recipe, page-blueprint, section-mapping, setting-mapping, compatibility, section-manifest, and six-preset registries; the Calinium One Theme Editor schema and current settings data; the design-system documents under `docs/Design/`; and canonical section governance under `docs/sections/`.

These layers retain separate authority:

```text
Product contracts
→ define behavior and ownership

Approved merchant records
→ define truth and consent

Registries, page and section specifications
→ define supported choices and compatibility

Shopify runtime schemas
→ define executable values
```

If this document appears to authorize a fact, resource, setting, section, or behavior that a governing contract or executable capability does not support, the stricter authority governs and the unsupported outcome is omitted or safely defaulted.

## 3. Definition of Design DNA

Design DNA is a versioned set of normalized visual-intent decisions. Each decision has a bounded state, confidence, provenance, compatibility status, safe fallback, and relationship to an existing capability family. Together, the decisions describe a storefront direction without embedding content or runtime implementation.

Design DNA owns:

- visual hierarchy among brand, product, story, proof, and conversion;
- typography, spacing, layout, grid, color, media, image-treatment, motion, shape, and surface direction;
- commerce, editorial, and information density;
- section and page rhythm within approved composition rules;
- responsive, accessibility, and performance constraints;
- controlled variation inside an approved preset;
- traceable recommendation confidence, provenance, fallback, and revision behavior.

Design DNA does **not** own:

- a second preset system or cross-preset style mixer;
- arbitrary CSS, Liquid, JavaScript, HTML, Shopify JSON, template IDs, section IDs, block IDs, or setting IDs;
- theme forks, new runtime controls, unverified schema values, or generated package files;
- merchant facts, copy, captions, claims, destinations, product relationships, prices, evidence, or approvals;
- Approved Block Plans, resource snapshots, resource ranking, image generation, or content generation;
- direct mutation of Shopify settings or an existing theme;
- imitation of another brand or website pixel for pixel;
- generation, installation, upload, publication, or automatic update of a theme.

## 4. Relationship to Presets

A preset is the approved coherent design foundation. Design DNA is the merchant-specific variation allowed **inside** that foundation.

The current production registry, `config/calinium-storefront-presets.json`, contains exactly six active presets: Atelier, Maison, Gallery, Ritual, Essential, and Signal. Each already defines compatible industries, personalities, design languages and recipes; global-setting defaults; section defaults; content requirements; omissions; incompatibilities; performance budgets; motion policy; and fallbacks. Those preset boundaries are authoritative. The older conceptual categories in `docs/Design/presets.md` remain useful design theory, but they are not additional production preset identities.

Design DNA may vary a preset's flexible characteristics when approved merchant intent and resources justify the change. It may not replace fixed characteristics, introduce a forbidden combination, turn one preset into another, or blend presets during Beta. If the requested variation exceeds the approved preset boundary, Calinium must recommend a compatible preset change or ask one focused outcome question; it must not stretch the current preset invisibly.

Preset recommendation and approval remain separate from Design DNA normalization. A high-confidence DNA candidate is still a proposal, not preset approval. Until the governing open decision changes, Quick Start may not silently approve a preset.

## 5. Relationship to Strategy

Approved Store Strategy defines the intended customer and merchant outcomes: industry context, brand personality, design language, typography and spacing direction, color and image strategy, motion, conversion posture, page blueprint, homepage recipe, section selection, and ordering. Design DNA translates those approved outcomes into a more complete visual relationship model.

The current strategy-to-setting registry intentionally classifies mappings as full, partial, or unsupported:

- spacing, blueprints, homepage recipes, section selection, and section ordering have direct supported composition or setting relationships;
- personality, design language, typography, color, image strategy, motion, and conversion are partial because no single theme setting can represent the whole concept;
- industry remains strategy context rather than a standalone Shopify setting.

Design DNA must preserve these distinctions. It cannot make a partial mapping appear complete, turn industry into a runtime value, choose a licensed font merely from a profile label, manufacture photography style, or populate evidence-dependent sections. The approved strategy is an input; Design DNA neither rewrites it nor converts provisional or rejected decisions into approved ones.

## 6. Relationship to Merchant Intake

Automatic Merchant Intake supplies source-aware candidates and confirmed inputs concerning the business, industry, audience, catalog, brand personality, design language, commerce posture, homepage strategy, media suitability, conflicts, confidence, and questions remaining.

Intake observations influence Design DNA only according to their authority:

- explicit merchant intent may become an approved input through the existing review lifecycle;
- Shopify is authoritative for current products, collections, menus, files, themes, and other store resources;
- public-website analysis is optional and supplemental;
- model interpretation is a candidate observation, never merchant truth or approval;
- missing or conflicting information lowers confidence rather than inviting invention.

Design DNA should ask no question that Shopify or an existing approved answer already resolves. When a material visual intent remains Low or Unknown, it may request one outcome-oriented answer, such as whether the merchant wants a calmer or more product-forward experience. It should not ask for raw fonts, colors, grid counts, or setting values unless the merchant deliberately enters Advanced mode.

## 7. Relationship to Recommended Resources

The Recommended Resource Set owns which real resources are eligible, ranked, approved, current, accessible, responsive, performant, and available for a role. Design DNA owns how an approved resource should participate in the visual system.

For example, the resource system may approve a hero image; Design DNA may recommend an immersive or contained treatment. It may not change the image's identity, invent its meaning, infer a product association, crop away its subject without approved focal information, or treat a workshop photograph as evidence of handmade production.

Resource quality and availability may constrain media prominence, crop direction, section density, and fallback. They may never establish merchant facts. If an approved resource is stale, unavailable, incompatible, or missing an accessibility requirement, the resource contract governs replacement or omission before Design DNA compilation.

Ordinary eligible resource recommendations may participate in bulk review under the Recommended Resource Set contract. Sensitive evidence and claims remain individually confirmed. Whether `Preview theme` remains a resource slot or becomes a separate preset/preview decision is an open product question and is not resolved here.

## 8. Relationship to Shopify Runtime

Design DNA remains theme-aware but runtime-independent. A future compiler may translate a normalized state only into existing validated Calinium One controls and section configurations. It must reject or safely omit any state without a verified mapping.

The current runtime exposes these relevant global setting families:

| Design area | Verified current setting family | Boundary |
| --- | --- | --- |
| Brand | `logo`, `logo_width`, `favicon` | Resource ownership and brand identity remain merchant/Shopify controlled. |
| Color | `color_schemes`, `default_color_scheme` | Scheme selection exists; palette values are merchant-owned and accessibility-gated. |
| Typography | `type_heading_font`, `heading_scale`, `heading_line_height`, `heading_letter_spacing`, `type_body_font`, `body_scale`, `body_line_height` | Profile labels do not authorize arbitrary fonts or imports. |
| Layout and spacing | `page_width`, `content_width`, `mobile_gutter`, `desktop_gutter`, `section_spacing`, `grid_gap` | Values must remain inside the live schema and preset/strategy precedence. |
| Shape | `button_radius`, `card_radius`, `media_radius`, `input_radius`, `button_text_transform` | No unsupported shape or shadow control may be implied. |
| Motion | `enable_motion`, `motion_duration` | Section-level animation is used only where that section's schema supports it; reduced motion remains mandatory. |

Layout recipes, page blueprints, compatibility rules, the section capability manifest, canonical section specifications, and each live section schema govern composition and local settings. The runtime—not the conceptual DNA vocabulary—decides whether a particular option exists.

Design DNA should not store runtime setting IDs in its theme-agnostic meaning. A mapping layer may cite them and validate them later. Existing merchant-approved settings retain precedence over a recommendation; schema defaults provide the last safe runtime fallback. No Design DNA decision authorizes Liquid, CSS, JavaScript, source-template, or Theme Editor schema changes.

## 9. Design DNA Principles

1. **One coherent direction.** Recommend a complete visual relationship, not a pile of independent style choices.
2. **Preset identity is durable.** Variation stays inside fixed, flexible, forbidden, and fallback preset boundaries.
3. **Content and style are separate.** A visual direction cannot create facts, claims, evidence, copy, or resources.
4. **Recommend before configuring.** Calinium proposes the strongest bounded direction and reveals detail only when useful.
5. **Merchant authority is explicit.** Approved choices and corrections are preserved and never silently overridden.
6. **Safety and accessibility are hard gates.** They override aesthetic preference and are not confidence-weighted options.
7. **Resource truth governs media.** Only approved, current, role-eligible resources can reach generated output.
8. **Omission beats fabrication.** Missing evidence reduces storytelling density instead of producing filler.
9. **Products retain clarity.** Visual identity must not hide product understanding or safe purchase actions.
10. **Restraint beats novelty.** Variation should improve fit, not chase trends or demonstrate model creativity.
11. **Runtime capability is finite.** Conceptual intent compiles only through verified existing controls.
12. **Responsive means adaptation.** Mobile hierarchy is reconsidered, not merely shrunk.
13. **Performance is design.** Media, motion, density, and section rhythm respect current budgets and measured reality.
14. **Every result is traceable.** Confidence, provenance, version, fallback, and revision are part of the decision contract.
15. **Same approved inputs mean the same result.** Final normalization is deterministic even if AI helped interpret candidate intent.

## 10. Design DNA Dimensions

One normalized Design DNA direction comprises these bounded dimensions:

| Group | Dimensions | Responsibility |
| --- | --- | --- |
| Foundation | Typography, spacing, layout, grid, visual hierarchy, color, shape and surface | Establish the core visual system. |
| Media | Media, image treatment, motion, hero | Establish how approved visual resources lead and transition. |
| Discovery and pages | Navigation, product discovery, product page, collection page | Establish browse and decision emphasis without changing Shopify data. |
| Narrative and trust | Editorial storytelling, trust and proof | Establish evidence-dependent narrative presence and proof hierarchy. |
| Commerce | Conversion, commerce density | Establish the visibility and frequency of safe commercial actions. |
| Density and rhythm | Editorial density, information density, section rhythm, page rhythm | Establish pacing, repetition, and cognitive load. |
| Non-negotiable adaptation | Responsive, accessibility, performance | Constrain every other dimension across contexts. |

Every dimension must expose the same conceptual contract: purpose, allowed states, influencing inputs, prohibited influences, merchant visibility, override behavior, compatibility constraints, safe fallback, and relationship to verified runtime capability. A conceptual state is not itself a Shopify setting value.

## 11. Typography DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish hierarchy, tone, readability, and the relationship between display, editorial, product, utility, price, and action text. Typography DNA is more than font selection. |
| Allowed conceptual states | `editorial-serif-led`, `balanced-serif-sans`, `functional-sans`, `technical-structured`, `minimal-neutral`. Each may vary heading emphasis, body density, tracking restraint, line length, and display-to-utility contrast inside preset bounds. |
| Influenced by | Approved preset, personality, design language, industry, information density, catalog complexity, copy length, page task, language, and merchant intent. |
| Must not be influenced by | Fashion trends alone, a copied website font, an unlicensed font name, an inferred luxury claim, or the desire to disguise weak content. |
| Merchant visibility | Show a plain-language direction and representative hierarchy, not font-picker internals by default. Guided may explain readability and tone; Advanced may expose validated choices. |
| Override behavior | “More editorial,” “more technical,” or “less formal” updates typography hierarchy and closely dependent spacing only. Approved font choices remain unless the merchant changes them explicitly. |
| Compatibility | Readability, one-H1 page ownership, semantic role hierarchy, long translations, RTL, 200%/400% zoom, mobile line length, and WCAG 2.2 AA override style. Fewer type roles are preferred. |
| Safe fallback | `minimal-neutral`: a readable approved or schema-default heading/body pairing, standard hierarchy, restrained tracking, and comfortable body line height. |
| Runtime relationship | Current typography settings cover heading/body fonts, scale, line height, heading tracking, and body scale. DNA cannot import fonts or set values outside those schemas. |

## 12. Spacing DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish proximity, focus, scanning speed, luxury, commerce intensity, and vertical rhythm at micro, component, section, and page levels. |
| Allowed conceptual states | `compact`, `balanced`, `spacious`, `editorial`, `luxury`, `information-dense`. These are normalized directions; they are not arbitrary pixel systems. |
| Influenced by | Preset, approved strategy, catalog breadth, information density, editorial density, viewport, content length, and merchant requests such as “less busy.” |
| Must not be influenced by | Empty content that merely needs filling, random visual variety, a copied competitor layout, or the assumption that more whitespace always means more luxury. |
| Merchant visibility | Describe perceived result—“more breathing room” or “faster product scanning”—rather than token values in Quick Start. |
| Override behavior | A spacing correction changes compatible widths, gutters, section spacing, and grid gap as one bounded family while preserving accessibility and preset limits. |
| Compatibility | Proximity must still communicate relationships; small screens, long labels, zoom, touch targets, and dense product information can require local adaptation. |
| Safe fallback | `balanced`, using validated preset values or current schema defaults with clear grouping and no horizontal overflow. |
| Runtime relationship | Current layout settings support page/content width, mobile/desktop gutters, section spacing, and grid gap. Existing design-system spacing tokens constrain implementation; no arbitrary CSS values are authorized. |

## 13. Layout DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Determine how text, media, products, and proof occupy the page and which element leads the reading sequence. |
| Allowed conceptual states | Bounded facets include `full-width` or `constrained`, `centered` or `controlled-asymmetric`, `text-first` or `media-first`, `single-column` or `split`, and `product-grid` or `editorial-stagger`. Only compatible facets may combine. |
| Influenced by | Approved preset and recipe, page blueprint, visual hierarchy, resource quality, copy length, catalog depth, page task, and viewport. |
| Must not be influenced by | Novelty, unsupported masonry, visual order that contradicts semantic source order, or a need to imitate another storefront. |
| Merchant visibility | Preview the composition and describe its effect. Do not expose template, section, or CSS-grid internals. |
| Override behavior | “Make it more image-led” may adjust media emphasis and compatible section variants; it may not replace page purpose or approved content. |
| Compatibility | Page blueprints, section eligibility, canonical variants, H1 ownership, adjacent-section rules, source order, responsive behavior, and runtime schemas are authoritative. |
| Safe fallback | A constrained, centered, single-column-to-standard-grid composition using the approved preset's minimum viable sections. |
| Runtime relationship | Compilation may use existing layout recipes, page blueprints, global widths, and documented section layout options only. DNA creates no new template or variant. |

## 14. Grid DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Control card density, column direction, media dominance, alignment, whitespace distribution, and browse efficiency. |
| Allowed conceptual states | `restrained`, `balanced`, `dense`; with `uniform`, `feature-first`, or `controlled-asymmetric` emphasis when the selected section supports it. |
| Influenced by | Product count, collection breadth, approved media consistency, preset, commerce density, editorial intent, page type, and viewport. |
| Must not be influenced by | Array order unrelated to merchant order, filenames, image interpretation, unsupported column counts, or an urge to fill every row. |
| Merchant visibility | Show product/media scale and expected scanning character in Preview. Advanced may show bounded density choices, never raw grid implementation. |
| Override behavior | “Show more products” increases density only within section limits and preserves product readability; “make images larger” reduces density where compatible. |
| Compatibility | Canonical section block limits, Product Card ownership, minimum touch size, text wrapping, image consistency, page width, and responsive grid behavior govern. |
| Safe fallback | `balanced` and `uniform`, using section/schema defaults and the current global grid gap. |
| Runtime relationship | Global `grid_gap` and verified section-local column/layout settings are available where their live schemas permit. Design DNA never invents a column option. |

## 15. Visual Hierarchy DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish the relative priority of Brand, Product, Story, Proof, and Conversion throughout the storefront. |
| Allowed conceptual states | Strategy-driven patterns include `brand-story-led`, `product-story-balanced`, `product-conversion-led`, `value-feature-proof-led`, and `minimal-product-led`. |
| Influenced by | Merchant objective, audience, purchase consideration, preset, page type, catalog maturity, approved evidence, and content/resource readiness. |
| Must not be influenced by | Unsupported claims, whichever resource has the largest file, generic industry assumptions, or conversion pressure that obscures understanding. |
| Merchant visibility | Present a concise priority summary and reflect it in Preview and homepage structure. |
| Override behavior | Merchant changes re-rank only affected relationships, followed by compatibility validation; explicit approved priorities remain authoritative. |
| Compatibility | Page purpose and heading ownership govern. Product pages preserve safe purchase decisions; accessibility requires semantic order to remain understandable without visual styling. |
| Safe fallback | `minimal-product-led`: Product → Conversion → Brand → optional Story/Proof when approved. |
| Runtime relationship | Hierarchy compiles through existing recipes, section order, type scale, widths, media treatment, and CTA hierarchy; there is no standalone hierarchy setting. |

Examples are tendencies, not hard-coded rules:

```text
Luxury leather: Brand → Story → Product → Proof → Conversion
SaaS: Value proposition → Features → Proof → Conversion → Brand
Minimal catalog: Product → Conversion → Brand → optional Story
```

## 16. Color DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Govern contrast, restraint, palette breadth, surface alternation, accent frequency, CTA distinction, neutral dominance, and information states. |
| Allowed conceptual states | `brand-authoritative`, `neutral-restrained`, `warm-restrained`, `dark-contrast`, `quiet-luxury`, `minimal`, `technical`, and `playful-bounded`, where compatible with the preset and approved palette. |
| Influenced by | Authoritative brand colors, approved merchant intent, preset color-system intent, design language, product photography, page hierarchy, and accessibility. |
| Must not be influenced by | Unapproved website colors, image pixel sampling as brand truth, trends, inferred brand meaning, or a desire to make unsupported states look credible. |
| Merchant visibility | Show named intent and an accessible preview. Palette replacement is separately reviewable because it can affect brand identity. |
| Override behavior | “Make it warmer” adjusts eligible scheme use and surface/accent balance, not merchant-owned palette facts. An unsafe requested contrast is constrained and explained. |
| Compatibility | WCAG 2.2 AA, visible focus, status not conveyed by color alone, product visibility, overlays, and approved color-scheme data take precedence. |
| Safe fallback | An accessible neutral scheme with restrained accent use, clear text/background contrast, and established semantic state roles. |
| Runtime relationship | Current runtime supports color-scheme definitions and a default scheme. Strategy-to-setting mapping is partial because actual palette definitions are merchant-owned. DNA does not fabricate hex values. |

## 17. Media DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Decide the relative role of approved product, lifestyle, detail, editorial, process, architecture, interface, diagram, and video resources. |
| Allowed conceptual states | `product-led`, `lifestyle-led`, `detail-led`, `editorial-led`, `technical-interface-led`, `process-supporting`, and `minimal-media`. |
| Influenced by | Approved resource eligibility, quality, rights, accessibility, responsive and performance suitability; preset; page task; catalog; approved strategy. |
| Must not be influenced by | Image interpretation as evidence, unapproved stock/generated assets, filenames, mutable URLs as identity, or a desire to manufacture missing campaigns or screenshots. |
| Merchant visibility | Resource identity remains visible through the Recommended Resource Set; DNA explains media prominence and fallback in plain language. |
| Override behavior | Merchant may change prominence or select another approved resource. Identity changes return to resource validation rather than bypassing it. |
| Compatibility | Canonical section asset requirements, role eligibility, mobile alternatives, alt/decorative decisions, video controls, LCP, rights, and immutable resource snapshots govern. |
| Safe fallback | Approved product media, then a truthful text-first or neutral media-safe state; omit optional media rather than invent it. |
| Runtime relationship | Existing responsive image, image-picker, hosted-video, poster, and section media controls may be used only where verified. Photographic style has no universal Shopify setting. |

## 18. Image Treatment DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Govern crop direction, aspect-ratio preference, edge-to-edge versus contained presentation, consistency, focal safety, and mobile treatment of approved images. |
| Allowed conceptual states | `natural-contained`, `product-consistent`, `portrait-editorial`, `landscape-editorial`, `immersive-edge-to-edge`, and `detail-focused`, subject to runtime support. |
| Influenced by | Resource dimensions and metadata, approved focal information, product consistency, preset, section role, device, text-safe area, and performance. |
| Must not be influenced by | Inferred subject identity, automated meaning extraction, arbitrary face/product detection, unsupported ratios, or cropping that changes a factual representation. |
| Merchant visibility | Preview the actual crop on relevant device contexts and identify when a mobile alternative or focal confirmation is needed. |
| Override behavior | A crop change preserves resource identity and placement identity; replacing the image invokes resource approval. |
| Compatibility | Informative content must remain visible, image alternatives remain accurate, text overlay contrast remains safe, and canonical section ratio options govern. |
| Safe fallback | Preserve the natural approved asset in a contained treatment without destructive crop; use approved mobile media when available. |
| Runtime relationship | Compile only to aspect-ratio, object-position/focal, contained/full-width, and responsive-media controls explicitly present in selected section contracts. No global image-treatment setting is assumed. |

## 19. Motion DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Use movement to communicate feedback, continuity, state change, hierarchy, or navigation without distracting from content and commerce. |
| Allowed conceptual states | `none`, `minimal`, `subtle`, `editorial`, `functional`. Existing strategy vocabulary such as luxury, playful, expressive, or technical must normalize into a compatible bounded behavior rather than inventing a new engine. |
| Influenced by | Preset motion policy, merchant preference, interaction purpose, content type, device, reduced-motion preference, performance, and section capability. |
| Must not be influenced by | Decoration, novelty, urgency theater, autoplay desire, or the assumption that a premium experience requires more animation. |
| Merchant visibility | Show a plain-language intensity and purpose. Preview respects the user's motion preference. |
| Override behavior | “Use less motion” may always reduce or disable motion. Requests for more motion remain within preset, accessibility, section, and performance limits. |
| Compatibility | `prefers-reduced-motion`, focus stability, no essential information through motion, no autoplay audio, Theme Editor lifecycle, and cleanup are mandatory. |
| Safe fallback | `none` or `minimal`, with all content and actions available without animation. |
| Runtime relationship | Current global controls enable motion and set duration; some sections expose validated animation toggles. There is no universal per-section animation profile. |

## 20. Shape and Surface DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish the relationship among radii, borders, containment, separators, flat or elevated surfaces, and component hierarchy. |
| Allowed conceptual states | `sharp-flat`, `restrained-flat`, `subtle-contained`, `structured-separated`, and `soft-surface`. Elevation may conceptually be flat, subtle, balanced, or elevated only where runtime components already support it. |
| Influenced by | Preset, brand personality, design language, information density, interaction state, product imagery, and accessibility. |
| Must not be influenced by | Decorative fashion, inconsistent component-by-component styling, invented shadows, or a wish to make unverified content look authoritative. |
| Merchant visibility | Describe the result as flat, structured, or softer; Preview shows the system consistently rather than exposing every radius. |
| Override behavior | A shape correction updates the compatible component family while preserving state clarity and preset identity. |
| Compatibility | Focus, selected, error, disabled, and loading states must remain perceivable; cards and controls retain familiar affordances and adequate targets. |
| Safe fallback | `restrained-flat` with subtle existing borders, low radius, clear grouping, and no decorative elevation dependency. |
| Runtime relationship | Current global controls cover button, card, media, and input radius plus button text transform. Color schemes provide background, surface, text, border, and accent roles. No global shadow setting is currently verified. |

## 21. Navigation DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish how quickly customers can orient, browse categories, reach priority products, and access utility actions. |
| Allowed conceptual states | `essential`, `product-led`, `collection-led`, `editorial`, and `utility-rich`, selected according to real menu depth and merchant goals. |
| Influenced by | Shopify-authoritative menus and destinations, catalog and collection structure, audience tasks, preset, page blueprint, device, and approved navigation intent. |
| Must not be influenced by | Provisional labels without destinations, invented pages, inferred information architecture, SEO keyword stuffing, or a visual desire for menu items that do not exist. |
| Merchant visibility | Show a human-readable navigation summary and real destinations. Navigation remains a consequential resource decision when identity or customer route changes. |
| Override behavior | Reordering or simplifying may be recommended; adding or changing a destination requires a real approved route and follows resource approval rules. |
| Compatibility | Header/global-navigation architecture, localization, keyboard and focus behavior, disclosure semantics, touch targets, menu depth, and mobile behavior remain authoritative. |
| Safe fallback | A small Shopify-authoritative primary menu plus existing utility navigation, with unsupported or empty destinations omitted. |
| Runtime relationship | Design DNA may influence composition and density but does not create menus or own Header settings. Shopify menu records and the global Header contract govern implementation. |

## 22. Hero DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Choose the opening emphasis that orients the customer and establishes the first meaningful relationship among brand, product, media, and action. |
| Allowed conceptual states | `immersive`, `editorial`, `product-led`, `minimal`, `technical`, and `conversion-led`. A state describes purpose, not a new section type. |
| Influenced by | Preset, approved media quality, catalog maturity, merchant objective, approved copy/action availability, page context, content width, viewport, and performance. |
| Must not be influenced by | Invented headlines or CTAs, unapproved campaign media, assumed transparent-header compatibility, fake product context, or the desire to use video without value. |
| Merchant visibility | Preview the proposed opening with a clear Provisional or Approved label, actual approved resources, and any omission reason. |
| Override behavior | “Make the hero shorter,” “lead with the product,” or “use less motion” changes only compatible hero presentation dimensions and dependents. |
| Compatibility | The canonical Hero System, one-H1 page governance, action-pair truth, media alternatives, overlay contrast, mobile crop, autoplay restraint, LCP priority, and no-JavaScript usefulness govern. |
| Safe fallback | A minimal text-first or approved product-media lead with no invented claim or action; use the preset's supported minimum viable hero behavior. |
| Runtime relationship | Existing Hero System variants and live schema options are the only compilation targets. DNA does not create a new hero section or write headline content. |

## 23. Product Discovery DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Determine how prominently and frequently customers encounter real products and collections across navigation, homepage, and supporting pages. |
| Allowed conceptual states | `restrained`, `balanced`, `product-forward`, `catalog-dense`, and `visual-discovery`. |
| Influenced by | Catalog breadth, collection quality, merchant objective, approved product/collection resources, preset merchandising emphasis, page type, and viewport. |
| Must not be influenced by | Inferred relationships, fake recommendations, customer-history assumptions, unavailable resources, or labels such as “best seller” without authority. |
| Merchant visibility | Preview representative approved products and describe discovery emphasis, not internal section selection scores. |
| Override behavior | “Show more products” or “make this more editorial” shifts compatible grids, product sections, and rhythm while preserving approved product order and section limits. |
| Compatibility | Product Card and Product Form ownership, source authority, current-product exclusions, duplicate rules, section purpose, block limits, and page blueprint govern. |
| Safe fallback | One clear approved collection or a small product-first discovery region; omit optional relationship sections when none are approved. |
| Runtime relationship | Compile through existing featured collection/category, collection/product carousel, commerce sections, and their validated settings. It never creates automatic recommendation logic. |

## 24. Product Page DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Balance media, identity, price, variants, purchase actions, product explanation, evidence, and related discovery around a safe purchase decision. |
| Allowed conceptual states | `media-led`, `balanced-decision`, `information-led`, and `proof-supported`, with commerce density adjusted inside Product Page ownership. |
| Influenced by | Product data completeness, variant complexity, media quality, approved evidence, industry, preset, audience questions, and mobile purchase flow. |
| Must not be influenced by | Invented product facts, hidden variant complexity, unverified benefits, fake urgency, unsupported bundles, or replacement of Shopify-owned product truth. |
| Merchant visibility | Preview hierarchy and supporting sections. Product data remains visibly Shopify-sourced and sensitive evidence remains separately approved. |
| Override behavior | Merchant may prioritize media or detail, but the primary purchase information and action cannot be obscured or removed by aesthetic preference. |
| Compatibility | Product Page specification, `main-product` ownership, Product Gallery/Card/Form behavior, variant accessibility, dynamic commerce sources, evidence eligibility, and performance govern. |
| Safe fallback | `balanced-decision`: clear product media, title, price, variants, purchase action, and only truthful supporting content. |
| Runtime relationship | Use the existing Product page blueprint and supported product sections. DNA does not alter Shopify product records, cart behavior, recommendations APIs, or transactional logic. |

## 25. Collection Page DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Balance collection context with fast browse, filtering, sorting, product scanning, and cross-navigation. |
| Allowed conceptual states | `browse-first`, `editorial-intro`, `category-led`, and `dense-catalog`. |
| Influenced by | Collection size, taxonomy, image consistency, approved collection context, preset, merchant objective, filters, and viewport. |
| Must not be influenced by | Invented collection copy, arbitrary grouping, fake category relationships, or editorial treatment that delays the primary browse task. |
| Merchant visibility | Show the banner/context-to-grid balance and representative real collection data. |
| Override behavior | Density and intro prominence may change; filtering, sorting, product access, and mobile drawer usability remain intact. |
| Compatibility | Collection Page blueprint, main product-grid ownership, filter/sort behavior, pagination, empty states, source order, image treatment, and responsive rules govern. |
| Safe fallback | `browse-first` with lightweight real collection context and a standard accessible product grid. |
| Runtime relationship | Existing collection banner, main grid, tabs, carousel, and category sections may be composed only where current page and section contracts permit. |

## 26. Editorial Storytelling DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Decide whether and how approved brand, craft, process, people, timeline, editorial, and campaign material supports product understanding. |
| Allowed conceptual states | `absent`, `restrained`, `balanced`, `story-led`, and `evidence-led`. A richer state requires correspondingly stronger approved content and evidence. |
| Influenced by | Approved Block Plans, evidence, merchant-authored story content, approved articles/pages/collections, preset, industry, purchase consideration, and strategy. |
| Must not be influenced by | Aesthetic atmosphere as evidence, empty section capacity, generic industry stories, inferred founder/craft/origin/sustainability facts, or starter copy. |
| Merchant visibility | Show selected stories, evidence status, omissions, and order in the review surface; do not expose runtime block identities. |
| Override behavior | Merchant may reduce, remove, reorder, or revise approved storytelling. Increasing density requires additional approved content, not generated filler. |
| Compatibility | Canonical section ownership keeps Founder, Craftsmanship, Manufacturing Process, Timeline, Team, Sustainability, Awards, Lookbook, Editorial Grid, and other roles distinct. |
| Safe fallback | `absent` or `restrained`, with product-first composition and explicit omission of unsupported narrative sections. |
| Runtime relationship | Compile only through selected existing sections and immutable Approved Block Plan content. DNA never writes block content or treats composition packs as sections. |

## 27. Trust and Proof DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Establish where verified proof appears, how strongly it is emphasized, and how it supports rather than substitutes for product understanding. |
| Allowed conceptual states | `none`, `inline`, `distributed`, and `dedicated`, determined by the kind, strength, relevance, and approval of evidence. |
| Influenced by | Merchant-confirmed facts, evidence references, approved certifications/awards/testimonials, Shopify policy data, industry risk, audience questions, and page task. |
| Must not be influenced by | Visual polish, trust-badge conventions, inferred reviews, unsupported statistics, screenshot text, or the assumption that every store needs testimonials. |
| Merchant visibility | Proof and its source/approval status are reviewable; omissions explain absent evidence without urging invention. |
| Override behavior | A merchant may remove proof or approve verified material. Styling cannot elevate an unapproved claim into proof. |
| Compatibility | Evidence-specific canonical contracts, consent/privacy, expiry/staleness, accessibility, duplication, claim scope, and destination verification govern. |
| Safe fallback | `none` or factual Shopify-owned policy/support information where appropriate; omit dedicated proof sections without evidence. |
| Runtime relationship | Existing trust/evidence sections may render approved content only. DNA controls emphasis and rhythm, not evidence identity or truth. |

## 28. Conversion DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Make the next legitimate customer action clear while balancing education, discovery, trust, and merchant restraint. |
| Allowed conceptual states | `restrained`, `balanced`, `direct`, `education-first`, `product-first`, `trust-first`, `story-first`, and `editorial`, aligned with existing strategy/recipe vocabulary. |
| Influenced by | Merchant objective, business model, audience readiness, page type, catalog, approved destinations, preset, strategy, and content readiness. |
| Must not be influenced by | Dark patterns, fake urgency/scarcity, unsupported discounts, invented social proof, manipulative repetition, or a generic optimization claim. |
| Merchant visibility | Explain the primary customer path and show CTA hierarchy in Preview; do not expose conversion scoring. |
| Override behavior | Merchant may ask for stronger or quieter commerce. Requests still require real destinations, safe labels, page-purpose alignment, and accessible controls. |
| Compatibility | Page conversion ownership, action-pair completeness, cart/checkout boundaries, resource approval, duplicate CTA restraint, and no automatic transactional behavior govern. |
| Safe fallback | `balanced`: one clear primary path, restrained secondary actions, and no urgency claims. |
| Runtime relationship | Compile through existing section composition and documented CTA/button settings. There is no global conversion setting, and DNA never changes cart or checkout behavior. |

## 29. Commerce Density DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Define how much real product and purchase-oriented content appears above the fold and across a page. |
| Allowed conceptual states | `restrained`, `balanced`, `product-forward`, and `catalog-dense`. |
| Influenced by | Preset merchandising emphasis, catalog breadth, merchant objective, page task, product-resource readiness, editorial density, and viewport. |
| Must not be influenced by | A belief that more cards equal more conversion, inferred product relationships, empty media slots, or unsupported commerce sections. |
| Merchant visibility | Preview shows product frequency and scale; refinement language uses outcomes such as “more products” rather than section mechanics. |
| Override behavior | Increase or decrease product frequency within preset performance budget, page blueprint, source authority, and section limits. |
| Compatibility | Avoid consecutive duplicate product tasks; Product Card ownership, page maximums, current-product rules, source distinctions, and mobile scanability govern. |
| Safe fallback | `balanced` for ordinary catalogs and `product-forward` only when the preset, page, and approved catalog support it. |
| Runtime relationship | Existing commerce sections and layout controls implement density. DNA cannot fabricate blocks, recommendation results, bundle behavior, or product relationships. |

## 30. Editorial Density DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Define how much approved storytelling separates and contextualizes commercial regions. |
| Allowed conceptual states | `none`, `light`, `balanced`, and `story-rich`. |
| Influenced by | Brand maturity, approved story entities, evidence, preset, industry, merchant objective, purchase consideration, and content quality. |
| Must not be influenced by | A preset's empty storytelling capacity, images without factual support, a desire to appear established, or generated filler. |
| Merchant visibility | Preview and Decisions show which stories are included, omitted, or awaiting confirmation. |
| Override behavior | Reducing density is always reversible. Increasing it requires approved content and may trigger focused content review. |
| Compatibility | Editorial sections retain distinct ownership; avoid repeated narrative types, excessive reading before product discovery, and unsupported evidence claims. |
| Safe fallback | `none` or `light`; product-first composition remains complete without optional narrative. |
| Runtime relationship | Section selection/order and Approved Block Plan placements implement editorial density. No empty section or starter content is created to satisfy a target. |

## 31. Information Density DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Control the amount, grouping, and progressive disclosure of explanatory text, features, comparison, FAQ, metadata, and technical proof. |
| Allowed conceptual states | `low`, `medium`, and `high`, matching current registry vocabulary, with `progressive` disclosure as a behavior rather than a fourth quantity. |
| Influenced by | Product complexity, audience expertise, Signal/technical posture, approved feature/evidence content, page task, copy length, and viewport. |
| Must not be influenced by | Empty card capacity, generic specifications, invented comparisons, jargon, or a wish to make a simple product look technical. |
| Merchant visibility | Explain whether the direction is concise, balanced, or detailed and show grouping in Preview. |
| Override behavior | “More technical” or “less busy” adjusts hierarchy, grouping, section presence, and spacing without inventing or deleting approved facts. |
| Compatibility | Readability, heading hierarchy, cognitive load, progressive disclosure, duplicate proof, section limits, mobile ordering, and performance govern. |
| Safe fallback | `medium` for complete ordinary stores; `low` when approved information is sparse. |
| Runtime relationship | Existing Product Highlights, comparison, FAQ, rich-text, card, and layout capabilities may express density. DNA cannot author the information they display. |

## 32. Section Rhythm DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Create a deliberate sequence of media, product, story, proof, and action without visual or semantic repetition. |
| Allowed conceptual states | Patterns such as `Media → Product → Story → Product`, `Hero → Features → Proof → CTA`, and `Hero → Discovery → Editorial → Conversion`, only when approved sections support each role. |
| Influenced by | Preset recipe, approved strategy order, page blueprint, hierarchy, density dimensions, section availability, content, and performance budget. |
| Must not be influenced by | Random variation, visual alternating for its own sake, filename/order artifacts, or a requirement to include every available section. |
| Merchant visibility | Homepage/page structure is reviewable in role language; reasons are concise and compatible alternatives remain bounded. |
| Override behavior | Reordering preserves approved content identities and triggers adjacency, page-purpose, hierarchy, and performance validation. |
| Compatibility | The current compatibility matrix is authoritative: avoid duplicate heroes, adjacent dense process sections, adjacent image grids, repeated product grids, adjacent comparisons/quotes, and repeated newsletter actions. |
| Safe fallback | Use the selected preset's minimum viable section sequence or the canonical resource-free bootstrap with optional unsupported sections omitted. |
| Runtime relationship | Compilation uses current layout recipes, page blueprints, strategy ordering, compatibility entries, template constraints, and installed section capabilities. |

## 33. Page Rhythm DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Coordinate pacing, hierarchy, density, and conversion across complete page types rather than optimizing sections in isolation. |
| Allowed conceptual states | `immersive`, `editorial-paced`, `balanced`, `browse-efficient`, and `information-efficient`, constrained by each page blueprint. |
| Influenced by | Page purpose, preset, strategy, section rhythm, content length, catalog, viewport, customer task, and performance. |
| Must not be influenced by | Reusing homepage rhythm everywhere, decorative alternation, excessive section count, or section availability without page eligibility. |
| Merchant visibility | Show page-level summaries and representative transitions; Advanced may inspect page composition without exposing template JSON. |
| Override behavior | A page-specific request changes that page's candidate and shared dependents only when necessary; it does not silently rewrite all pages. |
| Compatibility | Current blueprints for homepage, product, collection, article, about, contact, and landing page own maximum sections, ideal flow, goals, and storytelling balance. |
| Safe fallback | The relevant page blueprint's simplest supported flow, with primary customer task first and optional evidence/editorial regions omitted. |
| Runtime relationship | Existing templates, page blueprints, installed sections, and generator validation govern. DNA does not create a new page type or template path. |

## 34. Responsive DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Preserve purpose, hierarchy, readability, media meaning, and action access across viewport, orientation, zoom, locale, and input method. |
| Allowed conceptual states | `preserve`, `reorder-with-semantic-integrity`, `simplify`, `stack`, `reduce-density`, and `change-media-priority`; these are adaptive operations, not separate visual themes. |
| Influenced by | Canonical section behavior, content length, approved mobile resources, focal data, grid/density choices, touch, RTL, zoom, and performance. |
| Must not be influenced by | Desktop visual order alone, unsupported breakpoints, assumed device dimensions, or a desire to hide essential content on mobile. |
| Merchant visibility | Preview may show available device contexts and material hierarchy changes; exact breakpoint internals stay hidden. |
| Override behavior | Merchant may request mobile emphasis, but semantic order, action access, and cross-device truth cannot be compromised. |
| Compatibility | Mobile-first behavior from 320 px, no horizontal overflow, logical source order, long translations, RTL, 200%/400% zoom where required, touch targets, and keyboard access govern. |
| Safe fallback | Stack to one clear column, reduce non-essential density and motion, preserve primary product/action content, and use a safe approved media treatment. |
| Runtime relationship | Use only existing responsive section behavior, mobile media fields, global gutters, documented ratios, and CSS owned by the runtime. DNA creates no universal breakpoint. |

## 35. Accessibility DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Make every visual direction perceivable, operable, understandable, and robust. Accessibility is a non-negotiable constraint on all dimensions, not an optional style. |
| Allowed conceptual states | One target only: `WCAG-2.2-AA-constrained`, with context-specific adaptations for contrast, type, focus, touch, motion, semantics, content order, and alternatives. |
| Influenced by | Applicable accessibility standards, canonical components/sections/pages, resource metadata, content, viewport, input method, user preferences, and tested behavior. |
| Must not be influenced by | Preset aesthetics, confidence, trends, merchant preference for unsafe contrast/motion, or visual-only meaning. |
| Merchant visibility | Show meaningful constraints and explain material overrides in plain language; do not imply a compliance audit without validation. |
| Override behavior | Accessibility may constrain an approved aesthetic choice. Calinium preserves the merchant's intent as far as safe and identifies the smallest necessary adaptation. |
| Compatibility | Semantic hierarchy, keyboard, visible focus, alternatives, labels, error/status communication, contrast, zoom/reflow, RTL, reduced motion, and target sizes govern every compilation. |
| Safe fallback | Readable type, accessible contrast, visible focus, standard semantic order, minimal motion, adequately sized controls, and text alternatives or truthful omission. |
| Runtime relationship | Existing accessible components and canonical contracts remain authoritative. DNA cannot write ARIA, DOM order, or accessibility mechanics and cannot weaken runtime safeguards. |

## 36. Performance DNA

| Contract aspect | Rule |
| --- | --- |
| Purpose | Keep the visual direction responsive and usable by constraining media weight, motion, section count, carousels, initial-view work, and layout instability. |
| Allowed conceptual states | `lean`, `balanced`, and `media-prioritized`, always subject to the selected preset's explicit performance budget and measured runtime evidence. |
| Influenced by | Preset budget, page type, LCP candidate, approved asset dimensions/format, video necessity, section cost, JavaScript ownership, viewport, and measured validation. |
| Must not be influenced by | Aspirational Lighthouse claims, visual richness for its own sake, autoplay, stacked heavy media, or assumptions about network/device quality. |
| Merchant visibility | Explain material trade-offs such as using a still image instead of optional video. Do not claim scores that were not measured. |
| Override behavior | Merchant requests for richer media remain subject to resource suitability, page budget, reduced-data/accessibility needs, and runtime capability. |
| Compatibility | Responsive images, actual LCP priority, reserved space, lazy loading, no-JavaScript usefulness, progressive enhancement, lifecycle cleanup, and no duplicate heavy sections govern. |
| Safe fallback | `lean`: approved responsive still media, no autoplay, minimal motion, fewer sections, and native/server-rendered behavior. |
| Runtime relationship | Preset performance budgets and canonical section performance rules constrain compilation. DNA does not create loaders, controllers, or asset transformations. |

## 37. Industry Adaptation

Industry is a strategy context, not a Shopify setting and not proof of any merchant fact. Design DNA may use only the current registry IDs and only as tendencies that remain subordinate to approved merchant intent, preset compatibility, resources, truth, accessibility, and performance.

| Current registry family | Current IDs | Bounded DNA tendencies |
| --- | --- | --- |
| Luxury and considered goods | `luxury_fashion`, `jewelry` | Lower density, restrained conversion, material/detail emphasis, refined hierarchy, generous spacing, strong trust requirements. No quality, origin, craft, scarcity, or provenance claim follows from the category. |
| Fashion and visual discovery | `fashion` | Editorial/lifestyle media, collection-and-look discovery, medium density, inviting action, mobile priority. Campaign context and product associations still require approval. |
| Home and place | `furniture`, `home`, `hospitality` | Lifestyle/architecture media, spatial context, editorial or immersive pacing, category/place discovery. No property, material, experience, or availability fact is inferred. |
| Beauty and wellness | `beauty`, `wellness` | Calm education, warm/restrained surfaces, balanced commerce, high trust, approved ingredient/routine context. No clinical, health, efficacy, or outcome claim is inferred. |
| Food and beverage | `food_beverage` | Product/appetite imagery, approved ingredient/process context, editorial rhythm, high trust. No origin, manufacturing, nutrition, artisan, or certification claim is inferred. |
| Technical and engineered goods | `electronics`, `technology`, `automotive` | Structured hierarchy, compact or comfortable information density, feature/comparison clarity, technical media, task-oriented action. Specifications and performance require authoritative data. |
| Active and approachable retail | `sports`, `pets` | Clear product/category discovery with bounded energy or warmth. No performance, safety, health, or customer-result claim is inferred. |
| Digital and service businesses | `digital_products`, `professional_services` | Outcome/feature clarity, structured proof, accessible explanation, restrained task-oriented conversion. No feature, integration, expertise, pricing, or result is fabricated. |
| Broad retail | `general_retail` | Balanced product/category discovery, neutral presentation, adaptable hierarchy, medium density, safe commerce baseline. |

Multi-domain classification and industry-taxonomy evolution remain open product questions. The registry must not force a merchant into a visual stereotype.

## 38. Brand Personality Adaptation

The current personality registry contains `luxury`, `confident`, `warm`, `minimal`, `friendly`, `playful`, `bold`, `technical`, `sophisticated`, `traditional`, and `modern`.

Personality adjusts tone across bounded dimensions rather than selecting content or runtime sections by itself:

| Personality tendency | Likely affected dimensions | Boundary |
| --- | --- | --- |
| `luxury`, `sophisticated` | restraint, heading emphasis, spacing, media pacing, surface reduction, subtle motion | Cannot establish premium quality, price, heritage, or scarcity. |
| `warm`, `friendly`, `playful` | tone, softer rhythm/shape where preset permits, lifestyle emphasis, bounded energy | Cannot invent community, family, testimonial, or lifestyle facts. |
| `minimal`, `modern`, `confident` | clearer hierarchy, reduced noise, balanced spacing, direct discovery and action | Cannot remove required information or accessibility cues. |
| `bold` | contrast, hierarchy, focused action, controlled visual energy | Cannot justify urgency, clutter, aggressive motion, or unsupported claims. |
| `technical` | structured typography, information density, card separation, functional motion | Cannot invent features, specifications, evidence, or integrations. |
| `traditional` | measured hierarchy, editorial pacing, restrained motion, approved chronology/process emphasis | Cannot establish heritage, craft, origin, or age. |

Personality can influence downstream typography, spacing, motion, imagery preference, and composition, as the existing strategy mapping records. It is not a standalone setting, fact, claim, or approval.

## 39. Design Language Adaptation

The current design-language registry contains `editorial`, `luxury`, `minimalist`, `modern`, `expressive`, `playful`, `heritage`, `premium`, `bold`, `technical`, `artisan`, and `lifestyle`.

Each language supplies a coherent recommendation across spacing, typography, motion, image style, color strategy, compatible personalities, and content density. Design DNA may normalize those recommendations inside the approved preset:

- `editorial`, `lifestyle`: paced narrative, image-led context, measured hierarchy;
- `luxury`, `premium`: restraint, confidence, whitespace or polished commerce, strong media;
- `minimalist`, `modern`: essential content, clear grid, balanced media, quiet surfaces;
- `expressive`, `playful`, `bold`: bounded energy, contrast, approachable or decisive hierarchy without accessibility loss;
- `technical`: structured information, functional clarity, comparison readiness when verified content exists;
- `heritage`, `artisan`: approved chronology, material, process, and tactile context only when evidence exists.

The registry's `best_for`, `avoid_for`, compatible personalities, and density guidance are compatibility inputs, not permission to invent content. `Heritage` and `artisan` are aesthetic directions until merchant evidence separately supports historical or craft claims. Current mapping is partial because design language spans multiple real controls and no atomic Theme Editor setting exists.

## 40. Preset-Specific DNA Boundaries

Every production preset has four explicit boundary classes:

- **Fixed DNA** preserves the preset's recognizable identity and should change only through an approved preset revision or preset change.
- **Flexible DNA** permits merchant-specific variation when approved intent, resources, compatibility, and runtime capability support it.
- **Forbidden DNA** identifies combinations that contradict the preset, truth rules, accessibility, performance, or current capability.
- **Fallback DNA** defines a safe coherent state when preferred inputs are incomplete.

Fixed does not mean that every optional section must appear. Content and evidence gates always govern section inclusion. Flexible does not mean arbitrary. Forbidden combinations may not be produced even at High confidence. Fallbacks preserve preset identity where possible; if the preset cannot remain coherent with available inputs, Calinium should recommend Essential or another explicitly compatible preset rather than disguise the conflict.

## 41. Atelier DNA

### Fixed DNA

- Craft-led visual character expressed through tactile or detail-oriented approved media, editorial hierarchy, and human-scale pacing.
- Refined typography direction, generous breathing room, restrained merchandising, low interface noise, and subtle or minimal motion.
- Craftsmanship, process, material, founder, and heritage content remains evidence-gated. Atelier may suggest their visual role but never requires their factual presence.
- Product and collection discovery remains clear even when story leads.

### Flexible DNA

- Spacing may range from balanced to spacious/luxury within the preset's generous character.
- Hierarchy may be story-led or product-story-balanced.
- Approved tactile detail, product detail, lifestyle, or process-supporting media may lead according to resource readiness.
- Commerce may move from restrained to balanced; section rhythm may emphasize product earlier when narrative evidence is sparse.
- Shape may remain sharp or subtly contained; motion may be none, minimal, or subtle.

### Forbidden DNA

- Dense promotional grids, fake scarcity, expressive decorative motion, playful visual noise, or discount-led hierarchy.
- Unverified handmade, artisan, origin, heritage, material, production, durability, or quality claims.
- Founder Story, Craftsmanship, Manufacturing Process, Materials, or Testimonials populated merely because Atelier is selected.
- Media treated as proof of technique or provenance.

### Fallback DNA

Use approved hero or product media, refined readable hierarchy, balanced-to-spacious rhythm, minimal motion, Featured Collection, and a restrained final action. Omit unsupported evidence sections. If the required media or overall fit cannot sustain Atelier coherently, use the registry's compatible Essential fallback path rather than invent craft content.

## 42. Maison DNA

### Fixed DNA

- Quiet luxury, refined hierarchy, strong product/media presentation, generous whitespace, collection-led discovery, and restrained interface chrome.
- Low information noise, flat or near-flat surfaces, sharp or minimal radius, and subtle motion without autoplay.
- Products remain elegant and understandable; luxury is conveyed through restraint, not claims.

### Flexible DNA

- Product-first and collection-first emphasis may rebalance according to catalog and merchant objective.
- Typography may range from quiet serif-led to refined modern balance while preserving premium hierarchy.
- Spacing may remain generous or become moderately tighter for broader collections.
- Approved campaign, product, lifestyle, or detail imagery may lead; Lookbook remains optional and resource-dependent.
- Commerce may remain restrained or balanced.

### Forbidden DNA

- Badge-heavy promotion, loud playful surfaces, excessive radius, expressive motion, stacked carousels, or dense conversion clutter.
- Invented campaign context, lifestyle imagery, founder narrative, craftsmanship, testimonials, quality, exclusivity, or scarcity.
- Treating premium presentation as evidence of premium facts.

### Fallback DNA

Use premium approved product imagery, clear collection discovery, refined neutral surfaces, generous but practical spacing, minimal motion, and omit unsupported campaign/story/proof sections. If strong media is unavailable, move to a restrained product-led composition or the registered Essential fallback instead of simulating luxury content.

## 43. Gallery DNA

### Fixed DNA

- Image dominance, visual discovery, large-media pacing, low interface chrome, and editorial composition.
- Lookbook and Editorial Grid are characteristic capabilities only when approved frames and destinations exist.
- Controlled asymmetry may create rhythm, but semantic order, responsive integrity, and product access remain clear.
- Commerce density is generally lower than image/story density, without making products difficult to find.

### Flexible DNA

- Hierarchy may be media-story-led or media-product-balanced.
- Spacing may be editorial, spacious, or balanced when catalog browsing needs more pace.
- Approved collection, interior, art, lifestyle, detail, Lookbook, or Editorial Grid media may lead.
- Commerce may move from restrained to balanced; grid may be feature-first or uniform where the selected section supports it.
- Typography may be editorial sans, balanced serif/sans, or minimal-neutral inside the preset boundary.

### Forbidden DNA

- Catalog-dense opening, heavy card chrome, repeated image grids, decorative asymmetry that breaks reading order, or high-motion gallery behavior.
- Invented captions, campaign names, destinations, editorial summaries, product associations, or image meaning.
- Shop the Look behavior inferred from imagery, or conflation of Lookbook, Image Mosaic, and Shop the Look.

### Fallback DNA

When media is limited or inconsistent, reduce editorial density, use a restrained uniform product/collection presentation, contain images safely, and preserve generous rhythm without empty image sections. Prefer the registered Essential/catalogue-first fallback over fabricated gallery content.

## 44. Ritual DNA

### Fixed DNA

- Calm product education, balanced commerce, high trust, readable explanatory hierarchy, soft or restrained surfaces, and subtle motion.
- Product, ingredient, material, routine, FAQ, and proof content is used only when approved and within its factual scope.
- Accessibility and clarity take priority over sensorial presentation.

### Flexible DNA

- Hierarchy may be product-led, education-first, or product-education-balanced.
- Spacing may be balanced or comfortable; surfaces may be minimally rounded or more softly contained within current controls.
- Approved product, ingredient/material, lifestyle, or detail imagery may lead according to truth and resource suitability.
- Information density may range from low to medium and become progressively disclosed for complex products.
- Testimonials may be restrained when verified; they remain optional.

### Forbidden DNA

- Clinical or medical framing, efficacy or customer-result claims, invented ingredients/materials, unverified certifications, wellness guarantees, or before/after implications.
- High-pressure conversion, aggressive urgency, autoplay, overly playful treatment, or dense unverified trust content.
- Using warm imagery or routine layout to imply a health benefit.

### Fallback DNA

Use approved product/collection content, calm neutral or approved brand surfaces, readable FAQ only when real questions/answers exist, balanced spacing, and minimal motion. Omit ingredients, testimonials, and trust sections without evidence. Essential is the safe registered preset fallback when Ritual cannot be supported coherently.

## 45. Essential DNA

### Fixed DNA

- Low content dependency, product-first hierarchy, simple composition, familiar interactions, strong usability, fast performance, and minimal visual complexity.
- Optional resources never prevent a complete safe storefront.
- Motion defaults to none; products, navigation, and primary action remain obvious.

### Flexible DNA

- Typography may adapt from neutral sans to a restrained approved brand pairing.
- Spacing may be compact or balanced, with room for accessibility and readable product information.
- Approved hero/brand media may appear or the experience may remain text/product-led.
- Color and small shape differences may reflect approved brand identity within accessible, low-noise boundaries.
- Commerce may be balanced or product-forward according to catalog size.

### Forbidden DNA

- Empty editorial sections, demo content, invented trust content, decorative complexity, excessive media, multiple competing actions, or hidden essential commerce.
- Treating “minimal” as incomplete, inaccessible, characterless, or visually careless.
- Optional narrative or relationship sections added solely to make the store look richer.

### Fallback DNA

Essential is itself the universal preset-level safety destination: readable typography, neutral accessible surfaces, compact-balanced spacing, no motion, approved product media, one clear collection/product path, simple navigation, and only complete sections. It must remain excellent with one product, no collections, no logo, and limited imagery where the runtime supports those states.

## 46. Signal DNA

### Fixed DNA

- Information clarity, value and feature hierarchy, technical credibility through verified facts, compact-balanced density, structured proof, and clear conversion path.
- Approved interface/product media, screenshots, diagrams, and feature information lead only when real and current.
- Structured surfaces and functional motion clarify relationships; decoration remains restrained.

### Flexible DNA

- Hierarchy may be value-feature-proof-led, product-explanation-led, or service-trust-led.
- Information density may be medium or high with progressive disclosure.
- Typography may be technical-structured, functional-sans, or minimal-neutral.
- Surfaces may be flat with separators or structured cards; spacing may be compact or balanced.
- Commerce may be balanced or direct according to the real business model and destination.

### Forbidden DNA

- Invented features, integrations, security claims, uptime, customer counts, pricing, screenshots, performance results, comparisons, testimonials, or product capabilities.
- Fake interface imagery, decorative dashboards, unsupported Product Comparison, autoplay demonstrations, or physical-product commerce patterns without compatible products and strategy.
- Visual technicality used to imply factual technical proof.

### Fallback DNA

Use the approved product name/value proposition and real destination when available, a clear text-first hierarchy, restrained structured surfaces, compact-balanced spacing, minimal functional motion, truthful FAQ, and only verified features/media. Omit comparison, testimonial, carousel, team, or proof regions without content. If the registered Signal minimum cannot be met, generation should remain blocked or require an approved alternative direction rather than fabricate a software offer.

## 47. Controlled Variation

Controlled variation changes a small set of compatible DNA dimensions while retaining the preset's fixed identity, content truth, accessibility, performance budget, and runtime limits.

For example:

| Direction | Spacing | Hierarchy | Media | Commerce | Motion |
| --- | --- | --- | --- | --- | --- |
| Atelier A: quiet travel goods | spacious | story-led | tactile lifestyle/detail | restrained | minimal |
| Atelier B: contemporary accessories | balanced | product-story-balanced | product detail | balanced | subtle |

Both remain Atelier because they retain refined editorial hierarchy, tactile approved media, restrained interface treatment, and evidence-gated storytelling. Neither imports Maison's quiet-luxury identity wholesale or Signal's structured technical density.

Variation follows these rules:

1. Start from the exact approved preset version and its fixed/flexible/forbidden/fallback boundaries.
2. Apply approved strategy and explicit merchant intent to flexible dimensions only.
3. Constrain media and storytelling by approved resource/content availability.
4. Resolve cross-dimension compatibility and hard accessibility/performance gates.
5. Normalize to one bounded state per dimension or one documented compatible facet set.
6. Use deterministic tie-breakers and record provenance/confidence.
7. If the result crosses preset identity, recommend a preset change rather than silently mixing styles.

## 48. Compatibility Rules

Design DNA is valid only when all relevant layers agree:

- **Preset compatibility:** industry, business model, personality, design language, recipe, content requirements, incompatibilities, motion policy, and performance budget.
- **Strategy compatibility:** only approved current decisions; no rejected, provisional, missing, or stale value is promoted.
- **Resource compatibility:** immutable approved identity, role eligibility, availability, rights, accessibility, responsive suitability, performance, and scope.
- **Page compatibility:** page blueprint purpose, maximum sections, H1/SEO ownership, flow, and conversion responsibility.
- **Section compatibility:** canonical purpose, page eligibility, variants, required content/assets, settings, blocks, empty states, responsive/accessibility/performance behavior, and omission rules.
- **Adjacency compatibility:** the current compatibility matrix remains authoritative. Duplicate heroes, repeated long sequences, adjacent process sections, consecutive image grids, repeated product tasks, duplicate comparison/proof, and repeated terminal actions are avoided as documented.
- **Runtime compatibility:** installed section, live setting type/options/range, block limits, template reference, and generated-theme validation.

Compatibility is a hard eligibility gate, not a weighted aesthetic preference. A high-scoring direction that fails any required gate is ineligible. Section packs remain composition inputs rather than runtime sections; shared Product Card use does not merge distinct commerce source authorities; and visually similar Lookbook, Image Mosaic, and Shop the Look remain semantically distinct.

## 49. Conflict Resolution

Conflicts resolve in this order:

```text
1. Safety, truth, accessibility, legal/platform, and verified runtime eligibility
2. Merchant-approved explicit choice
3. Approved business facts and resource identity
4. Approved preset boundaries
5. Approved current strategy
6. Normalized Design DNA recommendation
7. Verified runtime safe default
```

This order distinguishes eligibility from preference. An explicit merchant choice ranks first among eligible creative choices, but it cannot override an accessibility, truth, platform, or runtime hard gate. Calinium should preserve the merchant's underlying intent and explain the smallest required safe adaptation.

When two eligible goals conflict, Calinium should first reconcile them through page or section sequencing—for example, a story-led opening followed by clear product discovery. When no coherent reconciliation exists, it should state the trade-off briefly and ask which outcome governs. It must not silently choose, convert a rejected value into approval, or overwrite an approved value with a higher-confidence recommendation.

Website observations never override Shopify resource identity or merchant-confirmed intent. If current Shopify data and a merchant statement conflict in an area where neither clearly governs meaning, the conflict remains explicit and follows the unresolved product decision rather than a hidden heuristic.

## 50. Confidence and Uncertainty

Confidence is recorded per dimension; an overall summary must not conceal one weak material dimension. The deterministic levels are:

| Level | Evidence condition | Behavior |
| --- | --- | --- |
| High | Compatible approved preset and strategy, clear merchant intent, sufficient eligible resources, no material conflict | Automatically produce one ordinary reversible candidate recommendation. Keep it reviewable. Sensitive truth still requires explicit confirmation. |
| Medium | Direction is supported but evidence is partial, alternatives are materially close, or one non-blocking input is uncertain | Recommend one conservative direction, explain the uncertainty briefly, and make correction easy. Ask at most one high-value question when it would materially improve the result. |
| Low | Merchant intent or resource support is insufficient or conflicting for a consequential choice | Do not silently decide. Use a conservative reversible fallback, ask one outcome question, or omit the affected optional expression. |
| Unknown | No valid evidence supports the dimension | Do not infer. Ask only when required for a complete result; otherwise use the safe fallback or omission. |

`Confirmed` and `Approved` are lifecycle states, not confidence levels. Repetition of the same weak signal does not raise confidence. Website similarity, visual analysis, model fluency, or preset fit never raises factual confidence.

The exact evidence thresholds for each dimension and merchant-visible confidence presentation remain open decisions. Low confidence must not expand Quick Start into a large settings questionnaire.

## 51. Merchant Override Behaviour

Merchant-approved explicit choices govern eligible creative decisions. Overrides are expressed in merchant outcomes, normalized to affected DNA dimensions, validated, previewed, and then approved through existing lifecycle rules.

An override must:

1. preserve the merchant's original words and current approved decision as provenance;
2. identify the smallest affected dimension set and dependent decisions;
3. retain unrelated approved dimensions, resources, content, and revisions;
4. remain within preset, truth, accessibility, performance, compatibility, and runtime boundaries;
5. produce a new Provisional candidate rather than mutate an approved revision;
6. explain a constrained or unsupported request without blaming the merchant;
7. offer the nearest safe interpretation or compatible preset alternative when appropriate.

Quick Start shows the result and concise reason. Guided can show trade-offs and compatible alternatives. Advanced may expose normalized dimension choices, provenance, confidence, and constraints, but not raw runtime IDs, JSON, checksums, or unsafe controls.

## 52. Conversational Design Changes

Natural-language refinement maps to bounded dimensions, not direct Liquid, CSS, schema, or unrestricted settings mutation.

| Merchant request | Likely affected DNA dimensions | Required boundary |
| --- | --- | --- |
| “Make it feel more premium.” | spacing, typography hierarchy, motion restraint, shape/surface restraint, media prominence | Does not create quality, luxury, exclusivity, or pricing claims. |
| “Show more products.” | commerce density, grid density, product discovery, section rhythm | Uses real approved catalog resources and section/page limits. |
| “Make it feel warmer.” | color direction, approved imagery preference, surface tone, possibly shape | Does not fabricate palette authority or lifestyle facts. |
| “More technical.” | typography, hierarchy, information density, structured surfaces, functional motion | Does not invent features, specifications, proof, or screenshots. |
| “Less busy.” | information density, commerce density, motion, spacing, section/page rhythm | Preserves required product and accessibility information. |
| “More editorial.” | typography, media, editorial density, layout, page/section rhythm | Requires approved narrative/media; otherwise remains a visual pacing change only. |
| “Bigger hero.” | hero, media treatment, page rhythm, performance | Respects content, crop, LCP, viewport, and canonical Hero limits. |
| “Use less motion.” | motion and any dependent transition treatment | May always reduce motion and must respect user preferences. |
| “Show craftsmanship first.” | hierarchy, editorial density, section rhythm | Requires approved craftsmanship evidence and eligible page/section placement. |
| “Remove testimonials.” | trust/proof, section rhythm, page rhythm | Removes the candidate section without substituting fabricated proof. |

Ambiguous requests receive one concise interpretation and, only when material, one focused clarification. Unsupported requests receive a plain-language boundary and a safe alternative. Undo/redo and revision scope remain governed by the open product decision; no conversational change erases immutable history.

## 53. Preview Behaviour

`Thinking` is a work status, not a preview artifact. Merchant-visible Design DNA appears through the three governing preview states:

| State | Design DNA meaning |
| --- | --- |
| Provisional | A deterministic candidate direction using truthful placeholders and approved Shopify/resources where available. It may show provisional typography, spacing, layout, hierarchy, density, and media treatment. |
| Approved | The current merchant-approved design direction and approved dependencies. It remains a review representation, not a Shopify package. |
| Generated | A trusted render of the exact generated package or generated Shopify result. It is no longer merely a DNA projection. |

Every preview identifies its project and design revision in a merchant-safe form and is labelled unambiguously. A changed candidate marks an older preview stale and retains the last stable view while the new one prepares. Preview cannot establish truth, approval, resource eligibility, or runtime capability.

Only approved resources may appear as real merchant content. Missing evidence produces omitted sections or truthful structural placeholders, never claims or fake content. Accessibility, device adaptation, crop behavior, and performance trade-offs should be visible where material. The threshold for first Provisional preview, rendering architecture, and timing of device controls remain open decisions.

## 54. Design Revision Behaviour

```text
Editable Design DNA candidate
≠
Immutable approved Design DNA revision
```

A merchant correction, resource change, strategy change, preset change, or compatibility-driven adaptation creates or updates a candidate. Approval creates an immutable revision that records the normalized dimensions, input revision references, preset/version, Design DNA contract/normalizer version, confidence, provenance, fallbacks, and relevant omissions without embedding merchant content.

Revisions must:

- retain a parent when derived from an approved direction;
- preserve unaffected dimension identities and approved dependencies;
- record which dimensions and dependents changed and why;
- never mutate an approved historical revision in place;
- never silently migrate a paid order to a newer direction;
- allow retries and resume to reuse the same pinned approved inputs;
- require a new candidate and approval when an input change materially alters the design.

Mode switching alone creates no revision. Preview rendering alone creates no approval. Payment, generation, installation, upload, publication, and future updates remain separate explicit merchant actions.

## 55. Determinism

The same normalized input tuple must produce the same Design DNA result:

```text
merchant input revisions
+ approved strategy revision
+ approved preset ID and version
+ approved resource-set/snapshot revisions
+ applicable registry and capability versions
+ Design DNA normalizer version
→ identical normalized dimensions, confidence bands, provenance categories,
  fallbacks, omissions, and compatibility result
```

Final normalization must not depend on object-key order, timestamps, filesystem paths, temporary workspace, array index where identity/order exists, random choice, model sampling, or the wording order of irrelevant inputs. Approved merchant ordering remains semantic. Deterministic tie-breakers use existing explicit order and stable identities only after eligibility and intent have been resolved.

AI may interpret a statement into a candidate intent, but the approved/normalized state must use a versioned bounded vocabulary and deterministic rules. A material vocabulary or normalization change requires a new Design DNA version and migration/review policy; it must not reinterpret an old approved revision silently.

## 56. Provenance

Every normalized dimension should eventually trace to one or more of these source categories:

```text
merchant explicit
approved strategy
approved preset
industry profile
brand personality
design language
approved resource quality and suitability
verified runtime fallback
```

Provenance records why a decision exists; it does not replace approval or confidence. The record should identify source type and immutable revision where applicable, the rule/version that normalized it, whether a fallback or constraint changed it, and which merchant override superseded an earlier candidate.

Merchant-facing presentation uses concise reasons such as “keeps product images prominent” rather than raw internal traces, scores, IDs, or registry keys. Advanced may expose more source context without exposing secrets or mutable snapshot payloads. Whether safe Design DNA provenance belongs in the external generated-theme manifest remains an open decision; it must never leak into Shopify template settings or blocks.

## 57. Safe Fallbacks

When the preferred direction is unsupported, incompatible, incomplete, stale, or Low/Unknown confidence, use this universal runtime safety state:

```text
balanced spacing
strong readability
minimal motion
product-first hierarchy
neutral accessible surfaces
standard semantic hierarchy
safe contained approved media treatment
clear primary navigation and action
low optional editorial dependency
```

This is not a seventh preset named “Fallback.” It is a constrained safety state used inside the current approved preset where coherent, or during an explicit recommendation of the registered Essential preset when the current preset cannot be sustained.

Fallback order is:

1. preserve the merchant-approved eligible choice;
2. use a compatible lower-intensity state inside the preset;
3. omit optional unsupported content, media, motion, or section;
4. use the selected preset's documented minimum viable sections and safe defaults;
5. recommend the registered compatible fallback preset when required;
6. block only when no truthful, accessible, complete minimum result exists.

Fallbacks never invent starter claims, demo content, destination, product relationship, or evidence.

## 58. Anti-Patterns

Design DNA explicitly rejects:

- random style mixing or cross-preset blending during Beta;
- arbitrary CSS, Liquid, JavaScript, HTML, schema, setting, or template generation;
- theme forking merely to create visual variation;
- copying a merchant or third-party website pixel for pixel;
- blindly following visual trends or maximizing novelty;
- excessive fonts, animation, autoplay, carousels, shadows, radii, badges, or accents;
- maximalist combinations without approved merchant intent and compatible runtime support;
- over-dense luxury, under-informative technical, or visually noisy minimal directions;
- decorative conversion clutter, fake urgency, scarcity, countdowns, or trust badges;
- empty editorial/evidence sections or starter content presented as merchant truth;
- fake screenshots, testimonials, reviews, statistics, awards, certificates, claims, prices, or product relationships;
- treating an image, preset, personality, industry, or design language as factual evidence;
- adjacent incompatible or repetitive section types;
- desktop composition that becomes unusable on mobile, zoom, RTL, keyboard, or reduced motion;
- visual novelty that harms product comprehension, accessibility, performance, or Theme Editor stability;
- hidden changes, silent approvals, or automatic theme generation, upload, publication, or updates.

## 59. Validation Requirements

A future Design DNA implementation is valid only when all of these gates pass:

### Input validity

- Project/shop scope, canonical identity, approval state, and immutable revision references match.
- Strategy and preset are approved, current, schema-valid, and mutually compatible.
- Resource references resolve through the immutable approved snapshot; stale or unavailable dependencies follow resource policy.
- Website/model observations remain supplemental and do not masquerade as approved facts.

### DNA validity

- Every dimension uses a value from the versioned bounded vocabulary.
- Required confidence and provenance are present and deterministic.
- Fixed preset DNA remains unchanged; flexible states stay in bounds; forbidden combinations fail.
- No merchant content, runtime ID, raw setting, arbitrary extension, or prohibited field leaks into the design contract.
- Merchant overrides are preserved and safety/accessibility constraints are explicit.

### Composition and runtime validity

- Page blueprint, section eligibility, adjacency, maximum section count, content/evidence requirements, resource suitability, and performance budget pass.
- Every compiled setting and section value exists in the selected runtime schema and satisfies type, enum, range, block, and page constraints.
- Unsupported conceptual states are omitted or safely defaulted, never approximated through undocumented controls.
- Generated output passes existing JSON, template/section reference, package, Theme Check, source-preservation, and read-only guarantees when generation eventually occurs.

### Behavioral validity

- Repeat normalization is identical for identical approved inputs and versions.
- Reordering irrelevant keys does not alter the result.
- Corrections change only affected dimensions/dependents and create revision history.
- Preview state is truthful and never confused with approval or generation.
- WCAG 2.2 AA target, responsive behavior, reduced motion, and measured performance evidence remain hard constraints.

## 60. Beta Design DNA Scope

Beta Design DNA deliberately orchestrates only the current validated architecture:

- the six production presets: Atelier, Maison, Gallery, Ritual, Essential, and Signal;
- current approved brand-personality and design-language registry values;
- current supported industry profiles;
- current layout recipes and page blueprints;
- current section registry, capability manifest, canonical section contracts, and compatibility rules;
- current strategy-section and strategy-setting mappings, including their intentional partial/unsupported status;
- existing Calinium One 1.0 global Theme Editor setting families and live section schemas;
- existing Approved Block Plan and Recommended Resource Set boundaries;
- existing accessibility, performance, deterministic-generation, read-only-package, and paid-action safeguards.

Beta does not add a normalized runtime schema, new setting, preset, section, variant, adapter, layout recipe, font, palette generator, image generator, controller, template, or Liquid/CSS behavior through this document. Design DNA must prove value by coordinating what already exists.

Cross-preset blending, style mutation, open-ended visual generation, and automatic preference learning are not Beta capabilities.

## 61. Future Design DNA Evolution

Post-Beta versions may consider:

- additional theme targets and theme-specific compilation profiles;
- controlled theme variants and vertical-specific DNA;
- explicitly governed cross-preset blending;
- Design DNA mutation and alternative exploration;
- consented merchant preference learning across projects;
- performance-measurement-informed recommendations;
- market-, locale-, and B2B-specific design adaptations;
- richer responsive/resource suitability models;
- AI-generated design experiments and measured comparative review;
- versioned migrations as registries, settings, sections, and Shopify capabilities evolve.

Each requires a separate product and technical contract, compatibility model, approval lifecycle, deterministic normalization rules, accessibility/performance validation, and migration policy. None may reinterpret an existing approved Design DNA revision, weaken preset identity, or enter Beta through implementation convenience.

## 62. Open Product Decisions

These questions require founder judgment, merchant research, prototype testing, architecture evidence, accessibility review, privacy review, or measured validation. This document does not answer them.

### Design DNA model and visibility

1. How many DNA dimensions should be merchant-visible?
2. Should merchants see a concise DNA summary, and at which review moments?
3. Should preset identity always be visually obvious in the custom-theme journey?
4. How much variation is allowed before Calinium must recommend a different preset?
5. Should Design DNA have an independent durable version in addition to registry and generator versions?
6. Should DNA mutations be billable refinements?
7. Should Quick Start auto-approve High-confidence DNA, or only recommend it for an explicit combined review?
8. Should Advanced expose bounded dimension controls, and how much of their provenance and confidence?
9. How much recommendation reasoning and how many alternatives are useful before the experience becomes configuration?
10. When is “You decide” safe for a consequential ordinary design choice?

### Inputs, confidence, and conflicts

11. What exact evidence combinations deterministically produce High, Medium, Low, or Unknown for each dimension?
12. Should confidence be merchant-visible as bands, reasons, both, or neither?
13. How should conflicting public-website and merchant style signals resolve?
14. How should current Shopify theme settings influence a future direction when the merchant explicitly wants change?
15. How should a Shopify-versus-merchant conflict resolve when neither source clearly governs the disputed meaning?
16. What is the final deterministic tie-break when an authoritative source has no meaningful order?
17. What is the canonical industry model for genuine multi-domain merchants?
18. How far may audience intent be inferred before one explicit merchant question is required?

### Responsive, accessibility, resources, and provenance

19. How should mobile-specific DNA differ from desktop beyond mandatory safe adaptation?
20. How much explanation should Calinium show when accessibility constrains an aesthetic request?
21. What measured responsive and performance thresholds determine whether a preferred resource or DNA state is eligible?
22. Should safe Design DNA provenance be included in the external generated-theme manifest?
23. Should locale, Market, and B2B variations live inside one DNA revision or in linked approved variations?
24. Whether Preview theme remains a Recommended Resource Set slot or becomes a separate preset/preview decision.
25. How do merchant-approved resource changes update one DNA dependency without reopening unrelated choices?

### Approval, correction, and preview

26. Can Quick Start combine preset acceptance with another explicit approval event, or must preset approval remain separate?
27. When should a later correction reopen an approved dimension rather than preserve it?
28. Is undo/redo scoped to one conversational refinement or the whole current candidate?
29. What evidence threshold makes the first Provisional preview visible?
30. Does Preview appear after the first meaningful answer or only after a complete recommendation?
31. Does the first Preview use a local review renderer or generated Shopify JSON?
32. Should device controls appear before design approval?
33. May public-website screenshots be retained or shown, and under what privacy/provenance rules?

### Related upstream decisions preserved here, not owned here

34. Does optional website analysis begin immediately after URL submission or require separate confirmation?
35. Can website factual statements become review candidates, or only contextual leads?
36. Should Calinium remember approved design preferences across projects, and what consent/clearing model would that require?
37. How and when should the optional subscription be introduced without distracting from Delivery?

Interaction layout, streaming transport, premium-theme checkout channel, and subscription entitlement questions remain in their governing documents. They must not be resolved indirectly through Design DNA.

## 63. Implementation Readiness

This product contract is ready to govern the next Recommendation Engine design phase. The repository already provides the bounded vocabulary and executable constraints needed for Beta: six approved preset identities, industry/personality/design-language registries, layout recipes, page blueprints, section compatibility and capabilities, real Theme Editor setting families, canonical content/resource approval systems, and deterministic read-only generation.

Implementation must first define a versioned normalized DNA contract and compiler boundary without adding runtime controls. It must map every state to an existing verified capability or explicit omission/fallback; preserve merchant, preset, strategy, resource, page, section, accessibility, performance, and runtime precedence; and prove deterministic revision behavior before generation consumption.

The open product decisions above do not block the Recommendation Engine product contract because that contract can preserve them as explicit policy inputs. They do block silently choosing UI visibility, auto-approval, cross-preset blending, or new runtime behavior.

**Readiness: Ready for Recommendation Engine product contract**
