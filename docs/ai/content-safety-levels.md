# AI content-safety levels

| Level | Meaning | Example |
| --- | --- | --- |
| `safe_to_generate` | Non-factual structure or neutral presentation copy may be drafted. | A generic section heading. |
| `generate_with_context` | Draft only from supplied context; review is required before publication. | A neutral value category. |
| `merchant_confirmation_required` | AI can format supplied facts but needs merchant approval. | Founder biography or material origin. |
| `merchant_only` | AI must not author or publish it. | Portrait, certification, sustainability metric, team email. |

Safety is recorded at manifest and setting level. Block fields that describe people, claims, dates, places, performance, certifications, achievements, and real media default to merchant confirmation or merchant-only. A lower-risk heading does not make the rest of the section safe to publish.
