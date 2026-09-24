# Shop the look

## Purpose

Pairs one lifestyle image with up to six explicitly selected products. It is a non-draggable merchandising composition, not a hidden image-only shopping interaction.

## Settings and block API

Select desktop/mobile media, heading content, image ratio, vendor and Quick Add options, color scheme, and spacing. Each `product` block has a product plus `x_position` and `y_position` (0–100%) for its numbered marker. Positions are scoped CSS variables, not fixed IDs.

## Product and cart behavior

The side/list panel always renders canonical product cards. Markers only choose a visible panel after JavaScript; the complete product list remains usable without it. Quick Add uses the standard card/form behavior, so multi-variant products safely link to selection and sold-out products cannot submit.

## Accessibility and performance

Markers are labelled buttons with 44px targets; the panel list is labelled and no product is reachable only by a marker. Responsive media is lazy loaded and no hidden duplicate media is rendered. Editor block selection activates its associated marker/panel.

## Limitation and dependencies

Depends on responsive image, section heading, product card, and `ShopTheLookController`. Mobile positioning uses the regular list fallback rather than a second mobile hotspot coordinate system.
