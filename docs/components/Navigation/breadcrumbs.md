# Breadcrumbs

## Purpose

The Breadcrumbs component communicates the customer's current location within the storefront hierarchy and provides a quick way to navigate back to parent pages.

Breadcrumbs reinforce orientation, improve navigation efficiency, and support search engine understanding of site structure.

Breadcrumbs should clarify location—not replace primary navigation.

---

## Responsibilities

The Breadcrumbs component is responsible for:

- communicating the current page hierarchy
- providing links to parent pages
- improving customer orientation
- reducing navigation effort
- supporting SEO through structured hierarchy
- remaining accessible across all devices

The Breadcrumbs component is not responsible for:

- replacing the primary navigation
- displaying unrelated shortcuts
- acting as page headings
- promoting products or collections
- exposing internal store structure

---

## User Goals

The Breadcrumbs component should help customers:

- understand where they are
- return to previous categories quickly
- navigate large catalogs confidently
- reduce unnecessary backtracking

---

## Merchant Goals

The Breadcrumbs component should help merchants:

- improve navigation usability
- support product discovery
- reinforce store organization
- improve SEO
- maintain consistent hierarchy throughout the storefront

Merchants should organize content—not manually edit breadcrumb paths.

---

## Structure

A Breadcrumb trail consists of:

- Home — required
- Parent pages — optional
- Current page — required
- Separators — required

Example:

```
Home / Sunglasses / Men / Eclipse
```

---

## Required Elements

Every Breadcrumb trail requires:

- Home link
- logical hierarchy
- current page
- semantic navigation
- accessible separators

The current page should never be a clickable link.

---

## Optional Elements

Breadcrumbs may include:

- collection hierarchy
- blog hierarchy
- article category
- custom page hierarchy

Optional levels should only appear when they reflect the actual page structure.

---

## Supported Variants

### Standard

Displays a horizontal breadcrumb trail.

Recommended for most storefronts.

---

### Compact

Uses reduced spacing for smaller layouts.

---

### Minimal

Displays only the immediate parent and current page.

Example:

```
Home / Product
```

Suitable for shallow site structures.

---

## Component-Specific Rules

### Hierarchy Rules

Breadcrumbs should always represent the logical navigation hierarchy.

Typical examples:

Collection:

```
Home
Collections
Summer Collection
```

Product:

```
Home
Collections
Travel Bags
The Passage
```

Blog Article:

```
Home
Journal
Article
```

Pages should never appear in multiple conflicting hierarchies.

---

### Separator Rules

Separators should:

- remain visually subtle
- separate hierarchy levels clearly
- never become interactive

Common separators:

- /
- >
- Chevron Right

Separators should not be announced by assistive technologies.

---

### Link Rules

Every breadcrumb except the current page should be clickable.

Links should:

- navigate predictably
- preserve browsing context
- use concise labels

Avoid overly long breadcrumb labels.

---

## Supported States

### Default

Breadcrumbs display normally.

---

### Hover

Linked items provide subtle feedback.

---

### Focus

Keyboard users receive visible focus indicators.

---

### Active

Only the current page is active.

The current page should not function as a link.

---

## Responsive Behaviour

On smaller screens:

- breadcrumbs may wrap gracefully
- long labels may truncate visually
- hierarchy should remain understandable

Avoid horizontal scrolling whenever possible.

---

## Accessibility

Every Breadcrumb component must support:

- semantic navigation landmarks
- ordered hierarchy
- keyboard navigation
- visible focus indicators
- accessible current-page identification

The current page should expose the appropriate accessibility state.

---

### SEO Rules

Breadcrumbs should support structured data.

Where supported, structured breadcrumb markup should be generated automatically.

The visual hierarchy and structured data should always match.

---

## Shopify Settings

Merchants may configure:

- show breadcrumbs
- show home link
- compact variant

Merchants should not configure:

- separators
- spacing
- typography
- hierarchy generation

Hierarchy should be generated automatically from Shopify resources.

---

## Design Tokens

The Breadcrumb component should use semantic tokens for:

- typography
- spacing
- colors
- separators
- hover state
- focus state

Example token categories:

- breadcrumb-color
- breadcrumb-current-color
- breadcrumb-spacing
- breadcrumb-separator-spacing

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- color transition
- opacity transition

Avoid:

- sliding
- bouncing
- scaling
- decorative animations

---

## Performance Rules

The Breadcrumb component should:

- generate hierarchy efficiently
- avoid unnecessary JavaScript
- support server rendering
- avoid layout shifts
- reuse shared navigation components

---

## AI Guidelines

When generating storefronts, AI should:

- generate breadcrumbs automatically
- preserve the logical page hierarchy
- avoid duplicate navigation
- maintain accessibility
- support SEO
- reuse documented patterns

AI should never invent navigation paths that do not exist.

---

## Quality Checklist

### Purpose

- Current location is immediately understandable.
- Hierarchy is logical.

### Design

- Visual hierarchy is clear.
- Separators remain subtle.
- Current page is distinguished.

### Accessibility

- Keyboard navigation works.
- Current page is announced correctly.
- Focus indicators are visible.

### Responsive

- Breadcrumbs remain readable.
- Wrapping behaves gracefully.
- Labels remain understandable.

### Performance

- No layout shifts.
- Minimal rendering cost.
- No unnecessary JavaScript.

### SEO

- Structured data matches the visible hierarchy.
- Links reflect the actual navigation structure.

### AI Compatibility

- Hierarchy is deterministic.
- Existing navigation is reused.
- No fictional paths are generated.

---

## Future Compatibility

Before extending the Breadcrumb component, ask:

- Does the addition improve customer orientation?
- Does it reflect the actual store hierarchy?
- Can Shopify generate it automatically?
- Will merchants understand the setting?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Breadcrumb component should evolve through refinement rather than expansion.

Every breadcrumb should quietly reinforce orientation, reduce navigation effort, improve SEO, and help customers understand exactly where they are within the storefront.
