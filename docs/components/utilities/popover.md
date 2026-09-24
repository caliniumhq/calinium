# Popover

## Purpose

Popover presents small contextual non-modal content anchored to a trigger. It is not a menu, Tooltip, Drawer, Modal, site navigation, or large workflow.

## Responsibilities

Popover owns trigger, anchored content, placement, safe collision handling, dismissal, and predictable focus return.

Popover is not responsible for navigation, selection behavior, large forms, focus trapping, or brief non-interactive labels.

## User Goals

Popover should help customers access nearby contextual content without losing page orientation.

## Merchant Goals

Popover should help merchants present approved concise context without custom overlays or hover-only behavior.

## Structure

Popover consists of accessible trigger and anchored content region — required.

Optional: heading, concise actions, and arrow treatment.

## Required Elements

Every Popover requires clear trigger name, dismissal path, bounded contextual content, and safe fallback when native platform behavior is unavailable.

## Optional Elements

Heading and actions may appear when focused and concise. Hover may supplement, never replace, click or keyboard access.

## Supported Variants

### Informational

Small contextual explanation.

### Action

One or two bounded related actions.

### Native Enhanced

Uses native platform behavior only with safe fallback.

## Component-Specific Rules

Popover must dismiss by Escape, outside interaction where appropriate, and trigger activation; return focus predictably; and avoid unnecessary focus trap.

Popover must not contain large workflow, site navigation, Tooltip-only label, Select behavior, Mega Menu content, or Modal-level decisions.

## Supported States

### Closed, Open, Focused, Unavailable

State is explicit and accurate; error belongs to nearby feedback primitive.

## Responsive Behaviour

Popover should reposition or fall back without clipping, preserve trigger focus, and remain usable by touch at narrow widths.

## Accessibility

Popover must use semantic HTML, accessible trigger name and expanded state, keyboard operation, visible focus, WCAG 2.2 AA contrast, predictable dismissal, and no hover-only access.

## Shopify Settings

Merchants may configure approved trigger label, concise content, optional heading, and real actions.

The Design System controls placement, collision behavior, roles, focus, z-layer, touch size, breakpoints, and motion.

## Design Tokens

Popover uses popover-surface, popover-border, popover-radius, popover-space, popover-shadow, popover-offset, and popover-focus tokens.

## Motion Rules

Entrance and dismissal are restrained and respect reduced-motion preferences. Motion cannot delay content or imply a menu.

## Performance Rules

Popover should use minimal JavaScript, progressive enhancement, event delegation, no polling, safe native API fallback, and cleanup after Theme Editor rerender.

## AI Guidelines

AI should use Popover only for concise anchored contextual content, choose deterministic placement, preserve trigger semantics, and prefer visible content when simpler.

AI must not create Popovers for navigation, complex workflows, or novelty.

## Quality Checklist

### Scope

- Content is small and contextual.

### Accessibility

- Trigger, dismissal, focus return, and keyboard behavior are predictable.

### Resilience

- Collision and no-JavaScript fallback are safe.

## Future Compatibility

Future Popover extensions require demonstrated contextual need, complete focus behavior, and no overlap with Tooltip, Select, Menu, Drawer, or Modal.
