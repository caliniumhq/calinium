# Scroll Area

## Purpose

Scroll Area provides constrained overflow only when content cannot reasonably reflow. The page remains the primary scrolling surface.

## Responsibilities

Scroll Area owns bounded vertical, horizontal, or two-axis overflow, visible cues, keyboard/touch operation, and nested-scroll limits.

Scroll Area is not responsible for layout, Carousel behavior, hidden content, Drawer/Modal scrolling, or scrollbar removal for decoration.

## User Goals

Scroll Area should help customers reach constrained content without scroll traps or loss of orientation.

## Merchant Goals

Scroll Area should help merchants retain useful tables or bounded content without arbitrary fixed layouts.

## Structure

Scroll Area consists of constrained region and real overflow content — required.

Optional: visible scrollbar, edge cue, accessible label, controlled maximum height.

## Required Elements

Every Scroll Area requires demonstrated reflow limitation, visible overflow affordance, keyboard/touch access, and parent-context relationship.

## Optional Elements

Edge shadows and focusability may appear only when they improve discoverability or keyboard operation.

## Supported Variants

### Horizontal, Vertical, or Both Axis

Axis follows real content need.

### Table Overflow

Controlled fallback preserving Table headers.

## Component-Specific Rules

Scroll Area must preserve native scrollbar and page scroll priority, avoid nested scroll regions, and use reflow before overflow where practical.

Scroll Area must not hide scrollbars, create unnecessary scroll traps, contain essential content without cue, or replace Drawer/Modal behavior.

## Supported States

### Overflowing, Non-Overflowing, Loading, Empty

Only real parent states apply; no fake cue appears without overflow.

## Responsive Behaviour

Scroll Area should adapt max height, retain edge cue, keyboard focus, touch panning, and no page horizontal overflow at narrow widths.

## Accessibility

Scroll Area must use semantic HTML, accessible label when focusable, keyboard scrolling, visible focus, WCAG 2.2 AA cues, logical reading order, and no hidden essential content.

## Shopify Settings

Merchants may configure visibility and approved maximum visible items where parent supports it.

The Design System controls axes, maximum heights, scrollbar treatment, cues, focusability, breakpoints, and motion.

## Design Tokens

Scroll Area uses scroll-area-max-height, scroll-area-shadow, scroll-area-scrollbar, scroll-area-gap, and scroll-area-focus tokens.

## Motion Rules

No decorative scrolling or parallax. Edge cues may transition subtly and reduced-motion preferences are respected.

## Performance Rules

### Theme Editor Lifecycle

When this component adds JavaScript, it must initialize once for its section, respond safely to Shopify section-load events, and remove listeners, timers, observers, and transient state on Shopify section-unload events. Native server-rendered behavior remains available when enhancement does not run.

Scroll Area uses native scrolling, minimal JavaScript, progressive enhancement, no continuous scroll work, restrained observers only when necessary, and rerender cleanup.

## AI Guidelines

AI should use Scroll Area only after intrinsic reflow fails, preserve content order, choose deterministic axis, and prefer page scrolling.

AI must not create scroll areas for visual cleanliness or hide content.

## Quality Checklist

### Overflow

- Reflow was considered first.

### Accessibility

- Overflow is discoverable and operable by keyboard and touch.

### Scope

- Page remains primary scrolling surface.

## Future Compatibility

Future Scroll Area work requires demonstrated constrained-content need and must preserve native scrolling, semantics, and no-trap behavior.
