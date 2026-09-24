# Dashboard Accessibility

The Dashboard targets WCAG 2.2 AA.

- Uses semantic headings, navigation, regions, fieldsets, labels, native inputs, buttons, and dialog semantics.
- Provides a visible focus indicator and 44px minimum interactive controls.
- Associates question help and validation feedback with inputs using `aria-describedby` and `aria-invalid`.
- Uses non-disruptive `status` announcements for autosave and `alert` only for errors.
- Moves focus to the new step heading after navigation.
- Uses real buttons for choice, tag, navigation, dialog, confirmation, and cancellation actions.
- Supports keyboard operation for every control; Escape dismisses confirmation dialogs.
- Provides `aria-current="step"` for the active category and `aria-expanded` for the profile disclosure.
- Uses a reduced-motion stylesheet fallback and avoids automatic animation.
- Keeps color-independent requirement, active-step, and error signals.
- Keeps account, project, settings, and interview actions as native buttons, inputs, selects, fieldsets, details, and summaries.
- Uses native file controls behind clearly labelled upload buttons, with upload state announced through `role="status"`.
- Provides keyboard-operable palette controls and textual WCAG contrast status (`Acceptable`, `Caution`, or `Fails AA guidance`) rather than color-only feedback.
- Uses native confirmation dialogs and visible focus styling before an asset that may be referenced by a confirmed Merchant Profile is removed.
- Uses `aria-current="page"` for the active Dashboard navigation item and labelled account controls for the authenticated shell.
- Reports account/project save failures with `role="alert"` and successful settings updates with `role="status"`.

Automated tests cover keyboard reachability, native control semantics, inline required validation, and reduced-motion/mobile CSS contracts. Browser verification covers no horizontal overflow at 320px, 375px, 768px, and 1440px.
