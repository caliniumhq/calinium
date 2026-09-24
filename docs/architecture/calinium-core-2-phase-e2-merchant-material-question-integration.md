# Calinium Core 2.0 — Phase E2 Merchant Material-Question Integration

## Milestone boundary

Phase E2 connects the E1 `material_question_required` outcome to the existing conversation question-planning and local answer-interpretation infrastructure. It closes one architecture-changing ambiguity without redesigning conversation UI, creating a questionnaire, exposing profile identities or scores, changing billing, mutating a live theme, or activating repair. Automatic repair remains disabled.

The integration is deliberately narrow:

`Store Intelligence + Merchant Intent → E1 → one material question when required → child Merchant Intent → one E1 rerun → frozen architecture → Design DNA → composition`

Direct E1 selections bypass this adapter and ask zero architecture questions.

## Existing systems preserved

The standard conversation engine, question planner, local creative-director provider, `merchant-intent-v1`, Store Intelligence contract, E1 policy, compatibility solver, frozen selection, generation provenance, approval path, and immutable paid-input snapshot remain authoritative. Phase E2 adds a late, domain-level adapter around one planned question; it does not replace or redesign conversation state or merchant UI.

No dashboard UI, theme presenter, Liquid, CSS, storefront JavaScript, architecture profile/family, Design DNA, preset, billing, deployment, approval, or repair-planning file is changed by this milestone.

## Merchant-facing question

The approved `shopping_mode` plan uses the existing question-planner shape and asks:

> When customers shop, should the experience feel more visual and story-led, or more direct and efficient?

The two merchant-facing choices normalize to existing `merchant-intent-v1` values:

| Merchant-facing choice | Stored value |
| --- | --- |
| Visual and story-led | `image_led` |
| Direct and efficient | `information_led` |

The request contains no profile name, architecture family, fit score, signal weight, or internal eligibility detail.

## Versioned contracts and bindings

Three contracts define the closure:

- `architecture-material-question-v1` binds one question to the exact E1 outcome and checksum, policy/engine revision, parent Merchant Intent revision/checksum, frozen Store Intelligence revision/checksum, conversation revision, and merchant/store/project context checksum. Its allowance is consumed at question creation and has a maximum of one.
- `architecture-material-answer-v1` binds one normalized answer to the exact question and outcome, intent path, conversation revision, merchant context, answer timestamp/revision, explicit merchant-input provenance, and checksums. Raw conversation text is not stored.
- `architecture-material-clarification-v1` binds the parent outcome, question, answer, parent Merchant Intent, Store Intelligence, conversation/context, one rerun, consumed allowance, and prohibition on a second question. This trace is embedded in the child Merchant Intent, frozen selection, and normal architecture provenance.

Question and answer identities are content-derived. Stale question IDs, wrong outcome revisions, invalid paths, stale conversations, mismatched merchant contexts, malformed or unsupported values, duplicate answers, answers after freeze, and second-question attempts fail closed.

## Natural-answer handling

The existing local creative-director provider interprets the planned question through a deterministic `shopping-mode-natural-answer-v1` normalizer. It recognizes clusters of ordinary visual/story/discovery language and direct/efficient/navigation/utility language rather than requiring an internal enum or matching only a fixed sentence.

Resolution requires a supported signal with a clear margin. Missing, unsupported, or conflicting evidence returns `unresolved_answer`; it does not guess, select, reprompt, or restore the question allowance. The caller must preserve the pinned unresolved state and apply the E1 approved conservative fallback/unresolved handling outside a second-question loop. Automated tests use only deterministic local fixtures and make no model or API call.

## Merchant Intent revision and Store Intelligence freeze

A resolved answer creates a new `merchant-intent-v1` child revision. It:

- retains all inferred Shopify facts, prior answers, prior preferences, and prior provenance;
- records exactly one explicit `merchant_answer` preference on `storefront.shopping_mode`;
- binds the source question, answer revision, parent revision/checksum, confidence, and clarification trace; and
- clears the one ambiguity that the answer resolved.

The answer cannot rewrite Store Intelligence. Product, variant, collection, navigation, and media facts remain byte-equivalent to the frozen input that produced the original question.

## One rerun, freeze, and retry safety

After a valid child intent is created, E1 runs exactly once in `automatic_beta` mode with material-question generation disabled. It consumes the same frozen Store Intelligence object and the new Merchant Intent. A successful result freezes Current Calinium or Editorial Discovery and retains both E1 candidate results, selected families, compatibility, explanation, confidence, policy revision, question/answer provenance, and final selection revision.

The clarification trace is part of why the architecture was selected. The frozen selection still binds its final Merchant Intent and original Store Intelligence through the E1 input checksums. A second material answer cannot mutate it.

Pinned retries reuse the exact question without delivering it again, then reuse the exact answer, child Merchant Intent, Store Intelligence, and frozen selection. The existing paid snapshot already stores the complete Merchant Intent and frozen architecture selection and later consumes those pinned values; Phase E2 neither creates a second paid-generation identity nor changes billing semantics.

## Design DNA, composition, and repair boundaries

Design DNA and composition remain blocked until architecture selection is frozen. The shopping-mode answer enters Design DNA only through existing intent mappings; Phase E2 does not infer extra preferences or give Design DNA permission to change structural families.

Architecture clarification never invokes QA or repair. The proven repair classes remain separate, `automatic_repair_allowed` remains `false`, and no source or theme action is triggered by answering the question.

## Controlled proof

The controlled E2 fixture proves:

- `commerce_dense_store` → Current Calinium → zero material questions → frozen → Design DNA allowed.
- `image_led_editorial_store` → Editorial Discovery → zero material questions → frozen → Design DNA allowed.
- `ambiguous_store` → one `shopping_mode` question → `image_led` child intent → one E1 rerun → Editorial Discovery → frozen.
- `ambiguous_store` → one `shopping_mode` question → `information_led` child intent → one E1 rerun → Current Calinium → frozen.

The same fixture proves natural phrasing, unresolved handling, exact binding, one-question enforcement, Store Intelligence immutability, deterministic retry behavior, provenance through normal generation, immutable paid-snapshot consumption, legacy Current behavior, and absence of repair, theme, billing, or UI activation.

## Safety state

- automatic-selection profiles: exactly two
- material architecture questions per cycle: at most one
- architecture names/scores exposed to merchant: false
- E1 reruns after a valid answer: exactly one
- second question after unresolved or resolved answer: false
- direct-selection questions: zero
- raw merchant answer stored in theme/runtime provenance: false
- Store Intelligence refetched or rewritten during closure: false
- Design DNA before architecture freeze: false
- automatic repair: false
- live merchant theme publication/mutation: false
- merchant conversation UI redesign: false
- API/model dependency: none

The recommended next milestone is an end-to-end merchant-flow phase that wires these existing domain contracts into the current server conversation lifecycle and paid-generation pause/resume boundary. That work must preserve the pinned identities and must be separately approved; it is not started in E2.
