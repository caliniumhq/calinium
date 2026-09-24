# Branching and Session Lifecycle

## Branching

Each question declares dependencies. A question is visible only when all of its dependencies match the current answers. Supported operators are:

| Operator | Meaning |
| --- | --- |
| `equals` | Answer equals a value, or one of an allowed value list. |
| `not_equals` | Answer does not equal a value/list member. |
| `includes` | A tag/multiple-choice answer includes a value, or a scalar is within an allowed list. |
| `exists` | Another question is answered or explicitly absent. |

Examples:

- Fashion and luxury-fashion industries show apparel context.
- Furniture and home industries show room/space context.
- Physical products show shipping context.
- Digital products show digital-delivery context and do not show shipping context.

When a controlling answer changes, inactive answers are removed from the serializable session and recorded in the `progress_saved` event details. This prevents irrelevant historical data from reaching the Merchant Profile builder.

## Session lifecycle

```text
create → in_progress → save progress ↔ resume → summary preview → confirmed summary → completed
                                └──────────────────────────────→ abandoned
```

- `createInterviewSession` initializes a typed, serializable session.
- `saveProgress` merges an answer patch, resolves branches, removes inactive answers, and validates supplied values without requiring completion.
- `resumeInterviewSession` validates the record and recalculates visible questions.
- `previewInterviewSummary` validates complete answers and returns a readable summary without changing session state.
- `completeInterviewSession` requires all visible required answers plus explicit summary confirmation; it attaches the validated canonical profile and summary.
- `abandonInterviewSession` records a terminal abandoned session. Abandoned sessions cannot be resumed.

The engine is storage-neutral. A future UI or dashboard owns authenticated persistence and can store the JSON record without changing lifecycle semantics.

See [question catalog](question-catalog.md) and [Merchant Profile mapping](merchant-profile.md).
