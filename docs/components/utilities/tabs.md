# Tabs

## Purpose

Tabs switch closely related peer content panels without navigating to a new destination. They are not primary navigation, sequential tasks, or a way to hide essential purchasing information.

## Responsibilities

Tabs own tab list, tabs, panels, selected state, keyboard behavior, orientation, and safe initial selection.

Tabs are not responsible for site navigation, sequential process flow, product-option selection, or loading unrelated content repeatedly.

## User Goals

Tabs should help customers move among closely related content without losing orientation.

## Merchant Goals

Tabs should help merchants organize approved peer content without creating unnecessary widgets or hidden essential information.

## Structure

Tabs consists of tab list, tabs, and related panels — required.

Optional: orientation, URL state when appropriate, and lazy panel loading only with accessible fallback.

## Required Elements

Every Tabs instance requires one selected tab, accessible tab-panel relationships, related peer content, and usable no-JavaScript access.

## Optional Elements

Horizontal/vertical orientation and URL state may appear when implemented and useful.

## Supported Variants

### Horizontal or Vertical

Orientation follows available space and content density.

### Static Fallback

All content remains accessible through headings or links without JavaScript.

## Component-Specific Rules

Tabs must follow established keyboard patterns, keep selected state synchronized, and show only related peer content.

Tabs must not hide essential commerce information, replace navigation or Disclosure, auto-rotate, or use panels for sequential tasks.

## Supported States

### Selected, Focused, Disabled, Loading, Error

Only real supported states apply; disabled tabs require a clear reason.

## Responsive Behaviour

Tabs should wrap, scroll through documented accessible overflow, or change orientation without changing source order or clipping focus.

## Accessibility

Tabs must use semantic HTML and appropriate tab semantics, keyboard arrows/Home/End, visible focus, selected state, WCAG 2.2 AA contrast, and no hover-only access.

## Shopify Settings

Merchants may configure approved tab labels, panel content, orientation, and initial selected tab.

The Design System controls roles, keyboard behavior, overflow, focus, breakpoints, and motion.

## Design Tokens

Tabs use tabs-gap, tabs-border, tabs-selected, tabs-panel-space, tabs-focus, and tabs-overflow tokens.

## Motion Rules

Panel transition is restrained and optional; no auto rotation or delayed content access. Reduced-motion preferences are respected.

## Performance Rules

Tabs should server render panels or safe fallback, use minimal JavaScript, preserve progressive enhancement, avoid repeated panel fetching, and clean listeners on Theme Editor rerender.

## AI Guidelines

AI should use Tabs only for real peer content, select deterministic initial panel, preserve essential visible content, and prefer headings when simpler.

AI must not add Tabs for novelty or hide commerce-critical information.

## Quality Checklist

### Structure

- Panels are closely related peers.

### Accessibility

- Keyboard and selected state are correct.

### Fallback

- Content remains available without JavaScript.

## Future Compatibility

Future Tabs refinement requires demonstrated related-panel content and complete keyboard, fallback, URL-state, and lifecycle behavior.
