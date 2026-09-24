# Calinium Core 2.0 — Storefront Render and Capture Harness

## Status and scope

This document defines the Phase B internal harness that observes the storefront produced by Calinium in a real browser. Phase B renders only the architecture registered as:

```text
profile.current_calinium.v1
```

The harness creates reproducible visual evidence; it does not judge visual quality. It does not introduce `profile.editorial_discovery.v1`, new storefront architecture families, merchant-facing preview controls, AI visual scoring, AI repair, billing changes, approval changes, theme publishing, or live-theme mutation.

The governing loop is:

```text
immutable generated theme
→ authorized non-live Shopify preview
→ deterministic route resolution
→ browser readiness gate
→ desktop/mobile capture
→ machine-readable Render Result
```

Phase C may compare two architecture profiles through this boundary. Phase B changes no presentation architecture to demonstrate that comparison.

## Existing infrastructure reused

The harness is an observer layered over the current production contracts rather than a second generator or preview system.

| Existing subsystem | Phase B use | Boundary preserved |
| --- | --- | --- |
| Read-Only Theme Generation Engine | Supplies the complete, validated `storefront-theme/` package, generation manifest, and frozen architecture provenance. | It never writes to Shopify or changes `apps/theme/`. |
| Core 2.0 architecture registry and selection | Supplies `profile.current_calinium.v1`, its exact version, family selections, and frozen selection revision. | The capture harness cannot select or change an architecture. |
| Review/deployment lifecycle | Can place an explicitly approved package on an unpublished or development theme and records a preview URL. | Its explicit approval and `--execute` gates remain outside the harness. |
| Development-theme deployment adapter | Rejects `main` and `published` targets and limits an upload to approved configuration. | The capture harness does not call publish and does not broaden deployment permissions. |
| Preview Verification Engine | Supplies existing read-only deployment identity, checksum, template, section, settings, and history checks. | Browser capture complements rather than replaces those checks. |
| Dashboard Live Preview Engine | Supplies a pre-payment, canonical-state visual model for the merchant experience. | That bounded local preview is not represented as Shopify storefront runtime evidence. |
| Theme Check and package validation | Establish the source package's structural validity before a trusted Shopify render. | A screenshot does not replace package validation or Theme Check. |
| Playwright | Drives a real browser, records browser failures, applies deterministic emulation, and writes screenshots. | Browser automation is read-only against the rendered storefront. |

The repository previously had package generation, a development-theme preview URL, configuration deployment, and read-only verification, but no browser-level capture contract joining those stages. In particular, the dashboard's Live Preview model is useful product feedback but does not execute Liquid inside Shopify and is therefore not a faithful substitute for this harness.

## Render architecture

The Phase B harness separates four concerns:

1. **Contract validation** rejects incomplete, unversioned, or unsupported render requests before a browser opens.
2. **Target and route resolution** binds an immutable generated artifact to a trusted preview origin and deterministic fixture entities.
3. **Browser capture** opens each requested route and viewport, applies the readiness gate, records objective observations, and produces an image.
4. **Result finalization** writes a validated result with enough provenance to repeat or compare the capture.

This boundary is deliberately one-way. Generated evidence flows into capture; captured browser state never flows back into the generator, architecture selection, merchant approvals, or Shopify configuration.

The implementation is organized under `ai/storefront-render/`. Its versioned inputs are `config/storefront-render-viewports.json`, `config/storefront-render-routes.json`, and the operator-controlled allowlist in `config/storefront-render-targets.json`; its JSON contracts are `schemas/calinium-storefront-render-request.schema.json` and `schemas/calinium-storefront-render-result.schema.json`. `fixtures/storefront-render-current-calinium.json` binds the controlled Phase B baseline without placing browser credentials or generated screenshot binaries in source control.

## Render Request contract

The Render Request is a versioned internal contract with contract ID `storefront-render-request-v1` and deterministic render revision `storefront-render-v1`. A valid request identifies the work to observe without accepting arbitrary presentation mutations. Its required semantic fields are:

| Field | Meaning |
| --- | --- |
| Contract version | Version of the Render Request shape and validation rules. |
| Render revision | Versioned deterministic render policy (`storefront-render-v1`). |
| Generation or artifact ID | Immutable generated package being observed. |
| Generation revision | Immutable generation provenance associated with the package. |
| Architecture profile | Exact registered profile ID and profile version. |
| Architecture selection revision | Exact frozen selection carried by the generated manifest. |
| Target | Controlled fixture/store-preview identity and immutable fixture version; never a merchant-supplied security assertion. |
| Generated theme source | Trusted package/workspace identity and integrity reference. |
| Routes | Ordered, bounded semantic routes to capture. |
| Viewports | Ordered viewport-profile IDs from the versioned viewport registry. |
| Capture purpose | Bounded internal purpose such as current-profile baseline or later profile comparison. |

Normalization is deterministic: object key order is irrelevant, requested routes and viewports are projected into their versioned registry order, and equivalent inputs produce the same request ID. A comparison-fixture revision commits to the store, merchant fixture, real resources and their revisions, binding policy, routes, viewports, and capture policy while intentionally excluding the architecture profile. This lets Phase C change only architecture without losing proof that the other inputs stayed fixed.

The executable request is revalidated against files on the trusted server immediately before runtime. The ZIP digest must match its manifest; artifact and source-artifact manifests must agree on preset and architecture provenance; source and materialized artifact digests must match; and the resource-binding and comparison-fixture revisions must agree. A self-consistent caller-supplied request ID is therefore insufficient to substitute a ZIP or selection revision. A caller cannot use the request to add a new architecture profile, substitute the generated artifact, publish a theme, provide executable browser code, or override the resolved Shopify entity.

Unknown architecture profiles fail closed. For Phase B, the only accepted profile is `profile.current_calinium.v1`. The request's profile, selection revision, generation, and generated manifest must agree before navigation begins. Its safety object fixes the Shopify write boundary to `development_theme_only` and fixes live-theme, publish, and cart-mutation permissions to `false`.

## Render Result contract

The Render Result uses contract ID `storefront-render-result-v1`. A request-level `render-manifest.json` indexes one validated `results/<render-id>.json` entry for every route-and-viewport capture. Each entry records:

| Field | Meaning |
| --- | --- |
| Render ID | Stable identity of the capture run. |
| Render revision | Request revision that the result fulfills. |
| Architecture profile and version | Profile actually bound to the generated artifact. |
| Architecture selection revision | Frozen Core 2.0 selection observed by the harness. |
| Generation/artifact identity and generation revision | Exact immutable source of the preview. |
| Route | Semantic route and resolved path. |
| Entity | Exact product, collection, or cart state selected for the route, when applicable. |
| Viewport | Versioned viewport ID and effective width, height, scale, and emulation settings. |
| Final URL | URL after navigation and redirects, sanitized of credentials. |
| Screenshot reference | Relative runtime-artifact path, file size, and digest where the implementation records one. |
| Render timestamp | Observation time; excluded from semantic comparison. |
| Status | Success or bounded failure state. |
| Browser evidence | Console errors, uncaught page errors, failed resources, and response status where available. |
| Deterministic checks | Route, landmark, dimensions, provenance, fatal-error, critical-resource, and screenshot checks. |
| Readiness evidence | Which readiness conditions completed and which timed out or failed. |
| Reproduction provenance | Harness, browser, viewport, route-registry, target, comparison-fixture, capture-policy, and contract versions needed to repeat the capture. |

Console messages and URLs must be sanitized before persistence. Results must not contain credentials, cookies, authorization headers, Shopify access tokens, local secret paths, or browser storage state. A failed capture still writes a result entry when safe so the failure is diagnosable and comparison matrices do not silently lose a cell.

## Versioned viewport definitions

Phase B intentionally uses a small stable matrix:

| ID | CSS viewport | Scale | Input | Color/motion |
| --- | --- | --- | --- | --- |
| `desktop-v1` | 1440 × 900 | 1 | Mouse/keyboard | Light scheme, reduced motion |
| `mobile-v1` | 390 × 844 | 1 | Touch-capable mobile | Light scheme, reduced motion |

The viewport definition, not an incidental local browser window, owns the effective dimensions. The capture records the effective dimensions and fails the dimension check if they differ. Locale, timezone, color scheme, device scale, and reduced-motion behavior are fixed by the harness wherever the browser supports them.

New viewport profiles may be added later under new IDs or registry versions. Existing definitions must not be silently reinterpreted because that would make historical comparisons ambiguous.

## Standard routes and deterministic entities

The supported semantic route IDs are:

| Route | Shopify path shape | Entity rule | Phase B requirement |
| --- | --- | --- | --- |
| Homepage | `/` | No catalog entity. | Required |
| Collection | `/collections/{handle}` | Explicit versioned fixture/resource binding. | Required |
| Product | `/products/{handle}` | Explicit versioned fixture/resource binding. | Required |
| Cart | `/cart` | Empty cart or explicitly controlled isolated cart state only. | Optional when safely representable |

Phase B requires an explicit controlled fixture, Approved Resource Set, or approved resource-snapshot binding for every entity route. It never selects from a rendered page and never uses randomness, current time, browsing history, recommendation APIs, personalized results, or discovery order returned by a changing UI. The result records the selected resource ID, Shopify GID, handle, source revision, and resolution source.

The same normalized entity bindings must be reusable by Phase C. A two-profile comparison holds the merchant/store, product, collection, imagery, copy, commercial data, and other fixture inputs constant and changes only the architecture profile and its frozen selection revision.

An unknown semantic route, missing required entity, invalid handle, route outside the trusted preview origin, or redirect outside that origin fails safely. The harness does not turn arbitrary URLs into capture requests.

## Shopify rendering boundary

Liquid fidelity belongs to Shopify. The repository does not contain a complete local Shopify Liquid runtime, and Phase B must not imply that a static file server or the dashboard's local preview model is equivalent to a Shopify storefront.

The faithful baseline path is therefore a controlled Shopify development proxy. The capture runner verifies the ZIP digest and safe Shopify package roots, expands the trusted generated package under `output/.storefront-render-workspaces/`, and launches the existing Shopify CLI `theme dev` path for the configured development store. Playwright observes the loopback proxy URL while Shopify supplies the Liquid/runtime rendering. The temporary local workspace and process are cleaned after the run.

Preset demo fixtures historically use synthetic `shopify://fixture-resources/...` tokens to test generator structure without claiming they are real Shopify references. Those tokens are valid test provenance but Shopify correctly rejects them at runtime. The baseline command therefore creates a separate ignored controlled-render artifact: it verifies the immutable source ZIP and manifest, applies an explicit versioned fixture binding to real resources already present on the controlled store, omits only unavailable optional resource kinds declared by policy, rejects every unresolved fixture URI, and records the source artifact digest, `resource_binding_revision`, fixture version, and architecture-independent comparison-fixture revision. It never mutates the source ZIP or silently discovers replacements from a page. This adapter is test-environment materialization, not a second generator or a merchant content inference path.

This is not the production deployment lifecycle: it is controlled test infrastructure for a named fixture/store. Shopify CLI may synchronize its non-live development theme as part of `theme dev`, but the harness never selects, updates, replaces, promotes, or publishes a live theme. It cannot be used as a merchant deployment shortcut.

The safety rules are:

- a `main` or `published` theme is never an eligible capture-deployment target;
- the environment must resolve to a development or unpublished target, never `main` or `published`;
- the development proxy is restricted to the configured controlled test store and the exact generated artifact;
- `--live`, `--allow-live`, `--publish`, `--theme-editor-sync`, and arbitrary `--theme` targeting are prohibited, while live reload is disabled;
- the harness cannot call a publish operation and cannot replace a live theme;
- capture uses GET/navigation and observation only;
- preview URLs and theme IDs are server/trusted-configuration resolved, not accepted as merchant authority;
- credentials stay in the existing Shopify CLI/session boundary and never enter request/result artifacts; URL query credentials, bearer values, and common token/secret fields are redacted from persisted diagnostics;
- early startup failures use bounded `SIGINT` → `SIGTERM` → `SIGKILL` cleanup before returning an error, just as normal shutdown does;
- capture failure cannot weaken approval, billing, generation, or deployment state.

Local HTTP fixtures may be used for contract, readiness, and browser-failure tests. Such a fixture proves harness behavior only and must not be labeled a faithful Shopify baseline.

## Browser and readiness model

Capture readiness is condition-driven and bounded by a maximum timeout; it is not a fixed sleep. For each route and viewport, the harness performs the following conceptual gate:

1. Start browser instrumentation before navigation so early console, page, response, and request failures are not missed.
2. Navigate to the trusted resolved URL and require an acceptable main-document response and final origin/path.
3. Require `document.readyState === "complete"` and the Calinium storefront landmark `#MainContent`.
4. Wait for `document.fonts.ready` when the browser exposes the Font Loading API.
5. Resolve in-viewport and subsequently revealed lazy images, then require relevant image elements to complete; failed image resources remain recorded.
6. Allow existing storefront initialization to run and verify route-specific landmarks rather than firing synthetic Shopify lifecycle events.
7. Wait for a bounded stable-layout condition across successive animation frames or equivalent objective samples.
8. Disable or settle animations for the screenshot and pause autoplaying media without changing canonical content.
9. Recheck viewport dimensions, final route, expected architecture/generation provenance, and fatal errors.
10. Capture the full page and finalize its metadata.

Timeouts are safety ceilings, not the primary readiness mechanism. A timeout produces explicit failed readiness observations. It must never be converted to success merely because a delay elapsed. Results identify this policy as `storefront-readiness-v1`.

Reduced-motion emulation is enabled for deterministic evidence. The screenshot operation settles animations where supported. Video is paused at a deterministic initial state, carousels are prevented from drifting between slides, and date/time-sensitive or randomized fixture content is excluded or normalized at the fixture layer. The harness does not inject invented merchant content to stabilize a page.

## Deterministic machine checks

Phase B emits objective checks only:

- the main document loaded successfully;
- the requested semantic route resolved to the expected trusted route;
- the expected page landmark and route-specific surface exist;
- the effective viewport matches the registered definition;
- the generated artifact's architecture profile and selection revision match the request;
- no uncaught fatal page error occurred;
- no configured critical asset failed;
- a non-empty screenshot was created;
- the screenshot and result carry complete generation, architecture, route, entity, viewport, and render provenance.

Console warnings, optional third-party failures, dynamic recommendation responses, and non-critical asset failures may be recorded without being silently upgraded to fatal. The policy determining criticality is versioned and must remain deterministic.

The Shopify CLI loopback proxy has two specifically classified non-fatal platform signatures: its HTTP rewrite of Shopify's `origin_trials-*` script can be rejected by browser CORS, and Shopify's sandboxed web-pixel frame can report that service workers are unavailable without `allow-same-origin`. Both observations remain in the Render Result. The policy does not suppress other page errors or same-origin theme script, stylesheet, font, image, or main-document failures. A full-page screenshot may be wider than the registered mobile viewport when the storefront itself overflows horizontally; the exact screenshot width is preserved as objective baseline evidence while the effective browser viewport must still match the registry.

Theme Check, package integrity, and the existing Preview Verification Engine remain independent gates. Their evidence may be referenced by the result but is not recreated by the browser harness. Phase B performs no aesthetic score, premium-quality judgment, hierarchy preference, or AI repair decision.

## Artifact organization and naming

Runtime evidence is written under the repository's ignored `output/` tree. The canonical organization is designed for one-to-one comparison:

```text
output/storefront-renders/
└── <request-id>/
    ├── render-request.json
    ├── render-manifest.json
    ├── results/
    │   ├── <render-id>.json
    │   └── ...
    └── screenshots/
        └── profile.current_calinium.v1/
            ├── homepage/
            │   ├── desktop-v1--<render-id>.png
            │   └── mobile-v1--<render-id>.png
            ├── collection/
            │   ├── desktop-v1--<render-id>.png
            │   └── mobile-v1--<render-id>.png
            ├── product/
            │   ├── desktop-v1--<render-id>.png
            │   └── mobile-v1--<render-id>.png
            └── cart/
                └── <viewport-id>--<render-id>.png
```

Names are derived from validated, bounded IDs; path separators and arbitrary caller filenames are prohibited. Screenshot references stored in results are relative to the render root. A file digest distinguishes a changed image from a matching semantic capture, but Phase B does not require byte-identical screenshots across different browser binaries or operating systems.

Generated PNGs, browser profiles, Playwright traces, uploaded-theme workspaces, temporary preview state, and other large render artifacts remain disposable and ignored by Git. Small deterministic JSON fixtures may be versioned when they exercise contracts without embedding merchant-private data.

## Reproducibility and semantic comparison

A capture is reproducible when the following are fixed and recorded:

- Render Request and render-contract version;
- harness and readiness-policy version;
- browser engine/version;
- viewport-registry version and effective emulation;
- generated artifact identity and integrity;
- architecture profile, profile version, and frozen selection revision;
- target/fixture revision;
- semantic route and exact entity binding;
- preview theme identity and role, without credentials;
- locale, timezone, color scheme, and reduced-motion mode.

Timestamps, remote request timing, Shopify CDN selection, browser rasterization, font delivery, dynamic platform components, and third-party responses can still vary. Those differences are known nondeterminism, not permission to weaken provenance. Phase C should compare captures produced with the same browser/runtime environment whenever possible and treat image hashes as diagnostic rather than as the sole assertion.

The comparison key is conceptually:

```text
fixture revision
+ immutable resource/content fixture revision
+ semantic route
+ exact entity
+ viewport profile
+ capture-policy version
```

Architecture profile is the intentional comparison dimension. Timestamp and output location are not.

## Current Calinium baseline

The Phase B baseline uses only `profile.current_calinium.v1`. A successful baseline consists of at least these six result cells from one immutable generated artifact:

```text
homepage   × desktop-v1
homepage   × mobile-v1
collection × desktop-v1
collection × mobile-v1
product    × desktop-v1
product    × mobile-v1
```

Cart may be included only when a controlled, non-mutating state is available. The baseline command/result must identify the concrete fixture/store target and exact product and collection. Actual run IDs, file paths, environment dependencies, and any failed cells belong in the Phase B completion evidence rather than being fabricated in this architecture contract.

The committed baseline descriptor is `fixtures/storefront-render-current-calinium.json`. It points to the existing Essential/minimal-catalog demo as the immutable source artifact, an ignored deterministic controlled-render artifact, the controlled Calinium development store, and explicit Shopify collection, product, image, and menu bindings. Those bindings are inputs to reproducibility, not permission to query or select a different entity at capture time. Its cart request represents a fresh empty browser context and forbids cart mutation.

The approved Phase B observation metadata is retained separately in `fixtures/storefront-render-current-calinium-baseline.json`. It records the approved comparison fixture/key, policies, eight route/viewport cells, expected browser dimensions, full-page dimensions, and PNG SHA-256 values without committing screenshot binaries. It also preserves the current mobile-homepage horizontal-overflow observation as baseline evidence; this harness does not repair that storefront behavior.

## Failure, cleanup, and rerun behavior

One failed route/viewport must not be mistaken for a missing request. The result records its failure category and all safe evidence collected up to that point. Independent cells may continue where safe so a run provides a complete matrix.

An identical rerun resolves to the same deterministic request and render identities. It refuses to overwrite a prior result by default; the operator must supply the explicit bounded `--replace` option to replace only that exact request directory. Temporary browser state is isolated per run and cleaned in `finally` paths. A capture that throws after beginning a screenshot cannot leave an unreferenced PNG in the result tree. Cleanup never deletes generated source packages, deployment history, approvals, orders, artifacts, or unrelated output directories.

If the preview target is unavailable, unauthorized, published/live, redirects away from its trusted origin, or no longer matches the requested artifact, capture fails closed. No local approximation is substituted and called equivalent.

## Security and privacy

Render orchestration is internal and server/operator controlled in Phase B. It observes only a controlled fixture or authorized preview target. The following never appear in merchant-facing output or stored capture contracts:

- Shopify access tokens, session cookies, Theme Access credentials, or client secrets;
- local environment secrets and encryption material;
- browser storage state;
- arbitrary filesystem paths outside safe relative artifact references;
- private Admin API payloads not intended for the storefront;
- raw approval records or resource snapshots.

Request validation prevents path traversal, arbitrary executable hooks, arbitrary origins, and caller-supplied claims of architecture or generation provenance. Result sanitization removes query credentials and limits console/resource data to safe diagnostics. Store, project, generation, and preview authorization remain the responsibility of their existing authoritative services.

## Phase C visual-evaluator boundary

Phase B exposes a machine-readable evidence boundary suitable for a later evaluator. A future Phase C comparison can group results by fixture, route, entity, and viewport, then compare:

```text
profile.current_calinium.v1
vs
profile.editorial_discovery.v1
```

Phase C may evaluate hierarchy, whitespace, typography, image dominance, density, alignment, composition, mobile adaptation, clipping, collisions, empty space, rhythm, and architecture differentiation. Those are explicitly not Phase B result judgments.

Before comparison, Phase C must verify that all non-architecture inputs and capture-policy versions match. It must not compare different products, collections, copy, imagery, pricing, viewport definitions, or browser environments as if architecture alone caused the difference. Phase C must also preserve the Render Result as evidence rather than silently repairing the captured output.

## Limitations

- A faithful Shopify baseline depends on access to an eligible non-live Shopify preview target and valid operator authentication.
- The harness does not emulate Shopify Liquid locally and does not claim parity for local HTTP test fixtures.
- Product recommendations, app embeds, customer-specific content, geolocation, Markets, consent tools, and third-party apps can introduce remote nondeterminism; Phase B records it but does not solve every integration.
- Browser screenshots are not cross-platform pixel-perfect contracts. The deterministic assertion surface is request normalization, route/entity selection, readiness, provenance, checks, and artifact creation.
- Phase B does not provide visual regression thresholds, subjective scoring, automated visual repair, a merchant preview UI, multi-browser certification, or a large viewport matrix.
- Cart capture is optional until an isolated, deterministic, non-mutating cart state is proven.
- Capturing a preview proves what the browser observed at that time; it does not authorize deployment, release, upload, publication, or future updates.

## Operational validation

The Phase B source and contract gates are exposed through the repository's storefront-render commands. The focused validation must cover:

- Render Request and Render Result schema validation;
- stable viewport definitions;
- deterministic route/entity binding;
- safe invalid-route and unknown-profile rejection;
- complete screenshot metadata;
- condition-driven readiness rather than sleep-only capture;
- current-profile baseline orchestration;
- non-live/read-only target enforcement;
- cleanup and ignored runtime artifacts;
- Core 2.0 Phase A parity and Beta-critical regressions.

An environment-backed baseline is successful only when its actual Render Result validates and the required six screenshots exist. Source-level tests cannot be reported as an environment-backed Shopify capture.

The current operational commands are:

```text
npm run test:storefront-render
npm run validate:storefront-render
npm run capture:current-calinium -- --request-only
npm run capture:current-calinium -- --execute-development-render
```

`--execute-development-render` is intentionally required for the environment-backed run. `--replace` is additionally required to replace an existing result with the same request ID. The generic `capture:storefront` command accepts a previously validated request file and applies the same gates.

## Deferred work

The following remain deferred until separately approved:

- `profile.editorial_discovery.v1` and every new architecture family;
- two-profile visual comparison runs;
- visual-quality scoring or AI review;
- automated visual repair or convergence loops;
- merchant-facing preview controls;
- a local Shopify/Liquid runtime;
- theme upload, installation, publication, or automatic update behavior;
- broader device/browser matrices and full performance/a11y audit orchestration.
