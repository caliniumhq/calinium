# Creative Brief schema

[`schemas/creative-brief.schema.json`](../../schemas/creative-brief.schema.json) defines the v1 Creative Brief, which the merchant experience calls a **Brand Blueprint**. It is a structured understanding, not generated merchant copy or a Shopify configuration.

| Field | Meaning |
| --- | --- |
| `business` | Merchant-confirmed name, offer, summary, markets, and any known model. |
| `audience` | Confirmed primary audience; unprovided needs, motivations, and objections remain empty rather than invented. |
| `positioning` | Explicit or clearly labeled inferred market position; never a hidden claim. |
| `brand` | Desired feeling, personality, existing assets, and creative constraints. |
| `goals` | Merchant-provided primary and secondary goals. |
| `content` | Declared available assets and an explicit list of not-provided essentials. |
| `facts` | Merchant statements only, with source and confidence. |
| `assumptions` | Inferences with a rationale and confidence below `0.90`. |
| `uncertainties` | Unknown values, each marked critical or optional. |
| `validation` | Readiness, critical gaps, and non-blocking warnings. |

The builder validates merchant input first, normalizes stable values, derives no unlabelled facts, and validates its output before returning it. See [AI Creative Director v1](../architecture/ai-creative-director.md).
