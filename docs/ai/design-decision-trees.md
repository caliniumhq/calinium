# Calinium design decision trees

These trees describe a constrained decision sequence. An AI may propose a configuration only after the prior decision is supported by merchant input and validated against the catalogs.

```mermaid
flowchart TD
  A[Merchant industry and catalog] --> B{Specific industry profile available?}
  B -->|Yes| C[Load industry profile]
  B -->|No| D[Use general_retail and request clarification]
  C --> E[Choose declared brand personality]
  D --> E
  E --> F[Resolve compatible design language]
  F --> G[Resolve typography, spacing, color, image, and animation profiles]
  G --> H[Select conversion strategy and page blueprint]
  H --> I[Choose compatible layout recipe]
  I --> J[Select real section IDs and order]
  J --> K[Apply setting metadata and content-safety gates]
  K --> L[Validate schemas, references, accessibility, performance, and merchant confirmation]
```

```mermaid
flowchart TD
  A[Homepage intent] --> B{Primary decision}
  B -->|Craft, origin, premium value| C[luxury_story or editorial_discovery]
  B -->|Specification and comparison| D[technology_clarity]
  B -->|Category browsing| E[catalogue_first]
  B -->|Ingredient or process education| F[food_story or beauty_discovery]
  B -->|Service enquiry| G[service_trust]
  C --> H[Check composition matrix]
  D --> H
  E --> H
  F --> H
  G --> H
  H --> I[Limit density and avoid repeated heroes/galleries]
```

```mermaid
flowchart TD
  A[Draft content or asset] --> B{Factual, personal, claim, metric, date, review, or certification?}
  B -->|Yes| C[Read setting metadata and content safety]
  C --> D{Merchant confirmation required?}
  D -->|Yes| E[Leave blank or mark for merchant input]
  D -->|No| F[Use supplied merchant facts only]
  B -->|No| G[Draft neutral structural copy]
  E --> H[Validate before publishing]
  F --> H
  G --> H
```

Final validation always checks: valid IDs, real sections, recipe limits, compatibility, mobile reading order, existing accessibility/performance conventions, Shopify schema compatibility, and merchant verification gates.
