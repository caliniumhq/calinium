# Testimonials

## Purpose

The Testimonials component builds trust by presenting authentic customer experiences that reinforce product quality, service, and brand credibility.

It provides social proof without overwhelming the shopping experience.

Testimonials should feel genuine, editorial, and restrained.

---

## Responsibilities

The Testimonials component is responsible for:

- presenting customer feedback
- reinforcing trust
- supporting purchasing confidence
- highlighting customer satisfaction
- remaining accessible across all devices

The Testimonials component is not responsible for:

- replacing product reviews
- displaying every customer opinion
- ranking products
- functioning as a review platform

These responsibilities belong to dedicated review systems.

---

## User Goals

The Testimonials component should help customers:

- understand customer experiences
- gain confidence before purchasing
- discover authentic social proof
- make informed purchasing decisions

---

## Merchant Goals

The Testimonials component should help merchants:

- improve customer trust
- increase purchase confidence
- reinforce brand reputation
- improve conversion
- showcase authentic customer stories

Merchants should configure testimonial content—not component behavior.

---

## Structure

A Testimonials section consists of:

- Section Heading — optional
- Introductory Text — optional
- Testimonial List — required

Each Testimonial Card consists of:

- Quote — required
- Customer Name — required

Optional:

- Customer Title
- Company
- Product Purchased
- Rating
- Customer Avatar
- Date
- Verified Badge

---

## Required Elements

Every Testimonials section requires:

- at least one testimonial
- customer attribution
- accessible structure
- responsive layout

Testimonials should always appear authentic and believable.

---

## Optional Elements

Testimonials may include:

- customer image
- occupation
- company
- verified purchase badge
- star rating
- purchased product
- customer location

Optional metadata should support credibility without distracting from the testimonial.

---

## Supported Variants

### Editorial

Large quotations with generous whitespace.

Recommended for luxury brands.

---

### Grid

Displays multiple testimonials simultaneously.

Recommended for desktop layouts.

---

### Carousel

Displays testimonials one at a time.

Suitable when numerous testimonials exist.

---

### Featured

Highlights a single testimonial with larger typography.

Recommended for homepage storytelling.

---

### Minimal

Displays clean typography with minimal decoration.

Suitable for premium storefronts.

---

## Component-Specific Rules

### Quote Rules

Every testimonial should include:

- authentic customer wording
- readable line length
- clear typography

Quotes should remain concise.

Long testimonials should be abbreviated where appropriate.

---

### Attribution Rules

Every testimonial should identify:

- customer name

Optional:

- company
- profession
- purchased product
- location

Anonymous testimonials should be avoided whenever possible.

---

### Rating Rules

If ratings are displayed:

- use a consistent scale
- remain visually secondary
- support the testimonial rather than dominate it

Ratings should never replace written customer feedback.

---

### Avatar Rules

Customer avatars should:

- appear authentic
- preserve aspect ratio
- remain optional
- avoid excessive visual emphasis

The quotation should remain the primary focus.

---

### Carousel Rules

If a carousel variant is used:

- autoplay should be disabled by default
- keyboard navigation should be supported
- swipe gestures should be available
- navigation controls should remain subtle

Customers should always control navigation.

---

## Supported States

### Default

Testimonials display normally.

---

### Loading

Content loads progressively.

Layout dimensions should remain stable.

---

### Carousel Active

The currently displayed testimonial is clearly identified.

---

### Empty

If no testimonials exist, the component should not render.

---

## Responsive Behaviour

The Testimonials component should:

- adapt gracefully across all devices
- preserve comfortable reading width
- maintain generous spacing
- avoid horizontal scrolling

Cards should stack naturally on smaller screens.

---

## Accessibility

Every Testimonials component must support:

- semantic section structure
- proper heading hierarchy
- keyboard navigation
- visible focus indicators
- sufficient contrast
- screen reader compatibility

Carousel controls should include descriptive accessible labels.

---

## Shopify Settings

Merchants may configure:

- section heading
- introductory text
- testimonial blocks
- customer name
- customer title
- customer company
- customer avatar
- purchased product
- rating
- layout style
- number of columns
- show ratings
- show avatars
- enable carousel
- show navigation
- color scheme

Merchants should not configure:

- typography scale
- spacing
- transition timing
- responsive breakpoints

These belong to the Design System.

---

## Design Tokens

The Testimonials component should use semantic tokens for:

- spacing
- typography
- card radius
- borders
- colors
- shadows
- transitions

Example token categories:

- testimonials-spacing
- testimonials-card
- testimonials-heading
- testimonials-quote
- testimonials-transition

---

## Motion Rules

Motion should remain restrained.

Allowed motion:

- fade transition
- horizontal slide
- opacity transition

Avoid:

- bouncing
- scaling
- rotating
- decorative effects

Motion should support readability rather than attract attention.

---

## Performance Rules

The Testimonials component should:

- lazy-load optional avatars
- minimize JavaScript
- avoid layout shifts
- reuse shared Card components
- optimize carousel performance

The component should remain lightweight even with numerous testimonials.

---

## AI Guidelines

When generating storefronts, AI should:

- use realistic testimonial structure
- prioritize readability
- preserve accessibility
- select the appropriate layout
- avoid excessive testimonial counts
- reuse Card and Carousel patterns where appropriate

AI should never fabricate customer identities, reviews, ratings, or verification badges.

---

## Quality Checklist

### Purpose

- Testimonials increase customer confidence.
- Social proof is immediately understandable.

### Design

- Quotations receive primary emphasis.
- Attribution remains clear.
- Whitespace remains generous.

### Accessibility

- Keyboard navigation functions correctly.
- Focus indicators remain visible.
- Screen readers can interpret testimonial content.

### Responsive

- Cards adapt across devices.
- Reading width remains comfortable.
- No horizontal scrolling occurs.

### Performance

- Layout remains stable.
- Optional media loads efficiently.
- Carousel performance remains smooth.

### AI Compatibility

- Component structure is deterministic.
- Existing components are reused.
- Merchant content remains accurate.

---

## Future Compatibility

Before extending the Testimonials component, ask:

- Does the addition improve customer trust?
- Can an existing testimonial layout satisfy the requirement?
- Will merchants understand the configuration?
- Does it preserve accessibility?
- Can AI generate it consistently?

If an existing pattern satisfies the requirement, reuse it.

The Testimonials component should evolve through refinement rather than expansion.

Every Testimonials component should strengthen customer confidence, preserve accessibility and performance, and reinforce the calm, timeless design philosophy that defines Calinium.
