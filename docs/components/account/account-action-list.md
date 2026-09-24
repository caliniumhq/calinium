# Account Action List
## Purpose
Account Action List presents a concise group of verified account actions or destinations without becoming full account navigation.
## Responsibilities
It owns action grouping, link-versus-button distinction, optional icon/description, primary/secondary/destructive ordering, and sign-out context.
## User Goals
Customers can find one clear account action without hidden or promotional priorities.
## Merchant Goals
Merchants present supported actions consistently and safely.
## Structure
Semantic list of verified actions is required; icon, description, divider, and grouping are optional.
## Required Elements
Every action requires real route or operation, clear label, and correct link or button semantics.
## Optional Elements
Icons and descriptions may clarify familiar actions; destructive actions are separate and explicitly named.
## Supported Variants
Compact and standard variants support bounded account contexts.
## Component-Specific Rules
Account Action List must order actions by customer importance and reuse List, Button, Icon Button, Divider, and Account Navigation. It must not become full navigation, hide destructive actions, invent operations, use unfamiliar icon-only labels, or include marketing opt-ins by default.
## Supported States
Available, current, disabled, loading, error, and unavailable appear only when real.
## Responsive Behaviour
Actions stack or wrap with clear labels and touch targets at narrow widths and zoom.
## Accessibility
Use semantic HTML and lists, correct link/button semantics, keyboard operation, visible focus, WCAG 2.2 AA contrast, and text not icon alone.
## Shopify Settings
Merchants may configure supported visibility, labels, descriptions, and icon visibility; routes, destructive behavior, focus, and state are system controlled.
## Design Tokens
Use account-action-gap, account-action-primary, account-action-secondary, account-action-destructive, and account-action-focus tokens.
## Motion Rules
No promotional or destructive animation; restrained real state transition respects reduced-motion preferences.
## Performance Rules
Server render verified actions, use minimal JavaScript, progressive enhancement, no duplicate requests, and Theme Editor-safe cleanup.
## AI Guidelines
AI should select smallest verified action group, preserve privacy and deterministic order, distinguish links/actions, and hide unavailable features.

AI must not invent account actions, routes, permissions, or customer state; duplicate Account Navigation; or expose private account data.
## Quality Checklist
- Each action is supported and correctly semantic.
- Destructive actions are distinct and clear.
## Future Compatibility
New actions require verified Shopify route or integration, customer-value evidence, privacy consideration, and safe failure behavior.
