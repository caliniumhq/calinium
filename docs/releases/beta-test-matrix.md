# Calinium Beta Test Matrix

Release candidate: `calinium-beta-rc.1-2026-08-02`

## Presets and merchant domains

| Preset | Representative domain | Configuration/package | Rendered storefront | Required follow-up |
| --- | --- | --- | --- | --- |
| Atelier | leather/craft-led goods | Pass | Not run | Homepage, product, collection, cart, evidence sections, mobile purchase flow |
| Maison | luxury fashion/accessories | Pass | Not run | Premium visual pacing, collection discovery, restrained merchandising |
| Gallery | rugs/interiors/art | Pass | Not run | Lookbook, Editorial Grid, Shop the Look markers/fallback, media pacing |
| Ritual | skincare/beauty | Pass | Not run | Materials, FAQ, product purchase flow, no efficacy invention |
| Essential | limited-content catalog | Pass | Not run | Empty-state avoidance, collection filtering, commerce baseline, performance |
| Signal | SaaS/digital product | Pass | Not run | Product Highlights, FAQ, real CTA, technical clarity |

`Pass` means deterministic preset selection, expected section recipe/omissions, valid read-only package, and Theme Check. It does not mean visual approval.

## Browser and viewport coverage

| Browser or condition | Dashboard | Generated storefront | Status |
| --- | --- | --- | --- |
| In-app Chromium-like browser | Sign-up and Creative Director through Store Resources | Not available | Partial |
| Chrome | Not separately run | Not run | Manual required |
| Firefox | Not run | Not run | Manual required |
| Safari/WebKit | Not run | Not run | Manual required |
| 320×568 | Creative Director pass after focus fix | Not run | Partial |
| 375×667 | Creative Director pass after focus fix | Not run | Partial |
| 390×844 | Creative Director pass | Not run | Partial |
| 768×1024 | Creative Director pass | Not run | Partial |
| 1024×768 | Creative Director pass | Not run | Partial |
| 1366×768 | Creative Director pass | Not run | Partial |
| 1440×900 | Creative Director pass | Not run | Partial |
| 1920×1080 | Creative Director pass | Not run | Partial |
| 200% browser zoom | Not run | Not run | Manual required |
| 400% browser zoom | Not run | Not run | Manual required |
| Reduced motion | Static CSS contract present | Not run | Manual required |
| RTL | Not run | Not run | Manual required |
| Long translations/content | Not run | Not run | Manual required |

## Page and interaction matrix

| Area | Automated/static evidence | Live visual/interaction evidence | Gate |
| --- | --- | --- | --- |
| Homepage recipes | Six presets pass | Not run | Manual dev-store QA |
| Product page | Package/runtime validation passes | Gallery, variants, quantity, Add to Cart, sticky purchase, and recommendations not run | Manual dev-store QA |
| Collection page | Package/runtime validation passes | Filters, sorting, drawer, pagination, empty states not run | Manual dev-store QA |
| Cart page/drawer | Existing runtime/tests pass | Quantity, removal, checkout handoff, drawer/page synchronization not run | Manual dev-store QA |
| Shop the Look | Policy/materialization tests pass | Marker geometry, focus, mobile image, Product Card fallback not run | Manual dev-store QA |
| Complementary products | Fallback adapter tests pass | Shopify endpoint replacement behavior not run | Dev-store QA |
| Theme Editor | Static lifecycle contracts inspected | Add/remove/reorder/select/load/unload not run | Theme Editor QA |
| Creative Director | Local conversation, preset, resource gate, autosave/resume; full dashboard suite pass | Payment and real Shopify-resource journey not run | Live integration QA |

## Accessibility matrix

| Check | Result | Boundary |
| --- | --- | --- |
| Dashboard Lighthouse accessibility | 100 mobile and desktop | Sign-up route only |
| Heading hierarchy | Pass on tested Creative Director screen | Store Resources only |
| Named controls and labels | Pass on tested Creative Director screen | Store Resources only |
| Focus visibility | Visible on tested labeled control | Full keyboard traversal not completed |
| Sticky-header reflow | Pass after fix | All listed viewport sizes on Creative Director |
| Skip link, landmarks, drawers, modals, live regions | Static/runtime tests only | Manual storefront audit required |
| Screen-reader order and announcements | Not run | Manual audit required |
| Zoom/reflow and touch targets | Not fully run | Manual audit required |

## Release execution order

1. Run static schema, plan, mapping, preset, and materialization validators.
2. Run generator, merchant, package, and deterministic repeat suites.
3. Run the complete dashboard and security-focused suites.
4. Build the production dashboard.
5. Run direct Theme Check.
6. Install a generated package on the linked development store.
7. Execute the six-preset page/browser/viewport matrix.
8. Execute Theme Editor, keyboard, accessibility, and Lighthouse matrices.
9. Complete a Partner-eligible live test charge and callback.
10. Reissue the Go/No-Go decision with captured evidence.
