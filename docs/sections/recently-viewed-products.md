# Recently viewed products

## Purpose

Shows products viewed earlier by the same browser, on product templates only.

## Settings and behavior

Configure heading content, result limit, responsive columns, ratio, vendor/badges/secondary image/Quick Add options, color scheme, and spacing. There are no merchant product blocks. The controller saves only normalized product handles in `localStorage` under `calinium:recently-viewed:v1`, removes duplicates, caps stored history at 24, excludes the current product, and requests the current section through Shopify's Section Rendering API.

## Privacy, cart, and accessibility

No account data, cookies, analytics, or cross-device persistence are used. Returned products use canonical cards and their existing safe cart behavior. The section collapses if no valid product survives; the editor shows a truthful preview message. Loading status is labelled, and no live announcement fires for every result.

## Performance and limitation

Work is deferred to idle time and delayed while the tab is hidden; malformed or deleted handles are ignored. JavaScript is required to retrieve browser history, so no-JavaScript storefronts omit the empty section rather than fabricate results. It depends on `RecentlyViewedController`, product-card, loading spinner, and the existing product-form lifecycle.
