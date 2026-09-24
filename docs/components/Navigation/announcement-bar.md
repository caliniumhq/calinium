# Announcement Bar

## Purpose

The Announcement Bar communicates concise, store-wide information that is relevant to every customer.

It appears above the header and provides timely messages without interrupting the shopping experience.

The Announcement Bar should support commerce—not compete with it.

Customers should be able to ignore it without losing the ability to navigate the storefront.

---

## Responsibilities

The Announcement Bar is responsible for:

- communicating store-wide announcements
- highlighting important information
- increasing visibility of promotions
- reinforcing customer trust
- supporting global commerce messaging
- adapting across all viewport sizes

The Announcement Bar is not responsible for:

- replacing marketing banners
- displaying lengthy content
- providing navigation
- showcasing products
- acting as a notification center

---

## User Goals

The Announcement Bar should help customers:

- discover important store information
- understand promotions quickly
- identify shipping offers
- recognize important deadlines
- remain informed without distraction

---

## Merchant Goals

The Announcement Bar should help merchants:

- communicate promotions consistently
- announce seasonal campaigns
- highlight shipping offers
- reinforce customer confidence
- update store-wide messaging without editing page content

Merchants should configure messages—not presentation.

---

## Structure

An Announcement Bar consists of:

- Message — required

Optional:

- Link
- Icon
- Close button
- Multiple rotating announcements

---

## Required Elements

Every Announcement Bar requires:

- concise message
- readable typography
- accessible contrast
- responsive layout

Messages should remain short.

Recommended maximum:

- 100 characters

---

## Optional Elements

The Announcement Bar may include:

- call-to-action link
- leading icon
- dismiss control
- multiple announcements
- automatic rotation

Optional features should never distract from the primary message.

---

## Supported Variants

### Standard

Displays a single informational message.

Examples:

- Free Shipping on Orders Over $100
- Handmade in Morocco

---

### Promotional

Highlights limited-time campaigns.

Examples:

- Summer Sale — Save 20%
- New Collection Available

---

### Informational

Communicates operational updates.

Examples:

- Orders Ship Within 24 Hours
- Holiday Shipping Schedule

---

### Rotating

Cycles through multiple announcements.

Rotation should remain slow and unobtrusive.

---

### Dismissible

Allows customers to close the announcement.

Dismissal should persist during the browsing session.

---

## Component-Specific Rules

### Content Rules

Announcement messages should be:

- concise
- relevant
- factual
- customer-focused

Avoid:

- excessive punctuation
- all-uppercase text
- multiple promotions
- marketing jargon
- lengthy paragraphs

Good examples:

- Free Shipping on Orders Over $100
- New Arrivals Just Landed
- Complimentary Gift Wrapping Available

---

### Link Rules

If a message links elsewhere:

- the destination should match customer expectations
- the entire message or dedicated link should be clickable
- the destination should be obvious

Links should remain secondary to the message itself.

---

### Rotation Rules

If multiple announcements are displayed:

- only one should be visible at a time
- transitions should remain subtle
- customers should have enough time to read each message

Recommended interval:

- 5–8 seconds

Autoplay should pause when:

- hovered
- focused
- reduced motion is enabled

---

## Supported States

### Default

Displays normally.

---

### Hover

Links may provide subtle feedback.

---

### Focus

Interactive elements should display visible focus indicators.

---

### Dismissed

The announcement becomes hidden.

Dismissal should not affect page layout unexpectedly.

---

## Responsive Behaviour

The Announcement Bar should:

- remain readable on all devices
- avoid wrapping into excessive lines
- preserve consistent height where possible
- maintain comfortable touch targets

Very long messages should be avoided instead of relying on truncation.

---

## Accessibility

Every Announcement Bar must support:

- sufficient contrast
- readable typography
- keyboard accessibility
- accessible links
- accessible close controls
- reduced-motion preferences

Automatic rotation should never prevent reading.

---

## Shopify Settings

Merchants may configure:

- enable announcement bar
- message
- link
- icon
- dismissible
- rotation
- autoplay interval
- color scheme

Merchants should not configure:

- spacing
- typography
- animation timing
- responsive behavior

These belong to the Design System.

---

## Design Tokens

The Announcement Bar should use semantic tokens for:

- height
- typography
- spacing
- colors
- border
- transition

Example token categories:

- announcement-height
- announcement-background
- announcement-foreground
- announcement-spacing
- announcement-transition

---

## Motion Rules

Motion should remain subtle.

Allowed motion:

- fade transition
- gentle slide transition
- opacity changes

Avoid:

- bouncing
- flashing
- scrolling marquees
- decorative animations

Announcements should never compete with page content.

---

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

The Announcement Bar should:

- load with the page
- avoid layout shifts
- minimize JavaScript
- reuse shared motion utilities
- remain functional without JavaScript when displaying a single message

---

## AI Guidelines

When generating storefronts, AI should:

- display announcements only when meaningful
- keep messages concise
- prioritize customer value
- avoid multiple simultaneous promotions
- preserve accessibility
- reuse documented variants

AI should never generate misleading urgency or deceptive promotional messages.

---

## Quality Checklist

### Purpose

- Message communicates one clear idea.
- Content is relevant to all customers.

### Design

- Typography follows the design system.
- Layout remains balanced.
- Visual hierarchy is preserved.

### Accessibility

- Contrast requirements are satisfied.
- Interactive elements are keyboard accessible.
- Reduced-motion preferences are respected.

### Responsive

- Message remains readable.
- Touch targets are accessible.
- Layout adapts correctly.

### Performance

- No layout shifts.
- Efficient rendering.
- Minimal JavaScript.

### AI Compatibility

- Variant is documented.
- Message remains concise.
- Content is customer-focused.
- Existing patterns are reused.

---

## Future Compatibility

Before extending the Announcement Bar, ask:

- Does the message benefit every customer?
- Can the information be communicated elsewhere?
- Is the message concise?
- Will merchants understand the setting?
- Can AI generate it consistently?

If an existing variant satisfies the requirement, reuse it.

The Announcement Bar should evolve through refinement rather than expansion.

Every announcement should communicate important information calmly, clearly, consistently, and without distracting customers from the products.
