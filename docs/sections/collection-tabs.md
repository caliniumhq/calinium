# Collection tabs

## Purpose

Features two to six collections in one compact product section without creating a new product-card design.

## Settings and block API

Configure heading content, product limit, responsive columns, image ratio, vendor/badge/secondary-image/Quick Add card options, View all, color scheme, and spacing. Each `collection` block provides a collection and optional `label` for the tab. The first valid collection is the initial tab, even if an earlier editor block is empty.

## Accessibility, performance, and empty state

Without JavaScript, a link list exposes every selected collection and the first panel is visible. After enhancement the section uses tab roles, selected state, keyboard Left/Right/Home/End navigation, hidden inactive panels, and block selection activation in the editor. Products are server-rendered and limited per tab; merchants should keep tab limits modest.

## Dependencies and limitation

Uses section heading, canonical product card, button/icon primitives, `CommerceTabsController`, and the shared stylesheet. It does not fetch or preselect variants.
