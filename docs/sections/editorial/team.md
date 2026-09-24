# Team

## Purpose

Team is a factual editorial section for approved public profiles of real team members, makers, advisors, or leaders. It presents names, roles, portraits, biographies, and optional contact/profile links only when each person and the merchant have approved publication.

**Currently implemented:** `team` renders a responsive list of up to twelve `team_member` blocks with optional portrait, name, role, biography, email, and link.

## Customer Goals

Customers should be able to understand who is publicly represented by the merchant, read clear approved role context, view real portraits where useful, and use approved public contact/profile links. The section must never expose a private person, fictional profile, or unapproved contact path.

## Merchant Goals

Merchants should be able to select only consented public team profiles, control grid density and image ratio, order members intentionally, and omit email/links/biographies that are not approved. They do not use Team to create company history, founder mythmaking, testimonials, product marketing, or an employee directory.

## Shopify Context

The stable runtime ID is `team`. Its schema allows twelve `team_member` blocks, supplies a preset, and has no audited `enabled_on` or app-block support. Brand-storytelling mappings recommend Team for Standard/About Page composition and, conditionally, after a Contact Form.

Canonical contexts are Standard Page, especially an approved About/People page, and Contact Page only where public role/contact details are intentionally relevant. Homepage use is conditional and must remain subordinate to orientation; Article use is rare and requires an editorially relevant approved profile. Product and Collection contexts are prohibited unless a person is directly relevant and approved. It is prohibited on Cart, Search, Collection List, Blog listing, 404, account, checkout, and global shell surfaces.

## Responsibilities

Team owns an ordered set of approved public profiles, local profile hierarchy, portrait grid, role presentation, optional concise biography, and optional public contact/profile links. It owns public-profile composition, not employment truth beyond merchant-approved content.

## Boundaries

It does not own founder history, full company timeline, Brand Manifesto, awards, testimonials, product marketing, staff credentials, organizational chart, hiring claims, private contact directory, or account systems. Founder Story owns the founder’s deeper narrative; a founder may appear as a concise Team profile only when that duplication is deliberate, approved, and non-conflicting.

Team must not infer people from store data, portraits, quotations, business addresses, social accounts, or generic brand language.

## Section Structure

```text
Team
├── Optional Section Heading (H2)
└── Team member list
    └── team_member block → optional portrait, H3 name, role, bio,
        optional mailto link, optional labelled profile link
```

**Currently implemented:** the grid is a `role="list"`; each member is an article with `role="listitem"`. The profile link renders only when both `link` and `link_label` exist; email renders as a localized `mailto:` link when `email` is present.

## Required Blocks

The only implemented block type is `team_member`, capped at twelve, with `image`, `name`, `role`, `bio`, `email`, `link`, and `link_label`. The schema does not make these individual fields required, but canonical public use requires an approved real name and role; portrait, biography, email, and profile link are optional and must have explicit publication approval.

## Optional Blocks

No optional block type is implemented. Portrait, biography, email, and link are fields of `team_member`, not separate media, quote, founder, award, or CTA blocks. Empty/deleted member blocks must be omitted rather than become anonymous cards.

## Block Composition

Team members are repeatable, reorderable, and capped at twelve. Source order is public reading order; it must be an approved presentation order, not an inferred org chart, seniority order, or chronology. Use one Team section per page and normally two to twelve complete profiles. Place it after Founder Story, Brand Manifesto, Brand Values, or factual orientation, then before Contact Form or a restrained closing region.

Do not repeat the same public profiles in adjacent Team or Founder Story sections unless the page has an explicit distinct purpose. Do not display a person twice to simulate a larger team.

## Component Dependencies

The audited runtime composes `Section Heading`, `Responsive Image`, `Rich Text` for biography markup, `section-spacing`, and brand-storytelling CSS. It uses native anchors for email/profile links. No Button, Icon System, carousel, portrait-specific controller, request, or observer is implemented.

## Content Rules

Every name, role, title, portrait, biography, quotation contained in a biography, achievement, employment statement, email address, and external/profile destination must be merchant-approved and permitted for public display by the individual where appropriate. Contact details require explicit consent and a real business purpose. Omit a field when consent, accuracy, continuing employment, or link ownership cannot be verified.

Do not invent team members, names, roles, biographies, credentials, achievements, locations, quotations, email addresses, employment status, portraits, social accounts, or profile links. Do not turn a founder’s biography into a generic team card without approved concise copy, or use Team to make product quality claims.

## Asset Requirements

`team_member.image` is optional and must be a current, rights-cleared, approved portrait of that person. `image_ratio` supports square, portrait, and landscape; Responsive Image lazy-loads selected assets. Informative portraits require accurate alternative text through the asset/renderer; if a portrait is decorative, nearby visible name/role must provide the profile meaning.

Never substitute stock, generated, AI-invented, former-employee, or ambiguous group imagery for a real member. The merchant must reassess portrait permission when a profile changes or employment ends.

## Supported Variants

- **Portrait grid:** **Currently implemented** through the default responsive grid.
- **Text-led profile grid:** **Currently implemented** when an approved portrait is absent; customer-facing use still requires name/role.
- **One/two mobile and two-to-four desktop columns:** **Currently implemented** through `columns_mobile` and `columns_desktop`.
- **Square, portrait, or landscape portraits:** **Currently implemented** through `image_ratio`.
- **Profile with public email and/or labelled link:** **Currently implemented** when the relevant approved field is present.

There is no founder-story, timeline, carousel, staff filter, private login, social-icon, quote, testimonial, or automatic team-data variant.

## Supported States

- **Fully configured:** approved profiles with real names/roles render server-side.
- **Portrait absent:** text-led profile may remain valid; design mode can show a placeholder but storefront must not use it as a public portrait.
- **Optional bio/email/link absent:** omit it cleanly.
- **Incomplete member:** current runtime can render a sparse article; canonical generation omits it.
- **No blocks:** design mode shows localized empty guidance; storefront omits the list.
- **Changed employment/withdrawn consent:** target governance requires removal or update before publication; no runtime consent/status system exists.
- **No JavaScript / reduced motion:** full list and native links remain usable; no controller is required.

## Theme Editor Settings

**Currently implemented stable section IDs:** `eyebrow`, `heading`, `text`, `heading_size`, `text_alignment`, `columns_desktop`, `columns_mobile`, `image_ratio`, `color_scheme`, `padding_top`, `padding_bottom`, `mobile_padding_top`, and `mobile_padding_bottom`.

**Currently implemented `team_member` IDs:** `image`, `name`, `role`, `bio`, `email`, `link`, and `link_label`; maximum twelve. Merchants may add, remove, duplicate, reorder, replace portraits, and edit biography fields. There is no consent capture, email/link validation, profile-status check, block-select controller, request, observer, or app-block support. Design mode is authoring guidance, not evidence that a profile is approved.

## Responsive Behaviour

The grid is mobile-first with one/two mobile and two-to-four desktop columns from 48rem. Portraits use stable chosen ratios and responsive lazy media. The contract requires no horizontal overflow from 320 px upward, natural wrapping for names/roles/email/links, 200%/400% zoom resilience, touch-safe links, long localized text, logical source order, RTL support, and no profile loss when the layout reflows.

Full RTL, high-zoom, assistive technology, and unusual-address manual QA is **Unknown**.

## Accessibility

The target is WCAG 2.2 AA. The local heading is H2; approved member names use H3; list/article structure preserves profile grouping. Portrait alternatives must be meaningful when informative. Email/profile links need clear accessible labels, keyboard operation, visible focus, adequate contrast, safe touch targets, and real destinations. Biography rich text must retain readable semantic hierarchy.

Do not communicate person identity, role, consent, or availability through portrait, color, layout, or motion alone. Verify email/link destination context, long names, zoom, RTL, and public-contact privacy manually.

## SEO and Structured Data

Team may add truthful public profile text but owns no H1, metadata, canonical URL, Organization, Person, Employee, Product, Article, Review, ItemList, or WebPage schema. Do not emit Person or Organization schema simply because a name/portrait appears. Do not generate biographies or profile keywords for SEO; centralized entity-schema ownership and evidence are required first.

## Performance Rules

The section is server-rendered with no local JavaScript, request, storage, observer, or timer. Portraits are responsive/lazy and selected ratio preserves layout. Limit profiles to twelve, avoid duplicate people sections, do not preload lower-page portraits, and keep optional biographies concise enough for stable layout. Public email/link rendering must not require a third-party profile embed.

## Motion Rules

No local animation, carousel, autoplay, timer, or focus movement is implemented. Profiles remain available without motion. Any future reveal effect must be optional, subtle, reduced-motion-safe, and must not delay profile reading or imply employment status.

## AI Guidelines

AI may select Team only for a permitted page with merchant-approved public profiles, verified roles, portrait permission where media is used, and consented contact/link details. It must preserve supplied name/role/biography wording, choose bounded grid density, preserve approved order, omit incomplete/withdrawn profiles, and avoid unnecessary overlap with Founder Story.

AI must never infer team membership, founder identity, employment, credentials, biographies, achievements, quotations, portraits, emails, links, consent, or public availability. It must omit the section when the merchant cannot verify people and publication rights.

## Implementation Audit

**Source evidence inspected:** `docs/sections/team.md` and `brand-storytelling-pack.md`; existing Founder Story was inspected as an authoritative related dependency and remained unchanged.

**Runtime evidence inspected:** `apps/theme/sections/team.liquid` schema/preset; Section Heading, Responsive Image, Rich Text, section spacing, brand-storytelling CSS; global Theme Editor lifecycle, manifest/mapping/capability evidence, templates, and validation scripts.

**Currently implemented:** twelve team-member blocks, responsive list/article profile rendering, optional portrait/bio/email/link fields, design-mode placeholder/empty guidance, native links, lazy portraits, and static no-JavaScript output. **Partially implemented:** sparse or duplicate profile blocks can render and external email/link/privacy approval is not validated. **Not implemented:** consent capture, employment status, contact verification, profile dedupe, social links, controller lifecycle, app blocks, or direct template assignment. **Unknown:** full RTL, zoom, manual accessibility, and public-contact privacy QA.

## Quality Checklist

- [x] Owns only approved public team profiles.
- [x] Separates Founder Story, Timeline, Manifesto, product, and private-directory ownership.
- [x] Documents exact settings/block IDs, consent/publication rules, ordering, variants, and states.
- [x] Preserves H2/H3 hierarchy, native links, responsive/lazy portraits, no-JavaScript reading, and SEO boundaries.
- [x] Requires deterministic omission rather than fabricated people or biographies.

## Future Compatibility

Preserve `team`, `team_member`, all listed stable IDs, profile source order, Responsive Image behavior, native email/link fallback, preset, and static no-JavaScript output. Future hardening may add consent/status validation, duplicate/incomplete-profile guidance, accessibility QA, profile-link governance, and safe generator mapping without silently changing public profiles.

Any future Person schema, app block, social integration, localization, preset, or generator capability requires explicit privacy, consent, and entity-ownership governance; it must never generate team data from inference.
