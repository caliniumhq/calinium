# Calinium Core 2.0 — Phase A Architecture Contracts

## Status and scope

Phase A registers the existing Calinium One 1.0 storefront architecture as a versioned, selectable system without changing its presenters or merchant-visible output. It introduces one profile only:

```text
profile.current_calinium.v1
```

This profile is the legacy/current Calinium storefront architecture. Phase A does not add Editorial Discovery or any other architecture variant, merchant-facing architecture questions, visual repair, new storefront behavior, theme upload, publishing, or automatic updates.

## Core boundary

The generation order is:

```text
Store Intelligence + Merchant Intent
→ architecture eligibility
→ compatibility
→ deterministic Phase A fit
→ no material question
→ frozen architecture selection
→ preset and Design DNA
→ composition and draft configuration
→ generated storefront
```

Architecture answers which structural storefront system is used. Presets and Design DNA remain authoritative for compatible composition and presentation, but cannot replace the selected architecture families. The existing preset catalog remains intact and all six Beta presets are compatible with the current profile.

## Registries

The family registry is `config/calinium-architecture-families.json`, validated by `schemas/calinium-architecture-families.schema.json`. The profile registry is `config/calinium-architecture-profiles.json`, validated by `schemas/calinium-architecture-profiles.schema.json`.

The current family registrations are:

| Family | Registered ID | Existing runtime represented |
| --- | --- | --- |
| Header/navigation | `family.header_navigation.current_calinium.v1` | Header group, announcement bar, disclosure navigation, mobile drawer |
| Product card | `family.product_card.current_calinium.v1` | Canonical product card, price, product form, responsive media |
| Collection/merchandising | `family.collection_merchandising.current_calinium.v1` | Collection banner, product grid, facets, sorting, pagination |
| Product detail | `family.product_detail.current_calinium.v1` | Product template, media gallery, variants, product form |
| Cart | `family.cart.current_calinium.v1` | Cart page, cart drawer, shared items and summary |
| Responsive behavior | `family.responsive_behavior.current_calinium.v1` | Mobile-first layout, responsive media, 48rem transition, reduced motion |

Registrations point to the production Liquid, JSON, CSS, JavaScript, and snippet files. They do not copy or wrap those presenters. Runtime file availability and capability references are catalog validation requirements.

## Current profile

`profile.current_calinium.v1` has profile schema version `1.0` and profile version `1.0.0`. It selects exactly the six current families and requires the existing cart, merchandising, navigation, product-card, responsive-media, search/filter, spacing, and motion/accessibility capabilities.

Its compatibility boundary is:

```text
Target theme: Calinium One 1.0
Compiler: 1.0.0
Presets: Atelier, Maison, Gallery, Ritual, Essential, Signal
Design DNA engine: design-dna-v1
```

An omitted profile deterministically falls back to this profile. An explicit unknown or invalid profile fails closed and never falls back silently.

## Store Intelligence contract

`schemas/calinium-store-intelligence-contract.schema.json` provides the architecture-selection projection of the existing Store Intelligence revision. It records:

- contract and normalization versions;
- the immutable source revision when available;
- usable, partial, stale, failed-refresh, or unavailable status;
- bounded Shopify-authoritative facts;
- capability signals relevant to later profile eligibility;
- confidence and source authority.

This contract does not replace Automatic Merchant Intake. It is a bounded, deterministic input to architecture selection and intentionally excludes secrets and raw Admin API payloads.

## Merchant Intent contract

`schemas/calinium-merchant-intent.schema.json` distinguishes:

- inferred Shopify facts;
- merchant-provided answers;
- explicit merchant preferences;
- confidence and basis;
- at most one unresolved architecture-changing decision;
- source provenance;
- parent and deterministic revision identity.

Phase A does not activate an architecture question. With insufficient signals, the current profile remains the safe default. Merchant Intent never converts inference into a confirmed merchant fact.

## Selection and compatibility

`ai/architecture/select-architecture.js` freezes a validated selection revision before Design DNA and composition. A frozen selection contains the profile and version, selected family identities and versions, source, reason, eligibility result, deterministic Phase A fit result, inactive material-question state, input revision references, fallback record, compatibility result, and lifecycle boundary.

`ai/architecture/compatibility-solver.js` is deliberately minimal. It rejects:

- unknown profile or family IDs;
- a family assigned to the wrong family type;
- unavailable runtime capabilities;
- missing family dependencies;
- incompatible family pairs;
- invalid profile versions;
- preset or Design DNA engine versions outside the selected profile boundary.

Eligibility occurs before compatibility and fit. Phase A records a deterministic single-candidate fit (`rank: 1`, `score: 1`) only to make the lifecycle and trace explicit; it is not a multi-profile optimization engine and is never exposed as merchant scoring. Phase A has one default-eligible profile, no competing candidates, and no merchant-facing selection question.

## Frozen selection and fallback

The default selection is deterministic for the same registry versions, Store Intelligence revision, and Merchant Intent revision. The revision checksum covers the canonical selection contents. Consumers revalidate the profile version, family selections, compatibility, and revision checksum before use.

Fallback is allowed only when no profile was supplied or, in future, when signals are insufficient. An invalid explicit selection is a hard failure. Presets and Design DNA receive the frozen selection as an immutable boundary; they cannot write family identities.

## Generation traceability

Architecture provenance is carried through:

- the server-authoritative generation approval;
- the immutable paid input snapshot for newly purchased generations;
- the generated-theme manifest;
- the Theme Specification;
- the custom-theme generation metadata artifact.

The trace records the selection revision, profile/schema/profile versions, selected family identities and versions, selection reason, eligibility and single-candidate fit results, inactive material-question state, Store Intelligence revision, Merchant Intent revision, compatibility result, and fallback. Existing preset and Design DNA provenance remain separate in the same generation manifest, so debugging can correlate architecture, preset, and presentation without conflating ownership. Architecture trace data stays outside Shopify template and settings JSON.

Paid generation retries consume the architecture selection frozen in the paid snapshot. They do not consult newer project state. Historical paid snapshots created before Phase A resolve only to the current profile and do not acquire a new architecture or merchant decision.

## Backward compatibility

Callers without Core 2.0 metadata resolve `profile.current_calinium.v1`. Low-level legacy generator approvals remain accepted and receive the current profile in generated provenance. New production pipeline approvals bind the exact architecture provenance.

Phase A makes no changes to production Liquid, theme JSON templates, CSS, JavaScript, preset definitions, strategy mappings, billing behavior, Shopify scopes, publishing behavior, or merchant UI. Read-only package generation remains authoritative.

Parity validation compares implicit default selection with an explicit frozen current-profile selection. Homepage JSON, settings data, section identities, deterministic instance IDs, and order must remain semantically equal.

## Validation

Run the focused gates with:

```bash
npm run validate:core-2-architecture
npm run test:core-2-architecture
```

The validation checks schema and cross-registry integrity, presenter file existence, capability availability, the current default, deterministic contracts, safe rejection cases, trace propagation, generated-output parity, read-only behavior, and output cleanup. Existing preset and generator suites remain regression gates.

## Deferred work

The following are intentionally deferred until separately approved:

- additional architecture profiles or family variants;
- `profile.editorial_discovery.v1`;
- architecture fit scoring across multiple eligible candidates;
- the optional material-question interaction;
- merchant-facing architecture selection UI;
- presenter adapters or rebuilt Shopify primitives;
- visual-QA repair loops;
- Phase B and Phase C work.
