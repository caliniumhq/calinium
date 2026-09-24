# Standard Page

## Purpose

The Standard Page presents merchant-authored information in a calm, editorial Shopify destination. It gives customers a readable, trustworthy place to understand the merchant, its materials, care, policies, services, values, or other non-transactional information without turning every topic into a campaign landing page.

It owns ordinary Shopify Pages such as About, Our Story, Sustainability, Materials, Craftsmanship, Shipping, Returns, Warranty, Privacy, Terms, FAQ, Careers, Press, Wholesale, Retailers, Brand Story, Care Guide, Sizing Guide, and Gift Guide.

It does not own the Homepage, Product, Collection, Search, Collection List, Cart, Contact, Blog, Article, or 404 destination. It also does not own catalog browsing, commerce transactions, customer account activity, checkout, contact forms, or article publishing. Those page types retain their own specifications and source-of-truth responsibilities.

The Standard Page should communicate clearly, use generous whitespace, keep typography calm, and make hierarchy obvious. It may become landing-style only when the merchant intentionally has the approved content, media, and action destination to support that composition. Decorative density is never a substitute for useful information.

## Customer Goals

Customers should be able to:

- Understand the page topic quickly from one truthful H1 and a readable opening.
- Read merchant-authored information comfortably on a small screen, at browser zoom, with translated text, large text, RTL layout, keyboard navigation, and reduced motion.
- Find the specific policy, material detail, care instruction, brand story, or service information that brought them to the page.
- Open only real, relevant next destinations such as a policy, collection, product, guide, or external resource that the merchant has approved.
- Use disclosures, video controls, links, and optional media without relying on hover, scripted motion, or an assumed device.
- Receive a concise, honest empty or unavailable state when optional information cannot be presented, rather than filler, invented claims, or a broken layout.

## Merchant Goals

Merchants should be able to:

- Publish and maintain accurate information through Shopify Pages and the Theme Editor without becoming a page-builder specialist.
- Choose a restrained, appropriate composition for a policy, educational guide, brand narrative, FAQ, or intentional landing-style page.
- Use approved images, video, links, FAQs, and supporting sections only where they make the information clearer.
- Preserve the truth and meaning of authored copy, policies, legal content, claims, destinations, and source media through deterministic generation.
- Keep a compact text-led page when no verified supporting resources exist.
- Add or omit sections without losing the page’s purpose, reading order, accessibility, performance, or global storefront navigation.

## Shopify Context

The Standard Page uses Shopify’s `page` template type. The current canonical template is `apps/theme/templates/page.json`; it contains one active `main-page` section and no disabled or additional sections. `main-page` is explicitly enabled on the `page` template and has a single-instance limit.

The global Header, Footer, skip link, main landmark, global cart drawer, predictive search, localization controls, and account entry remain shell or enhancement responsibilities rendered by `apps/theme/layout/theme.liquid`. They are not Standard Page regions and this specification does not own their schemas or behavior.

Shopify owns `page.title`, `page.content`, page handle, URL, page-specific metadata, page visibility, localization context, and the assignment of the `page` template. The Standard Page owns hierarchy, role-based composition, content constraints, and safe use or omission of optional sections. Individual sections own their own schema, blocks, rendering, lifecycle, and progressive enhancement.

### Current implementation evidence

`apps/theme/sections/main-page.liquid` renders a semantic section within the global `main` landmark. When `show_title` is enabled, it renders the real `page.title` as the page H1 and connects the section with `aria-labelledby`. It renders `page.content` only when that content is non-blank. Its current settings are `show_title`, `content_width` (`narrow`, `standard`, or `wide`), `content_alignment` (`left` or `center`), and a theme color scheme.

`apps/theme/assets/section-main-page.css` applies a controlled reading measure, logical list and blockquote spacing, table overflow containment, and a maximum inline size for authored image, iframe, and video content. It does not create a fallback body, a breadcrumb, an editorial lead, or an alternate H1 when a merchant hides the title.

The section-schema audit found that `main-page` and `contact-form` are explicitly enabled on `page`. Most reusable editorial sections, including `rich-text`, `image-with-text`, `faq`, `video`, `editorial-grid`, `testimonials`, `logo-list`, `timeline`-style storytelling sections, `newsletter`, and `custom-liquid`, have no template restriction in their current schema. Technical availability does not make them appropriate for every Standard Page. Product-, collection-, search-, blog-, article-, cart-, and 404-specific main sections remain outside this page’s composition.

`rich-text` supports bounded text, heading, action, and content blocks; `image-with-text` supports responsive merchant-selected image treatment and a text companion; `faq` renders valid authored question-and-answer blocks and can emit section-level FAQ structured data when enabled; `video` supports Shopify-hosted or compatible external video with a poster or placeholder path. `custom-liquid` renders merchant-entered Liquid directly and therefore requires stricter governance than ordinary content sections.

The shared `meta-tags` snippet currently emits canonical URL, title, optional meta description, Open Graph, and Twitter metadata from Shopify’s page context. `layout/theme.liquid` emits Product or Article structured data only; it does not currently emit Standard Page `WebPage` or `BreadcrumbList` JSON-LD. Theme Editor section behavior is initialized through the shared section lifecycle; interactive optional sections such as FAQ and Video use their own scoped behavior controllers.

### Implementation strengths and gaps

The current baseline is quiet, readable, Shopify-native, and safe for a text-led page. It preserves real authored content instead of inventing a narrative. Its gaps are intentional baseline limitations: no default breadcrumb, no explicit empty-content authoring state, no Standard Page-specific structured data, no role-based guardrail for optional-section density, and no implementation-level assertion that an H1 remains available when `show_title` is disabled. Those are implementation-hardening opportunities, not permission to invent page content or alter this specification’s boundaries.

## Entry Conditions

Valid entry conditions include:

- A direct visit to a published Shopify Page URL.
- A verified global navigation, footer, policy, product, collection, blog, article, or in-page link.
- A localized or market-aware storefront URL that Shopify resolves to the same published page.
- Search-engine, shared, campaign, press, QR, or external traffic that intentionally lands on the page.
- A merchant preview in the Theme Editor.

The page must remain understandable without prior Homepage, catalog, advertising, account, or checkout context. It must not assume a customer is signed in, has seen a campaign, knows the brand terminology, has accepted marketing, or has reached the page from a particular product.

Unpublished, restricted, missing, or unavailable Shopify Page behavior remains Shopify routing and publication responsibility. The Standard Page must not masquerade as a published destination when the underlying page is unavailable.

## Page Structure

The conceptual structure is:

```text
Global Header
        ↓
Main landmark
        ├── Optional truthful orientation
        ├── Standard Page H1 and merchant-authored body
        ├── Optional supporting editorial regions
        ├── Optional concise next action
        └── Optional low-pressure continuation
        ↓
Global Footer
```

The current default composition is intentionally smaller:

```text
Global Header
        ↓
Main landmark
        └── main-page: optional H1 + real page.content
        ↓
Global Footer
```

The Standard Page should use the smallest composition that makes its information clear. Source order remains meaningful when every visual layout stacks. Header, Footer, global cart drawer, predictive search, and localization are not counted as page regions.

| Composition | Guidance | Appropriate use |
| --- | --- | --- |
| Minimum valid | H1 and readable merchant-authored body. | Policy, legal, concise care, concise service, or a short informational page. |
| Standard | H1, body, and one to three supporting regions. | Most educational, service, or brand-information pages. |
| Story-led | H1, body, and a deliberate sequence of supporting evidence. | A real merchant story, materials, craft, or process page with approved media and facts. |
| Landing-style | A restrained lead, body, selected proof or discovery, and one clear continuation. | Only when an approved merchant objective, real resources, and destination justify it. |
| More than six supporting regions | Requires a documented information architecture and performance review. | Exceptional long-form guides with distinct, verified content. |

## Required Regions

Every valid Standard Page requires the following role-based regions:

| Required role | Customer outcome | Current evidence and page rule |
| --- | --- | --- |
| Standard Page identity | Understand the topic immediately. | One truthful H1 identifies the page. `main-page` owns it when `show_title` is enabled. If a deliberate composition hides that title, another visible, semantically equivalent H1 must be present exactly once; otherwise the title must remain enabled. |
| Main content | Read the actual information. | The merchant-authored `page.content` is the baseline body. It must remain readable, safely formatted, and meaningful without optional sections. |
| Valid page layout | Navigate and consume content safely. | The global main landmark contains the page; a controlled reading width, logical source order, global Header, and global Footer remain present. |

The required body may include headings, paragraphs, lists, tables, images, and other Shopify-authored content only when it remains accurate and readable. An empty page must not be padded with invented copy, placeholder policy text, or generic promotional content.

## Optional Regions

Optional regions are chosen only when they clarify the page purpose, support a real merchant fact, or provide a verified next action. Omit them when their source content is absent, weak, duplicated, too promotional, or more appropriate to another page type.

| Optional region | Use when | Omit when |
| --- | --- | --- |
| Breadcrumbs | A truthful, stable hierarchy helps customers return to a real parent path. | The storefront has no meaningful hierarchy, the trail repeats global navigation, or it would imply a false parent relationship. |
| Hero | A defined page purpose needs a concise, approved visual lead that remains secondary to content truth. | The page is legal, short, resource-limited, or the image/copy would become decoration or an unverified campaign claim. |
| Rich Text | A distinct explanation, principle, callout, or summary benefits from its own readable region. | It repeats the authored body or fragments a short page into needless containers. |
| Image with Text | Approved media materially explains a process, material, person, place, or service. | No meaningful, consented, accessible image exists or text alone is clearer. |
| Gallery | Multiple approved images add factual visual understanding, such as materials, store locations, or care steps. | Images are decorative, duplicated, inaccessible, unapproved, or create a heavy page without explanatory value. |
| Video | A useful approved video demonstrates a process, care method, material, or story and has a poster/fallback. | Video repeats the text, lacks a transcript or useful controls where needed, would delay content, or has no performance justification. |
| FAQ | Merchant-approved recurring questions require concise, accessible answers. | Questions duplicate policy content, product information, contact support, or have no verified answers. |
| Timeline | Verified dates, milestones, or process stages clarify a real history or journey. | Dates are incomplete, speculative, decorative, or would create a false heritage narrative. |
| Comparison | Accurate, fairly comparable options or materials help a customer decide. | The comparison would use unsupported claims, unverified competitor information, or a misleading basis. |
| Testimonials | Real, approved testimonials or quotations provide relevant context. | Consent, attribution, source, or claim verification is absent. |
| Logo List | Approved press, stockist, certification, partner, or affiliation marks are factual and relevant. | Logos are decorative, unverified, imply endorsement, or create false social proof. |
| Newsletter | A real Shopify customer form supports an intentional subscription strategy. | It interrupts a policy or legal page, has no consent-ready source, or does not serve the page purpose. |
| CTA | One verified next destination helps a customer act after understanding the content. | No accurate destination exists, the page is legal/policy content, or the action pressures rather than helps. |
| Custom Liquid | A reviewed technical requirement has a named maintainer, accessibility review, performance review, and safe fallback. | AI is using it as an escape hatch, ordinary sections can meet the need, or ownership and maintenance are unclear. |
| App Blocks | A verified Shopify-compatible app capability materially helps the page and fails safely. | The app has no approved purpose, duplicates native content, harms performance, or leaves a broken state when unavailable. |

Optional media and actions must not replace the merchant-authored body. A page can remain complete with none of these regions.

## Section Composition

Section composition is role-based and deterministic. It must preserve the current `main-page` baseline until the merchant or approved generation deliberately adds a compatible region.

### Recommended flow

1. Optional truthful orientation, such as Breadcrumbs or a restrained lead, when it improves wayfinding.
2. The single authoritative H1 and merchant-authored body.
3. Supporting explanation, visual evidence, FAQ, or disclosure only when the page purpose requires it.
4. One concise, verified continuation when it helps the customer continue.
5. An optional low-pressure newsletter only when subscription has a distinct, approved purpose.

### Ordering rules

- Keep the page title and core authored information early; do not bury an About, policy, or guide beneath a visual lead or promotional card.
- Place evidence next to the claim or instruction it supports.
- Use one topic per region. Combine repeated short text into the authored body rather than producing several near-identical Rich Text sections.
- Put FAQ after sufficient explanatory content; do not use it to conceal essential policy terms.
- Place a CTA after the information that gives it meaning. One primary continuation is normally enough.
- Keep newsletter near the end and omit it from legal, privacy, terms, and other contexts where it distracts from required reading.
- Do not place several carousels, auto-moving regions, large media regions, or competing calls to action in sequence.
- Preserve logical source order; visual reordering must not make the page read differently for keyboard or screen-reader users.

| Classification | Standard Page rule |
| --- | --- |
| Globally required | Header, Footer, skip link, and main landmark remain outside editable page composition. |
| Page-functionally required | One H1, merchant-authored main content, and a valid readable layout. |
| Recommended | A concise orientation or supporting region only when it improves understanding. |
| Optional | All roles listed in Optional Regions, selected with source evidence and an omission reason. |
| Repeatable | FAQ entries, gallery items, timeline items, or distinct evidence regions when every instance has a clear purpose and heading. |
| Single-instance | The authoritative H1, core authored body, primary breadcrumb trail, and a page’s primary CTA. |
| Integration-dependent | App Blocks, reviews, maps, scheduling, social feeds, embedded media, localization-aware services, and other external capabilities. |
| Prohibited | Main Product, main Collection, main Search, main Cart, Blog, Article, account, checkout, contact-form, 404, catalog grid, fabricated proof, and unreviewed Custom Liquid as routine content. |

## Component Composition

The Standard Page composes existing components without redefining their responsibilities:

| Component or family | Standard Page relationship |
| --- | --- |
| Section Heading | Introduces an optional supporting region. It does not replace the page’s authoritative H1 unless that region is intentionally and safely designated as the sole H1 owner. |
| Rich Text | Presents bounded explanatory content. The page determines whether it adds information beyond `page.content`. |
| Responsive Image, Image, Gallery, Aspect Ratio, Placeholder Image | Render approved media and stable no-media geometry. The page determines whether media supports the informational purpose. |
| Image with Text, Hero, Video, Video Player, Background Media | Provide optional editorial treatment only when resources and reading context justify them. |
| Accordion, FAQ, Disclosure | Present bounded questions, answers, and detail progressively. They do not replace a visible page title or essential legal disclosure. |
| Timeline, Comparison, Testimonials, Logo List, Icon Row | Present verified evidence or structured explanation only when their respective data is genuine and approved. |
| Breadcrumbs | Provides optional hierarchy; it must reflect actual navigation rather than assumed category structure. |
| Button, Text Link, Icon, Newsletter Form | Present one verified navigation action or a distinct, legitimate subscription opportunity. Links navigate; buttons operate. |
| Alert, Inline Message, Empty State, Status Indicator | Communicate accurate contextual, unavailable, or empty states with the least disruption. They never become promotional copy. |
| Container, Section, Grid, Stack, Cluster, Split, Content Wrapper, Surface | Own layout mechanics and tokens. The page owns content priority, role selection, and source order. |

Components own their local semantics, interaction, motion, and accessibility. Sections own Theme Editor settings and block composition. The Standard Page owns the information architecture, region necessity, heading hierarchy, page-level content rules, and safe omission.

## Content Rules

Standard Page content must be accurate, specific to the merchant, concise enough to read, and supported by an approved source. It should explain rather than perform marketing theatre.

### Merchant-authored truth

- Preserve the merchant’s real name, policies, material facts, locations, dates, process descriptions, service terms, care instructions, availability boundaries, and legal language.
- No fabricated claims are permitted, including claims expressed through imagery, headings, captions, badges, quotations, or calls to action.
- Do not invent qualifications, certifications, awards, press mentions, customer counts, testimonials, origins, sustainability claims, service promises, delivery times, product details, people, quotations, or corporate history.
- Do not copy competitor content, paraphrase proprietary copy as if it were merchant-authored, or use unverified comparisons.
- Do not use keyword stuffing, hidden text, repeated headings, generic luxury filler, exaggerated superlatives, fake urgency, or unsupported commercial claims.
- If a necessary fact is unknown, omit it, label the need for merchant confirmation in an authoring workflow, or retain the merchant’s existing accurate text. Do not fill the gap with generated content.

### Typography and hierarchy

There is one effective H1. The body uses H2 for major topics and H3 for subordinate topics only when the document structure warrants them. Headings describe the content that follows; they are not styled paragraphs or keyword containers. Maintain readable paragraph lengths, meaningful ordered and unordered lists, table headers where tables are necessary, and generous but purposeful space between distinct ideas.

### Images and video

Images must be merchant-approved, relevant, appropriately licensed or consented, responsive, and accompanied by useful alternative text when they convey information. Decorative imagery must be treated as decorative rather than given invented descriptions. Images of people, locations, processes, certifications, or products must not make claims beyond what the merchant has confirmed.

Video needs a purpose, concise contextual heading or caption where useful, accurate controls, and a poster or static fallback. Autoplay is never needed to understand the page. Captions, transcript, or adjacent textual equivalent are required when spoken or visual information is essential to the page’s meaning.

### Calls to action and legal content

A CTA must lead to a real, verified destination and state the action plainly. It must not imply a promise, discount, delivery outcome, membership status, or availability that the merchant has not established. Legal, privacy, warranty, return, shipping, and policy content remains accurate, complete, and readable; it must not be shortened, reframed, or offset by decorative marketing content without merchant and, where appropriate, legal approval.

## Supported Variants

Variants are information-architecture choices derived from purpose, available resources, merchant goals, content length, and confirmed CTA need. They are not decorative presets and must record their selection rationale in any deterministic generation output.

| Variant | Select when | Composition | Do not select when |
| --- | --- | --- | --- |
| Editorial | A coherent merchant perspective benefits from concise narrative and selected authentic media. | H1, readable body, one or two evidence-led Image with Text, Gallery, or Rich Text regions, optional restrained CTA. | There is little verified narrative or media and a Minimal page is clearer. |
| Minimal | The page has short, direct, complete information. | H1 and `page.content`, with at most one supporting region. | Required information needs meaningful grouping, visual instruction, or recurring-question support. |
| Story-led | Verified history, process, makers, materials, or values are central to understanding the merchant. | H1, narrative body, structured evidence such as Image with Text or Timeline, optional FAQ or carefully placed continuation. | Facts, dates, images, consent, or provenance are incomplete. |
| Educational | The customer needs practical explanation, instructions, dimensions, care, or decision support. | H1, clear body hierarchy, instruction-oriented media when real, FAQs or comparison only when accurate. | The page is primarily legal or narrative and instructional structure would add noise. |
| Legal | The page presents policies, privacy, terms, warranties, or similarly formal content. | H1 and readable, stable merchant-authored body; optional Breadcrumbs only when truthful. | Promotional media, newsletter capture, persuasive CTAs, or decorative storytelling would distract from the policy. |
| FAQ-focused | A reliable set of recurring questions and approved answers is the main customer need. | H1, concise orientation, accessible FAQ, and links to canonical detailed policies when useful. | Answers are incomplete, one-off, or merely repeat an existing short page. |
| Landing-style | A specific approved informational objective needs a deliberate lead, evidence, and one real next step. | H1, a restrained Hero or visual lead, concise body, selected factual regions, and one verified CTA. | The page has no confirmed objective, resource plan, destination, or information density to justify it. |

Visual preset selection remains separate from page-variant selection. A quiet luxury token set never justifies inventing a story, image, or action.

## Supported States

| State | Required page behavior |
| --- | --- |
| Published page with title and body | Render one H1, readable real content, and any selected compatible regions. |
| Published page with title and no body | Preserve the real title; show only optional regions that contain verified content, or use a calm authoring/empty treatment where the implementation supports it. Never invent body copy. |
| Title hidden by setting | Render another single, visible, semantic H1 only when an intentional lead owns it; otherwise keep the baseline title visible. |
| Long-form content | Preserve hierarchy, readable measure, table containment, logical headings, and optional in-page navigation only when it reflects real headings. |
| Short policy or legal content | Prioritize stable readable text; omit decorative, promotional, or distracting regions. |
| Optional region without its required content | Omit the region or use its documented Theme Editor placeholder; do not create fake images, questions, testimonials, videos, or links. |
| Video, app, or integration unavailable | Preserve core authored content and show accurate contextual feedback only where a real failure state exists. |
| Localized, RTL, browser zoom, large-text, or narrow viewport | Preserve semantic source order, wrapping, logical properties, and access to all essential content. |
| Theme Editor preview | Expose the actual section controls and safe placeholders without presenting sample content as merchant truth. |
| Unpublished, inaccessible, or missing Shopify Page | Defer to Shopify routing, publication, password, or error behavior; do not render a fabricated Standard Page. |

Loading, empty, unavailable, and error states are distinct. An optional empty gallery is not a failed page; a failed integration is not an invitation to fabricate an Empty State; and a valid short page is not incomplete because it lacks media.

## Navigation and Actions

The primary action on an ordinary information page is reading and understanding. Links within the merchant-authored body navigate to verified destinations. A page may expose one primary CTA only when a customer has enough preceding context and the destination is real, relevant, and accurately labeled.

Secondary actions may include opening a disclosure, playing or pausing video, viewing a genuine gallery item, following a policy reference, moving through a truthful breadcrumb trail, opening an approved app capability, or subscribing through a real Newsletter Form. Links navigate; buttons operate an in-place control. Nested interactive elements, dead links, fake buttons, duplicate primary CTAs, and JavaScript-only navigation are prohibited.

On return from an optional overlay, dialog, video experience, or app surface, focus returns to the invoking control. In-page anchors may be used only when they correspond to real heading targets and remain useful without script.

## Responsive Behaviour

The Standard Page is mobile first and remains calm and readable at 320 px, 375 px, tablet portrait and landscape, laptop, desktop, wide desktop, browser zoom, large text, translated content, and RTL.

- The H1 and initial merchant-authored content remain early in source order; a desktop visual arrangement must not hide or reorder meaning on mobile.
- The current `main-page` reading measure adapts through the global page width and gutter tokens. Lists, blockquotes, images, iframes, video, and wide tables must remain contained or provide accessible horizontal table scrolling.
- Images use responsive rendering through their dedicated primitives; mobile media order, crop, and focal treatment must preserve meaning rather than merely fill space.
- Rich text, long legal headings, URLs, translated labels, lists, table cells, and CTA labels wrap without horizontal overflow or clipped controls.
- Optional split, grid, gallery, timeline, FAQ, and video regions stack in logical order. No essential content depends on hover, side-by-side width, or an on-screen pointer.
- Controls remain touch-friendly, visible, and keyboard usable. Motion is reduced under user preference and never prevents reading or navigation.

The page owns information priority; layout, media, disclosure, and action components own their responsive mechanics.

## Accessibility

The Standard Page targets WCAG 2.2 AA:

- One global main landmark, a working skip-link target, a meaningful document title, and exactly one effective H1.
- Logical H2–H6 hierarchy, descriptive link text, semantic lists, table headers, quotations, and content order that remains meaningful without CSS or JavaScript.
- Text alternatives for informative images; decorative media omitted from the accessibility tree; no essential text embedded only in imagery.
- Keyboard-operable links, disclosures, galleries, video controls, app controls, and any optional dialog; visible focus; no unexpected focus movement; and adequate touch-target size.
- FAQ and other disclosure controls expose their name, expanded state, and associated content. Visible content must remain available without the enhancement script.
- Hosted or external video has accessible controls when enabled, a useful title where needed, captions/transcript or equivalent information for meaningful media, and a static/poster fallback. Autoplay must not be required or force motion for reduced-motion users.
- Contrast, status, and action meaning never rely on colour alone. Content remains readable at 200% zoom and works with large text, RTL, localization, high-contrast preferences where supported, and reduced motion.
- Unique IDs, valid landmark relationships, no duplicate H1s from optional sections, no focusable content in visually hidden states, and restrained live-region use for real dynamic updates only.

Custom Liquid and App Blocks require their own accessibility review. They cannot weaken the accessible baseline simply because they render successfully.

## SEO

Standard Page SEO is based on accurate Shopify page data and visible content, not keyword volume.

- Use one H1 that accurately identifies the page. Heading hierarchy reflects the visible information architecture rather than target phrases.
- Maintain an accurate merchant-managed title and meta description. The current `meta-tags` snippet uses Shopify’s `page_title` and `page_description` with shop fallbacks; generation must not invent either.
- Use Shopify’s canonical URL. Avoid duplicate Page handles, materially duplicate page content, competing template assignments, and parameterized variants that pretend to be separate editorial destinations.
- Current Open Graph and Twitter metadata use the canonical URL, title, optional description, and `page_image` when Shopify provides it. A selected page image should be real, relevant, and appropriate to share.
- Use internal links only to real, relevant Shopify destinations. Avoid hidden links, link farms, repeated CTA destinations, keyword stuffing, copied competitor language, and claims about ranking.
- Legal and policy pages remain indexable or otherwise governed by the merchant’s verified SEO policy; the generator must not impose a `noindex` rule without that policy. Search is separately governed by the Search Page specification.

SEO metadata, Shopify page content, section copy, and application-provided metadata remain separate ownership layers. The page must never manufacture metadata or content merely to improve search visibility.

## Structured Data

The Standard Page may have one authoritative `WebPage` structured-data representation when the implementation can emit it from verified Shopify data. An optional `BreadcrumbList` is appropriate only when the visible breadcrumb trail is real, stable, and matches the rendered hierarchy.

`WebPage` data must reflect the actual rendered page title, canonical URL, and verified description or image where those fields exist. `BreadcrumbList` positions, names, and URLs must exactly match the visible navigational trail. Omit a field rather than infer it.

Do not use Product, Collection, Article, Search, FAQPage, Organization, Review, AggregateRating, Event, Offer, or other schema types merely because a Standard Page discusses those topics. Section-level FAQ structured data may be owned by a compliant FAQ section only when its visible questions and answers satisfy that section’s contract; it must not create a competing page-level schema owner. The current implementation has no Standard Page `WebPage` or breadcrumb JSON-LD; future implementation must centralize ownership and prevent duplication.

## Shopify Settings

Merchant-configurable settings should remain meaningful and bounded:

| Merchant-configurable content | Rules |
| --- | --- |
| Page title and `page.content` | Owned in Shopify Pages. They remain the primary source for the H1 and authored body. |
| Main page title visibility, width, alignment, and color scheme | Current `main-page` settings. Hiding the title requires a deliberate, equivalent sole H1 owner. |
| Optional section content | Headings, descriptions, approved media, FAQ answers, blocks, CTA labels/destinations, section visibility, spacing options, and color schemes belong to their compatible section schemas. |
| Optional media | Choose only real, approved Shopify-hosted media or merchant assets with accurate context and alternatives. |
| Custom Liquid and App Blocks | Expose only to an approved technical owner with a stated purpose and maintenance path. |

Design-system-controlled behavior includes typography scale and hierarchy, reading measures, gutters, spacing tokens, color-system contrast, responsive breakpoints, focus styling, disclosure behavior, media loading, animation timing, motion reduction, component semantics, and Theme Editor lifecycle cleanup.

Do not expose arbitrary colours, raw ARIA attributes, arbitrary animation speed, fake progress or proof values, unsupported layout controls, unbounded heading levels, technical schema choices, or settings that invite merchant-authored code as an ordinary content solution.

## Theme Editor Behaviour

The current `page.json` opens with one `main-page` section. A merchant can edit its bounded title visibility, reading width, alignment, and color scheme, and can edit the Shopify Page’s actual title and body through Shopify’s page administration. Optional compatible sections can be added only when they meet this specification’s role and content rules.

- Maintain one authoritative H1. If `show_title` is disabled, the selected lead must visibly render the only H1; otherwise restore the setting.
- Preserve existing merchant-authored `page.content`, section blocks, approved media, links, and genuine policy text during section reorder or preset application.
- Reorder sections only when the resulting source order preserves the recommended flow and the page still begins with orientation or core content rather than decoration.
- Use section placeholders only in Theme Editor design mode. Replace or remove all starter content before publication; sample copy, placeholder images, and default question blocks are not merchant facts.
- FAQ, Video, and other enhanced sections must initialize and clean up safely on Shopify section load, unload, select, deselect, block selection, reordering, and setting refresh. A section reload must not duplicate listeners, controls, timers, or media behavior.
- Custom Liquid and App Blocks require explicit merchant/technical review. The Theme Editor must not treat successful rendering as proof of accessibility, performance, content accuracy, or long-term support.

The Theme Editor helps merchants compose a page; it does not turn the Standard Page into an unrestricted application canvas.

## Performance Rules

The Standard Page is performance-first and content-first:

- Keep the initial body lightweight. For a text-led page, the H1 and real body are normally the primary rendering path and must not wait for media or JavaScript.
- Establish the real LCP candidate from the chosen composition. Do not introduce a large hero image or video merely to create visual drama; when selected, size and load it intentionally.
- Use responsive images, intrinsic dimensions or stable aspect-ratio reservations, accurate `sizes`, lazy loading for below-the-fold media, and eager/high-priority loading only for a justified above-the-fold lead.
- Defer or facade external video. Hosted video uses metadata-preload or a suitable static fallback; video must not block text, core rendering, or customer interaction.
- Keep the default template minimal. Add sections only when their content value outweighs their CSS, JavaScript, media, and layout cost.
- Avoid duplicated headings, media, carousels, app embeds, observer-heavy behaviors, heavy Custom Liquid, and layout shifts when optional regions load or are removed.
- Progressive enhancement is mandatory: core text, links, disclosure content, and safe media fallback remain available without JavaScript.
- Shared section controllers must initialize once and dispose timers, listeners, observers, media playback, and temporary DOM state on Theme Editor section lifecycle events.

The Standard Page must not delay navigation, form interaction elsewhere in the storefront, cart access, account access, or the readable body to load ornamental effects.

## AI Guidelines

AI generation must treat the Standard Page as an information architecture problem, not a prompt to invent an editorial campaign.

- Classify the page deterministically as Editorial, Minimal, Story-led, Educational, Legal, FAQ-focused, or Landing-style using the actual page purpose, available approved resources, merchant goals, content length, media availability, and verified CTA requirement.
- Choose the smallest valid composition. Minimal is preferred when it fully supports the customer goal.
- Preserve merchant-authored Page title, body, policy language, claims, source dates, links, media, and legal content. Never silently rewrite factual content into a more promotional voice.
- Select optional sections only when their required facts, media, consent, integration, and fallback are present. Record the reason for each selected region and each safe omission.
- Keep one H1 owner. Use the real `page.title` by default; never generate hidden duplicate H1s or use headings to inflate SEO terms.
- Reuse documented components and sections. Do not duplicate FAQ, form, gallery, Breadcrumb, media, action, feedback, or layout behavior in Custom Liquid or one-off markup.
- Use semantic HTML, Shopify-native primitives, responsive media, progressive enhancement, WCAG 2.2 AA, semantic tokens, restrained motion, and minimal JavaScript.
- Preserve deterministic output across the same approved inputs, compatible template version, and resource plan. Respect immutable purchased snapshots where generation is paid and snapshot-bound.
- Omit uncertain claims, unsupported CTA text, incomplete timelines, unverified testimonials, external app blocks, and weak media rather than synthesizing them.

AI must never invent merchant copy, product facts, certifications, awards, legal terms, testimonials, company history, people, images, videos, customer data, consent, local information, action destinations, SEO metadata, structured-data fields, or implementation guarantees.

## Quality Checklist

- [ ] The page is an ordinary Shopify Page and is not taking ownership from Homepage, Product, Collection, Search, Collection List, Cart, Contact, Blog, Article, or 404.
- [ ] One visible effective H1 accurately identifies the page, and all following headings are hierarchical and meaningful.
- [ ] Real `page.content` is present, readable, and remains useful without optional sections or JavaScript.
- [ ] The selected variant has recorded deterministic criteria based on purpose, resources, goals, content length, media, and CTA need.
- [ ] Every optional region has a specific information purpose, approved content source, and safe omission path.
- [ ] No invented claims, certifications, awards, quotations, testimonials, timeline facts, policies, images, media, prices, product facts, or action destinations appear.
- [ ] Legal and policy content is complete, readable, unambiguous, and not diluted by promotional content.
- [ ] Images, video, galleries, disclosures, tables, and app content meet their own accessibility, fallback, and performance requirements.
- [ ] Links navigate to real destinations; buttons operate controls; no nested interactive elements, dead CTAs, or duplicate primary actions exist.
- [ ] Layout has no horizontal overflow at 320 px, supports browser zoom, large text, RTL, localization, keyboard navigation, and reduced motion.
- [ ] Metadata, canonical URL, Open Graph data, and any `WebPage` or `BreadcrumbList` structured data are factual, singular, and match the rendered page.
- [ ] Theme Editor changes preserve merchant content, maintain H1 ownership, and do not create duplicate interactive controllers after reload.
- [ ] Core content is server-rendered, media is responsibly loaded, layout is stable, and optional enhancements cannot block reading.
- [ ] Custom Liquid or App Blocks have an approved technical owner, reason, accessibility review, performance review, and failure path.

## Future Compatibility

This specification establishes a stable, reusable contract for ordinary Shopify Pages. Future work may document individual sections, page presets, approved landing compositions, in-page navigation, Page-specific structured data, and implementation hardening only when the underlying Shopify-native behavior and merchant need are demonstrated.

Future refinement must preserve the Standard Page’s boundaries: page content remains merchant-authored, one H1 remains authoritative, optional regions remain evidence-led, legal content remains protected, components remain reusable, and baseline rendering remains readable without JavaScript. New variants, settings, blocks, applications, structured-data types, or motion treatments require a documented customer goal, merchant goal, accessibility review, performance budget, source-of-truth decision, migration path, and deterministic generation rule.

The next compatible documentation work may describe supporting sections, safe preset composition, deterministic AI selection, implementation hardening, or the separate Contact Page contract. It must not turn ordinary Pages into an uncontrolled collection of one-off templates.
