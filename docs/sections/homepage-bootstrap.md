# Homepage Bootstrap

`apps/theme/templates/index.json` is the canonical resource-free homepage baseline for Calinium One. It is intentionally restrained: full-screen hero, featured collection, image with text, rich text, and newsletter. Header and footer remain in their respective section groups.

## Safe defaults

- The hero falls back to the store's real name and a restrained theme-colour surface when no media is selected. It has no default call to action or merchant claim.
- Featured collection uses its existing non-interactive onboarding placeholders until a merchant selects a collection.
- Image with text uses an existing placeholder image and clearly replaceable starter copy when no image is available.
- Rich text provides clearly replaceable onboarding copy without a fabricated brand claim.
- Newsletter uses the existing Shopify customer form and localized defaults.

The standalone `templates/404.json` remains a separate `main-404` template and is never part of the homepage configuration.

## Generation precedence

1. Start with this canonical bootstrap.
2. Merge validated, explicitly approved merchant settings into matching baseline sections.
3. Add valid strategy sections without removing the bootstrap.
4. Reject invalid planned sections before configuration is written.
5. Validate the homepage structure and all referenced section files before packaging.

## Verification

Run:

```sh
node scripts/test-homepage-bootstrap.js
node scripts/test-theme-generator.js
npm exec --yes --package @shopify/cli@latest -- shopify theme check --path apps/theme --config .theme-check.yml
```

For an authorized unpublished-theme check, upload a fresh generated ZIP, open **Customize**, confirm **Home page** is selected, then verify the five starter sections, a selected collection, persistence after reopening, the storefront root URL, and a separate invalid URL for the 404 template.
