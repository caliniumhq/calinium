# Automatic Merchant Intake

## 1 Purpose

Automatic Merchant Intake is the canonical product contract for how Calinium understands a merchant before design approval and generation. It defines the intelligence Calinium derives from the connected Shopify store, an optional public website, and a short merchant conversation; how that intelligence is classified; when Calinium may recommend automatically; and when it must ask, confirm, omit, or stop.

The intended merchant reaction is:

> Calinium already understands my business.

The merchant should not have to reconstruct information Calinium can safely learn from Shopify, repeat data already available, or configure design machinery. Calinium should begin useful work after the first meaningful answer and progressively produce deterministic, reviewable understanding.

This is a product specification, not implementation, code, prompt engineering, architecture, data storage, or interface design. It defines behavioral outputs and truth boundaries without prescribing how they are computed or transported.

## 2 Governing Documents

This contract is governed by:

- [Calinium Customer Journey](customer-journey.md)
- [Calinium AI Creative Director Interaction Design](ai-creative-director-interaction-design.md)
- [Calinium AI Behaviour](ai-behaviour.md)

Those documents remain authoritative. Automatic Merchant Intake may reduce visible effort, but it may not weaken their distinctions among fact, interpretation, recommendation, confirmation, approval, payment, generation, and publication.

The existing internal stages remain intact:

```text
Conversation
Understanding
Brand Blueprint
Store Strategy
Preset
Store Resources
Content Plan
Your Theme
Delivery
```

Intake prepares deterministic inputs for those stages. It does not replace their ownership, stage guards, immutable revisions, preset approvals, Approved Block Plans, resource snapshots, paid-order pinning, or read-only generation.

Shopify remains authoritative for the connected shop and current Shopify resources. The merchant remains authoritative for business identity, audience, brand values, sensitive truth, commercial intent, and subjective correction. Public website analysis is supplemental and optional.

## 3 Philosophy

Automatic Merchant Intake follows five permanent ideas:

1. **Learn before asking.** Calinium first uses available authoritative context.
2. **Infer safely, never silently confirm.** A useful interpretation may become a recommendation; it does not become merchant fact merely because confidence is high.
3. **Ask only what matters.** Questions resolve material unknowns, preferences, conflicts, or sensitive truth.
4. **Continue through absence.** Missing ordinary resources produce fallback or omission rather than punishment.
5. **Show the merchant a coherent understanding.** Intake culminates in reviewable profiles, recommendations, remaining questions, sources, and confidence—not a technical inventory dump.

Automatic does not mean invisible authority. Calinium may automatically analyze and recommend ordinary choices. It may not automatically approve those choices where approval is required, invent missing truth, or make merchant-owned decisions.

The intake should feel like an experienced Creative Director arriving prepared: familiar with the catalog, aware of the current brand expression, able to identify the strongest resources, and focused only on the questions that genuinely require the merchant.

## 4 Product Goals

Automatic Merchant Intake must:

- begin after the first meaningful merchant answer;
- analyze eligible Shopify context without asking the merchant to reproduce it;
- treat optional public website analysis as supplemental and non-blocking;
- extract structured facts, preferences, unknowns, and conflicts from conversation;
- form reviewable Business and Brand Profiles;
- detect candidate industry, personality, audience, design language, commerce posture, and homepage strategy;
- recommend one compatible preset and a Recommended Resource Set;
- identify missing information and resources without creating unnecessary blockers;
- ask no more than five to seven essential merchant questions in Quick Start, and fewer when possible;
- preserve source, confidence, status, and revision context;
- remain deterministic for the same authoritative inputs and policy;
- omit unsupported claims and optional content;
- prepare truthful inputs for later review, approval, and generation.

The canonical intake outputs are:

```text
Business Profile
Brand Profile
Audience candidate
Industry candidate
Design-language direction
Commerce posture
Preset recommendation
Homepage Strategy
Resource Recommendations
Questions Remaining
Confidence and source summary
Omissions and conflicts
```

These outputs are deterministic candidates and inputs. They are not themselves approval, payment, generated content, or permission to change a Shopify theme.

## 5 Merchant Experience

The merchant begins with one ordinary statement:

> I sell handmade luxury leather bags.

Calinium immediately separates what the statement establishes from what it merely suggests:

- **Confirmed merchant statement:** the merchant sells leather bags and describes them as luxury and handmade.
- **Sensitive claim requiring confirmation:** handmade.
- **Candidate industry:** fashion and leather accessories.
- **Candidate positioning:** luxury or premium.
- **Still unknown:** main customer, primary objective, priority line, desired experience, and what to avoid unless other current evidence resolves them.

Without exposing technical stages, Calinium begins learning from available products, variants, collections, files, menus, pages, blogs, themes, theme settings, markets, policies, and brand assets. If the merchant supplied an existing public website and analysis is enabled, it learns design and communication patterns from that source without copying it.

The merchant can continue talking while learning proceeds. Intake presents only meaningful outcomes: what Calinium understands, what it recommends, what remains uncertain, which resources appear strongest, and what needs merchant confirmation.

The merchant is never required to understand Shopify resource types, preset scoring, strategy taxonomies, or technical settings. They may correct Calinium naturally, inspect more detail in Guided or Advanced, and continue without an optional website or ordinary missing resources.

## 6 Merchant Inputs

Merchant input is deliberately small and high-value.

### Initial input

Required:

- one meaningful description of what the business sells or provides.

Optional:

- an existing public website URL;
- an immediate correction to the connected-store context;
- a preference for Quick Start, Guided, or Advanced when useful.

The merchant is not asked for the `.myshopify.com` domain when Calinium already has an authenticated canonical shop identity.

### Adaptive inputs

Calinium may ask about:

- main customer;
- desired store feeling;
- primary business or storefront objective;
- priority product line;
- what to avoid;
- an unresolved material conflict;
- exact sensitive content or evidence requiring confirmation.

### Input states

Every merchant response retains one of these meanings:

- confirmed business fact;
- subjective preference;
- explicit correction;
- approved delegation for a reversible creative choice;
- unknown;
- skipped optional topic;
- proposed sensitive claim awaiting confirmation;
- conflict resolution.

**I don't know** records an unknown. **You decide** delegates an eligible creative choice. Neither creates a factual answer. Silence, navigation, or continued progress is not consent or approval.

## 7 Shopify Intelligence Pipeline

Shopify intelligence is deterministic analysis of the current, authenticated, project-scoped store context. The analysis attempt is expected when the merchant has granted relevant access; the presence of any individual resource category is not required for intake to continue.

| Source | Intake treatment | Required or optional presence | Confidence basis | Safe fallback | Retry behavior | Omission behavior |
| --- | --- | --- | --- | --- | --- | --- |
| Products | Inspect current catalog, availability, merchandising fields, and media | Optional presence; an empty catalog does not invalidate understanding | High for current Shopify fields; lower for inferred positioning | Merchant description and other store context | Refresh only the affected source | Omit product-dependent recommendations |
| Variants | Inspect option structure, range, availability, and complexity | Optional | High for current variant structure | Treat product as a single merchandising entity when safe | Refresh with product context | Omit variant-specific conclusions |
| Collections | Inspect grouping, priority signals, imagery, and completeness | Optional | High for current collection identity and membership | Recommend product-led structure or omit collection section | Refresh collections independently | Omit collection-dependent composition |
| Files | Identify eligible logo, image, and media candidates without inferring meaning | Optional | High for file identity and availability; variable for intended role | Use approved product media, text treatment, or omission | Refresh candidate inventory | Omit unsupported media slot |
| Menus | Learn existing navigation labels, hierarchy, and destination validity | Optional | High for current menu structure | Recommend a minimal navigation candidate for review from approved destinations | Refresh menus | Preserve safe existing behavior or leave recommendation unresolved |
| Pages | Identify approved informational destinations and content candidates | Optional | High for identity; lower for semantic reuse outside the page | Omit page-dependent content | Refresh pages | Do not invent missing pages or copy |
| Blogs and articles | Identify editorial resources and current destinations | Optional | High for identity and published content; no automatic summary approval | Omit editorial-discovery recommendation | Refresh editorial inventory | Do not invent excerpts or editorial context |
| Themes | Identify eligible current or preview-theme context where available | Optional for intake | High for theme identity; not authoritative for desired future direction | Use Calinium's supported review foundation | Refresh theme inventory | Do not block recommendation solely because no optional preview theme exists |
| Theme settings | Learn existing visual signals cautiously | Optional | Medium at best for current expression; not merchant intent by itself | Rely on conversation, brand assets, catalog, and design recommendation | Retry theme analysis independently | Ignore unavailable or incompatible settings |
| Markets | Learn configured market structure, currencies, and localization breadth | Optional | High for current configuration | Recommend a market-neutral direction | Refresh market context | Omit market-specific assumptions |
| Policies | Detect presence and current merchant-provided policy resources | Optional | High for presence and text source; not proof of legal adequacy | Leave legal content unchanged or absent | Refresh policy presence | Never draft or infer legal claims |
| Brand assets | Identify approved logos, colors, and brand-media candidates where available | Optional | High for authoritative asset identity; role may require review | Text identity, approved product media, or safe omission | Refresh only brand assets | Never invent a logo, slogan, or brand mark |

Shopify intelligence never infers sales performance, margin, conversion, popularity, customer demographics, product quality, material truth, origin, sustainability, or legal compliance unless an authoritative governed source explicitly establishes the relevant fact and merchant confirmation rules are satisfied.

An unavailable Shopify category affects only dependent intelligence. It does not erase merchant answers or completed independent analysis.

## 8 Website Intelligence Pipeline

Website intelligence is optional. It begins only when the merchant provides a public website and the product's unresolved consent decision permits analysis. The site is treated as a supplemental external source, not as Shopify authority or automatic proof that every statement belongs to the current merchant project.

When available, Calinium may learn patterns in:

| Dimension | Safe intelligence |
| --- | --- |
| Typography | Category, contrast, hierarchy, and apparent tone; never copied proprietary font files |
| Spacing | Relative density, rhythm, and whitespace preference |
| Hierarchy | What is emphasized first and how information is sequenced |
| Navigation | Label style, breadth, grouping, and discovery approach |
| Photography | Product-led, editorial, lifestyle, studio, detail, or mixed treatment |
| Tone | Restrained, warm, technical, playful, direct, or editorial language patterns |
| Copywriting | Length, cadence, specificity, and voice—not copied text |
| Brand language | Candidate themes and vocabulary for review, not approved claims |
| Visual density | Sparse, balanced, or dense composition |
| Luxury level | Candidate positioning signals from restraint, imagery, typography, and merchandising—not price or quality truth |
| Editorial level | Relative role of stories, imagery, and discovery |
| Trust | Presence and placement of trust patterns, not proof that claims are true |
| Accessibility | Observable strengths and concerns, not a compliance certification |
| Responsive quality | Observable adaptation patterns, not guaranteed compatibility |
| Commerce patterns | Product discovery, calls to action, merchandising, and conversion emphasis |
| Image usage | Crop, scale, repetition, sequencing, and media role |
| Product positioning | Candidate hierarchy and narrative, not invented audience or performance truth |
| Homepage structure | Current section rhythm and priorities as inspiration, not a template to copy |
| Footer | Information breadth, navigation role, and trust structure |
| Color usage | Palette relationships, contrast, restraint, and emphasis—not copied brand ownership |
| Motion | Presence, purpose, frequency, and restraint without copying effects |

Calinium learns from the website; it does not copy it. It does not reproduce copy, layouts, imagery, code, proprietary assets, or distinctive expression wholesale. Website observations become sourced candidate signals with confidence and may inform questions or design recommendations.

Public website content cannot automatically approve founder, handmade, artisan, origin, sustainability, certification, award, testimonial, review, performance, result, revenue, conversion, statistical, guarantee, or external-proof claims.

## 9 Conversation Intelligence Pipeline

Conversation intelligence converts merchant language into structured, project-scoped understanding without changing the merchant's meaning.

For each accepted answer, Calinium identifies:

- the question or context being answered;
- explicit business facts;
- subjective preferences;
- delegated reversible choices;
- proposed sensitive claims;
- unknowns and skipped topics;
- constraints and avoidances;
- corrections to earlier intent;
- ambiguity;
- conflicts with current authoritative context;
- downstream areas that may need reconsideration.

Extraction is conservative. “Make it feel artisanal” becomes a visual preference, not an artisan-production claim. “Our customers are women who travel for work” becomes a proposed audience statement from the merchant; Calinium preserves the source and does not embellish it into age, income, geography, or lifestyle assumptions.

Ambiguous answers remain ambiguous until one focused follow-up resolves a material issue. Conflicting answers are not averaged. A newer explicit correction supersedes current intent while the prior revision remains in history.

Conversation memory is limited to the current project. It may shape later questions and recommendations in that project. It does not silently transfer facts or preferences to another merchant or project, alter an old paid order, or become global merchant truth.

## 10 Catalog Intelligence

Catalog intelligence describes the shape and merchandising readiness of the store without judging business quality.

Calinium may determine:

- product count and breadth;
- category concentration;
- variant complexity;
- collection coverage;
- price presentation and range from current authoritative prices;
- availability patterns;
- media coverage and consistency;
- title and description completeness;
- duplicate or near-duplicate merchandising structures;
- editorial-resource availability;
- whether product-led, collection-led, or minimal composition is feasible.

Catalog completeness affects recommendations, not merchant worth. A small or incomplete catalog is not a failure. One product can support a focused product-led storefront. No collections can support product-first navigation. Missing imagery can support a restrained text-and-product composition where compatible.

Calinium must not infer bestseller status, demand, profitability, popularity, audience, quality, scarcity, or performance from item count, order, price, availability, or imagery alone.

Catalog intelligence produces observed facts, candidate strengths, dependent omissions, and questions only where the missing answer materially changes strategy.

## 11 Product Intelligence

Product intelligence learns what the merchant currently offers and how products can safely appear in a recommendation.

Current Shopify identity, title, pricing, variants, availability, media, product type, vendor, tags, descriptions, and collection relationships may be observed according to their source status. Calinium distinguishes authoritative commerce fields from descriptive text that may contain unconfirmed claims.

Calinium may identify:

- candidate hero or featured products;
- representative versus specialist products;
- visual consistency and media completeness;
- variant-heavy versus simple purchasing needs;
- product-detail depth;
- products suitable for collection or editorial discovery;
- approved explicit commerce relationships where they exist.

Calinium never infers:

- product quality or durability;
- materials or origin absent from confirmed truth;
- efficacy or customer outcomes;
- automatic complementary, cross-sell, bundle, or Shop-the-Look relationships;
- popularity from display order;
- target audience from imagery alone;
- discount, scarcity, or guarantees.

When product information is incomplete, Calinium preserves exact available fields, avoids derived copy, and omits dependent claims or recommendations.

## 12 Collection Intelligence

Collection intelligence evaluates current merchant-defined groupings as discovery resources.

Calinium may observe:

- collection identity and membership;
- title, approved description, and image availability;
- manual or automated grouping status where known;
- breadth, overlap, and hierarchy;
- navigation presence;
- candidate featured or priority role based on explicit merchant intent and current store prominence;
- suitability for collection-led homepage discovery.

A collection's existence does not prove it is strategically important. Calinium ranks it using merchant priority, current navigation, catalog representation, visual readiness, and stated objective. When confidence is not high, the recommendation remains reviewable or Calinium asks which product line matters most.

No collections is a valid state. Calinium may recommend a product-led structure, a minimal discovery path, or safe omission. It never creates a collection name, description, membership, destination, or merchandising claim.

Duplicate or overlapping collections are surfaced as a potential clarity issue, not automatically reorganized.

## 13 Navigation Intelligence

Navigation intelligence understands how current approved destinations support discovery.

Calinium may analyze:

- existing menu hierarchy;
- label clarity and length;
- valid destination types;
- collection, product, page, blog, and policy coverage;
- duplication and dead-end risk;
- depth and breadth;
- fit with the recommended homepage and catalog strategy;
- market or locale variation where authoritative context exists.

Calinium normally recommends navigation automatically from current approved menus and destinations. It does not ask the merchant to choose a menu when one current, coherent option clearly fits.

Provisional labels such as **Shop**, **Our story**, and **Help** are presentation candidates only until their exact approved destinations exist. A label is not a destination. Calinium never invents a page, handle, URL, menu relationship, or legal link.

Incomplete menus do not stop intake. Calinium recommends a minimal current path, preserves safe existing navigation, identifies one required gap, or omits optional entries. It does not silently modify Shopify navigation.

## 14 Media Intelligence

Media intelligence evaluates available approved imagery and video for visual role, not factual meaning.

Calinium may observe:

- dimensions, aspect ratio, orientation, and technical availability;
- product, collection, file, or project-asset source;
- image clarity and compositional space;
- visual consistency;
- likely hero, supporting, detail, or background suitability;
- crop tolerance and focal constraints;
- duplication;
- video availability and known accessibility support;
- whether a safe text or non-media fallback is preferable.

Calinium may rank approved media for ordinary roles such as logo, hero, featured collection, product card, or supporting visual. It provides a reason and alternative choices.

Calinium never infers people, models, places, dates, events, materials, products, campaigns, craft, origin, sustainability, certification, ownership, rights, or captions from visual appearance. Image analysis cannot create evidence or product associations.

No logo, hero image, or homepage imagery is a valid intake state. Calinium continues with text identity, approved product media, a simpler visual composition, or omission where supported.

## 15 Brand Intelligence

Brand intelligence synthesizes merchant intent and current expression into reviewable dimensions. It does not declare brand identity without the merchant.

Candidate dimensions may include:

```text
Luxury
Minimal
Fashion
Technical
Beauty
Home
Outdoor
Kids
Jewelry
Industrial
Health
Sports
Technology
Editorial
Modern
Traditional
Playful
Premium
```

These labels do not all describe the same thing. Calinium classifies them across separate dimensions:

- **Industry or domain:** Fashion, Beauty, Home, Outdoor, Kids, Jewelry, Industrial, Health, Sports, Technology.
- **Positioning:** Luxury, Premium, accessible, specialist, or value-oriented only when supported.
- **Personality:** Playful, restrained, confident, warm, technical, expressive, or calm.
- **Design language:** Minimal, Editorial, Modern, Traditional, technical, or image-led.

Brand intelligence may be High, Medium, Low, or Unknown. It remains a candidate until reviewed where it represents merchant-owned positioning or values. A current website's visual style is evidence of current expression, not proof of future intent.

Calinium never infers mission, values, heritage, founder story, social impact, cultural identity, or sensitive claims merely from aesthetic signals.

## 16 Design Language Intelligence

Design-language intelligence translates approved intent and observed visual patterns into a coherent candidate direction.

It may evaluate:

- typographic character;
- hierarchy and scale;
- spacing and density;
- color restraint and contrast;
- shape, border, and surface treatment;
- image scale, crop, and sequencing;
- editorial versus transactional emphasis;
- motion restraint;
- product-card prominence;
- navigation expression;
- mobile clarity;
- consistency across current brand signals.

Calinium detects candidate directions such as minimal, editorial, modern, traditional, playful, technical, premium, or luxury. The same merchant may have multiple compatible descriptors; Calinium recommends one coherent primary direction and uses secondary descriptors only when they do not conflict.

Design-language inference is ordinarily safe and reversible. High-confidence direction may be recommended automatically. Medium confidence is explained at review. Low or Unknown confidence prompts a question about the desired feeling or uses a restrained provisional direction.

Calinium never converts an aesthetic descriptor into a business fact. “Craft-led visual direction” cannot create a handmade claim; “luxury” cannot create quality, scarcity, price, or origin claims.

## 17 Commerce Intelligence

Commerce intelligence identifies how the storefront should support discovery and purchase using current authoritative data and explicit approved relationships.

Calinium may determine:

- direct-conversion versus discovery emphasis;
- product-led versus collection-led merchandising;
- catalog breadth and variant complexity;
- suitable product and collection prominence;
- availability of explicit merchant-curated cross-sell, bundle-showcase, Shop-the-Look, or complementary-fallback relationships;
- need for restrained or dense product presentation;
- whether a minimal catalog needs a focused purchase path.

Calinium does not infer product relationships, frequently-bought-together behavior, personalization, regimen, efficacy, bundle discounts, combined inventory, customer history, or recommendation results. Shopify-owned dynamic recommendation behavior remains distinct from merchant-curated fallback or relationships.

Commerce recommendations preserve current product price and availability without inventing discounts, scarcity, totals, or guarantees. The absence of approved relationships results in omission, not automatic matching.

## 18 Industry Detection

Industry detection identifies a candidate commercial domain from explicit merchant language and current catalog evidence.

Signals may include:

- the merchant's description of what they sell;
- Shopify product types and current descriptions;
- collection structure;
- approved category or business information;
- optional website positioning as supplemental evidence.

Industry is detected independently from personality and design language. **Fashion** may be an industry; **Luxury** is positioning; **Editorial** is a design language. They must not be collapsed into one label.

A High-confidence candidate requires an explicit merchant description or clear current catalog agreement without material conflict. Medium confidence permits a primary recommendation with review. Low confidence triggers one focused offer question or remains broad. Unknown produces no invented category.

Multiple domains may be represented as primary and secondary when the merchant actually spans them. Calinium does not force a merchant into one narrow taxonomy for preset convenience.

Industry detection cannot confirm materials, manufacturing methods, target audience, origin, efficacy, sustainability, or quality.

## 19 Brand Personality Detection

Brand personality describes the intended manner of expression, not factual identity.

Candidate personalities may include:

- restrained;
- premium;
- luxury;
- playful;
- warm;
- calm;
- confident;
- technical;
- editorial;
- modern;
- traditional;
- expressive.

Detection considers explicit feeling words, examples of what the merchant wants or wants to avoid, current approved brand expression, optional website patterns, catalog presentation, and contradictions among those signals.

Explicit merchant preference governs over aesthetic inference. Current visual expression may be outdated; Calinium must not assume the merchant wants to preserve it. High-confidence personality may shape an automatic design recommendation. Medium confidence is presented with a concise rationale. Low or Unknown confidence prompts **How should your store feel?**

Personality labels never authorize tone claims such as heritage, artisan, scientific, sustainable, or trustworthy. Those meanings require separate truth.

## 20 Audience Detection

Audience is merchant-owned. Calinium may produce an audience candidate, but it may not silently confirm who the merchant serves.

Safe audience signals include:

- explicit merchant answers;
- current product and collection positioning;
- approved brand language;
- purchase complexity and use context explicitly present in current content;
- optional website positioning as supplemental evidence.

Calinium does not infer protected traits, income, age, gender, geography, profession, family status, health condition, or lifestyle from images, names, price, product category, or industry stereotypes.

High confidence requires explicit merchant wording or equivalent current approved business truth. Medium confidence produces a reviewable candidate. Low or Unknown confidence triggers **Who is your ideal customer?** when audience materially affects direction.

If the merchant cannot define an audience, Calinium may design for clear product discovery without inventing demographic specificity. The absence of an audience profile does not block a truthful minimal storefront.

## 21 Homepage Strategy Detection

Homepage Strategy translates business objectives, catalog shape, brand direction, and available resources into a recommended information sequence.

Candidate strategies may be:

- product-led conversion;
- collection-led discovery;
- image-led editorial discovery;
- evidence-led brand explanation when approved evidence exists;
- focused single-product narrative;
- minimal commerce baseline;
- technical product explanation;
- balanced brand and commerce.

Detection considers the merchant's primary objective, priority product line, catalog breadth, collection readiness, approved media, approved evidence, editorial resources, audience candidate, and design language.

Calinium recommends section roles and order, not fabricated content. A Craftsmanship role appears only with approved craft evidence; an editorial grid appears only with approved destinations; Shop the Look appears only with explicit approved product associations; testimonial content never appears without approved testimonials.

When resources are incomplete, Calinium simplifies the strategy. Optional absent media or collections should not block a coherent homepage. The strategy remains deterministic and reviewable.

## 22 Theme Recommendation Engine

The Theme Recommendation Engine recommends one compatible preset as the strongest starting point for the current understanding.

It considers:

- candidate industry;
- brand personality and positioning;
- design language;
- catalog and commerce posture;
- homepage strategy;
- current resource readiness;
- merchant avoidances;
- compatibility and truth boundaries.

Calinium leads with one recommendation and a short merchant-facing reason. Compatible alternatives appear only when useful or requested. It does not expose raw weights, present incompatible options, or turn the app into a preset marketplace.

Preset recommendation is deterministic for the same current inputs and policy. Preset identity never supplies merchant facts, claims, evidence, campaign context, product associations, or content. A merchant with limited content may receive a simpler compatible preset rather than pressure to manufacture resources.

Recommendation is not approval. Until the unresolved Quick Start preset-approval question is decided, Calinium preserves the existing explicit preset approval boundary.

## 23 Resource Recommendation Engine

The Resource Recommendation Engine assembles the Recommended Resource Set from current approved Shopify resources and project assets.

Every recommendation contains:

- **Confidence:** High, Medium, Low, or Unknown.
- **Reason:** The concise evidence-based fit for the role.
- **Alternatives:** Compatible approved options, limited to useful choices.
- **Fallback:** A safe substitute or omission.
- **Approval requirement:** Set-level ordinary review or individual confirmation.
- **Merchant visibility:** Always reviewable; sensitive or ambiguous choices are prominent.

Canonical recommendation slots include:

| Slot | Ranking behavior | Safe fallback | Approval behavior |
| --- | --- | --- | --- |
| Logo | Prefer current approved brand asset with clear role | Text store identity where supported | Bulk only when unambiguous |
| Hero media | Prefer approved media supporting hierarchy and crop | Simpler product-led or non-media hero | Bulk when ordinary and High confidence |
| Hero destination | Prefer approved destination aligned with primary objective | No destination | Individual when meaning is consequential |
| Featured collection | Prefer approved priority collection with representative catalog | Product-led structure or omit | Bulk when current and unambiguous |
| Featured product | Prefer approved priority or representative product | Omit | Bulk when current and unambiguous |
| Craftsmanship media | Require approved evidence-linked media | Omit media or unsupported craft content | Sensitive evidence remains individual |
| Primary navigation | Prefer coherent current approved Shopify menu | Minimal current approved destinations | Individual when changing menu meaning |
| Preview theme | Prefer eligible compatible theme context | Supported Calinium review foundation | Existing preview approval governs |
| Optional video | Require approved media and necessary accessibility context | Approved image or omission | Individual if selected |

The engine never uses cross-project resources, guesses destinations, infers product relationships, treats media as evidence, or silently replaces stale resources. Ordinary set-level approval never includes sensitive claims or evidence.

## 24 Confidence Engine

Confidence is deterministic for the same evidence, source status, recency, conflicts, and policy. It is attached to a specific conclusion, not to the merchant or entire project.

### High

Evidence is authoritative or explicitly merchant-confirmed, current, specific, compatible, and free of material conflict; or several independent current signals agree on an ordinary reversible interpretation.

Behavior:

- automatically recommend ordinary reversible choices;
- keep the recommendation reviewable;
- include eligible ordinary resources in set-level review;
- never bypass sensitive confirmation or required approval.

### Medium

Evidence supports a reasonable candidate but is indirect, incomplete, or contains a minor tradeoff.

Behavior:

- recommend one direction with a concise uncertainty reason;
- suggest review at the combined review point;
- ask one question only if it materially improves the outcome;
- prefer safe omission for optional dependent content.

### Low

Evidence is weak, stale, ambiguous, contradictory, or insufficient to distinguish consequential options.

Behavior:

- do not silently select a consequential value;
- ask one necessary question, request a current approved resource, or omit;
- require explicit merchant decision before using the low-confidence consequential candidate.

### Unknown

No usable evidence exists or the source cannot establish the dimension.

Behavior:

- make no inference;
- ask only if the information is required or materially valuable;
- otherwise record Unknown and continue with a safe neutral direction or omission.

Confirmed and Approved remain separate states, not confidence levels. Whether confidence bands are visible to merchants remains an open decision.

## 25 Missing Information Behaviour

Missing information is classified by consequence:

- **Critical merchant truth:** Ask one focused question.
- **Sensitive factual content:** Request exact confirmation and governed evidence, or omit.
- **High-impact preference:** Ask if Calinium cannot form a safe reversible recommendation.
- **Ordinary reversible design choice:** Decide automatically when confidence permits.
- **Optional content:** Omit without blocking.
- **Unknown with no current consequence:** Record and continue.

Calinium never asks questions merely to make a profile appear complete. A missing founder story does not block a product-led theme. An unknown audience can remain broad if the merchant cannot answer and a clear product experience remains possible. Missing performance claims, testimonials, or statistics are omissions, not content tasks.

Questions Remaining contains only unresolved items with a current reason. Resolved, safely delegated, omitted, or irrelevant topics do not remain as artificial progress debt.

## 26 Missing Resource Behaviour

Missing ordinary resources do not punish the merchant:

```text
No logo
→ use approved text identity where supported

No hero
→ use a simpler product-led or non-media hero

No homepage imagery
→ continue with products, typography, hierarchy, or safe omission

Only one product
→ recommend a focused single-product or minimal catalog strategy

No collections
→ use product-led discovery

Incomplete menus
→ preserve safe current paths and identify only a genuine required gap
```

For every missing resource, Calinium determines whether the role is required, optional, replaceable, or omittable. It explains only when merchant action or a meaningful design consequence exists.

Calinium never creates fake logos, stock imagery presented as merchant media, invented collections, placeholder products, arbitrary destinations, or generic evidence copy. A resource becoming stale never triggers silent replacement.

Generation readiness is blocked only when the selected approved composition genuinely requires a resource and no safe fallback or omission exists.

## 27 Missing Website Behaviour

A public website is always optional.

If no website is supplied:

- intake proceeds from Shopify and merchant conversation;
- confidence reflects the smaller evidence set;
- no warning or penalty appears;
- Calinium asks only questions that remain materially unresolved;
- website-specific observations are absent rather than guessed.

If a website cannot be accessed or analyzed:

- Calinium states that the optional source was unavailable;
- Shopify analysis and conversation continue;
- completed work remains valid;
- the merchant may retry, replace the URL, or skip;
- no source content is fabricated from the domain name or cached assumptions.

If website and Shopify signals conflict, Shopify governs current store resources and the merchant resolves business intent. Calinium does not merge the conflict into a synthetic fact.

## 28 Merchant Question Engine

The Merchant Question Engine asks only when at least one condition is true:

- confidence is Low or Unknown for a consequential outcome;
- the merchant's subjective preference materially shapes the design;
- a required fact cannot be learned from an authoritative source;
- a sensitive claim requires exact confirmation;
- current sources conflict materially;
- a required resource or destination needs merchant selection;
- the merchant's correction is too ambiguous to apply safely.

It does not ask when:

- Shopify already answers the resource question;
- an ordinary reversible choice has High confidence;
- a Medium-confidence recommendation can be reviewed naturally later;
- the information is optional and omission is safe;
- the answer would not change current strategy;
- the question exists only to fill a profile field.

Questions are singular, concise, and merchant-facing. The preferred order is highest consequence, highest information gain, and lowest merchant effort. Calinium never asks two unrelated questions at once.

Quick Start asks no more than five to seven essential questions and stops earlier when possible. **I don't know** records Unknown. **You decide** delegates only eligible reversible creative judgment. Sensitive truth, target audience, business identity, legal information, pricing, payment, and publication cannot be delegated this way.

## 29 Recommendation Review

Intake culminates in one coherent review, not a technical report.

The merchant reviews:

- Business Profile;
- Brand Profile;
- audience candidate;
- industry candidate;
- recommended preset;
- Homepage Strategy;
- Recommended Resource Set;
- current confidence and source summary in the approved merchant-facing form;
- safe omissions;
- conflicts;
- Questions Remaining;
- claims requiring individual confirmation.

Every recommendation identifies its current choice, concise reason, source category, confidence behavior, alternatives where useful, fallback, and approval requirement.

Ordinary current resource recommendations may be approved as a set. Sensitive content, evidence, ambiguous resources, consequential destinations, and unresolved facts remain separate. Review never turns inference into fact merely because the merchant approves a design direction.

Merchant corrections update only dependent candidate outputs and preserve unrelated work. The review remains provisional until existing authoritative approval boundaries are satisfied.

## 30 Quick Start Behaviour

Quick Start is intake's default expression.

It:

- begins Shopify analysis after the first meaningful answer;
- runs optional website learning without blocking conversation;
- asks five to seven essential questions maximum and fewer when possible;
- infers reviewable ordinary candidates automatically;
- recommends one preset and Homepage Strategy;
- assembles one Recommended Resource Set;
- makes missing ordinary resources non-blocking;
- gathers ordinary decisions into one combined review;
- preserves individual confirmation for sensitive truth;
- targets paid-generation readiness in under ten minutes without weakening safety.

Quick Start hides internal stage complexity. It does not hide uncertainty, conflicts, omissions, required approvals, or material consequences.

## 31 Guided Behaviour

Guided uses the same sources, outputs, confidence, truth, and approval rules as Quick Start. It adds explanation and comparison, not more automatic authority.

It:

- explains why a question matters;
- shows recommendation rationale earlier;
- makes confidence and tradeoffs more visible in merchant language;
- presents compatible alternatives where they clarify a real choice;
- provides more deliberate Business, Brand, Theme, and Resource review;
- explains which downstream recommendation a correction affects;
- still avoids unnecessary questions and technical configuration.

Guided does not become a comprehensive questionnaire. It does not infer more sensitive truth than Quick Start or lower the threshold for automatic decisions.

## 32 Advanced Behaviour

Advanced exposes detailed intake understanding through the existing authoritative stages and records.

It may show:

- source distinctions;
- facts, preferences, interpretations, unknowns, and conflicts;
- detailed Business and Brand Profiles;
- industry, personality, audience, and design-language candidates;
- strategy and preset alternatives;
- Shopify resource inventories and provenance;
- resource confidence, alternatives, and omissions;
- questions and sensitive confirmations;
- dependent approval status.

Advanced preserves Calinium's recommendation. It does not abandon the merchant to raw data or technical settings. The same truth and confidence rules apply.

Switching to or from Advanced changes presentation only. It creates no duplicate project, profile, strategy, preset, approval, snapshot, or revision. Detailed corrections flow back into the same project-scoped intake outputs.

## 33 Failure Behaviour

Intake failure is scoped to the affected source or conclusion.

Calinium must:

- state which source or analysis could not complete in merchant language;
- identify whether it is required, optional, retryable, stale, or safely omitted;
- preserve merchant answers and successful independent intelligence;
- avoid blaming the merchant;
- avoid technical error detail;
- offer retry, replacement, reconnection, question, fallback, or omission as appropriate;
- avoid claiming confidence or completion not supported by current evidence.

A product scan failure does not erase website or conversation understanding. A website failure does not stop Shopify learning. A theme-settings failure does not block a safe design recommendation. A critical shop-authorization failure may stop Shopify-dependent analysis while preserving the merchant's conversation.

Failure never authorizes fabricated fallback, cross-project resource use, validation bypass, or silent substitution.

## 34 Recovery Behaviour

Recovery restores the latest truthful project-scoped intake state.

Calinium first distinguishes:

- work durably completed;
- work currently in progress;
- work that failed;
- sources that became stale;
- candidate outputs affected by the failure;
- outputs that remain valid.

It then offers the smallest safe next action. Retrying one source does not restart completed sources. A refreshed resource inventory does not silently approve new versions. A stale conclusion is recomputed or marked for review; it is not presented as current.

Merchant corrections and approved decisions remain intact unless their source dependency changed. If a source conflict appears after recovery, Calinium identifies it rather than choosing the newest value automatically.

Recovery cannot create duplicate questions, projects, recommendations, approvals, or revisions merely because the merchant reconnects or retries.

## 35 Resume Behaviour

Resume returns the merchant to the latest durable intake outcome without requiring a repeated interview.

On return, Calinium summarizes only useful changes:

- what it learned while the merchant was away;
- what remains in progress;
- what needs one merchant decision;
- whether a recommendation or resource became stale;
- the current next question or review action.

Previously answered questions are not asked again unless their answer was not saved, became contradictory, or a newer correction invalidated it. Previously omitted optional topics do not reappear as blockers.

Project memory remains scoped to the current project. Resume does not import another project's facts or reinterpret immutable historical approvals. It cannot change an old paid order's inputs.

If no durable progress exists for an unsent answer, Calinium restores it only as a draft and does not pretend it was accepted.

## 36 Trust Rules

Trust depends on visible source discipline and honest status.

Calinium must:

- recognize the connected Shopify store without asking for its domain again;
- state when information comes from Shopify, the merchant, an approved project asset, or a public website;
- distinguish observation, interpretation, recommendation, confirmation, and approval;
- keep website intelligence supplemental;
- expose meaningful uncertainty and conflicts;
- keep automatic choices reviewable;
- show omissions when they affect the proposed storefront;
- preserve correction and revision history;
- never imply payment, generation, or delivery during intake;
- never imply that intake can upload, update, or publish a theme.

Words such as **Confirmed**, **Approved**, **Current**, **Generated**, and **Validated** are used only when the corresponding authoritative state is true.

Calinium never hides a weak recommendation behind polished language or asks merchants to trust an unexplained sensitive inference.

## 37 Truthfulness Rules

Automatic Merchant Intake never infers or confirms:

- founder biography;
- handmade or artisan status;
- awards or certifications;
- material or geographic origin;
- revenue or conversion;
- testimonials or reviews;
- statistics;
- customer results;
- sustainability or environmental benefit;
- guarantees, efficacy, quality, durability, or performance;
- external evidence or proof;
- product relationships absent from explicit approval.

Permanent rules are:

1. Preserve source and exact meaning.
2. Do not promote inference to fact.
3. Do not treat website copy as automatic approval.
4. Do not treat image content as evidence.
5. Do not derive identities, destinations, claims, or relationships from labels and filenames.
6. Do not copy third-party expression.
7. Do not create content merely to complete a profile, preview, or strategy.
8. Ask for exact confirmation only when the claim is useful and supported for review.
9. Prefer omission when truth is absent.
10. Reconfirm changed sensitive wording.

Preset, industry, personality, audience, or design-language detection never overrides these rules.

## 38 Privacy Rules

Intake uses only information appropriate to the current authenticated project and authorized sources.

Calinium must not:

- transfer merchant facts or preferences between unrelated projects;
- use one merchant's private data to shape another merchant's intake;
- retain an optional website URL or website content beyond governed project needs without a separate policy;
- expose customer records, private Shopify data, access credentials, or internal resource identifiers in merchant explanations;
- infer protected characteristics or sensitive demographics;
- include merchant conversation, website content, claims, or evidence in product analytics;
- present cross-project patterns as facts about this merchant.

Public availability does not remove provenance, ownership, or privacy responsibilities. Website analysis learns patterns for this project; it is not permission to copy or republish content.

Project-scoped learning remains within the project. Future cross-project preference reuse would require separate transparent consent and is not authorized here.

## 39 Analytics

Analytics evaluates whether intake reduces effort and preserves truth without collecting merchant content.

Measure:

- time from first meaningful answer to Shopify analysis start;
- time to first useful understanding;
- time to first Provisional preview readiness;
- time to industry, audience, homepage, and preset candidates;
- questions asked and skipped by category;
- total Quick Start question count;
- optional website supplied, skipped, completed, or failed without storing the URL;
- source-category success and failure;
- confidence-band distribution by output type;
- recommendation acceptance and correction rate;
- resource recommendation acceptance, replacement, fallback, and omission rates;
- number of sensitive confirmations and safe omissions without their content;
- time to Recommended Resource Set;
- time to paid-generation readiness;
- resume success and abandonment outcome;
- Advanced-mode use.

Do not collect merchant message text, website content, product payloads, resource identities, claims, evidence, customer data, private identifiers, or hidden reasoning.

A truthful omission is not a failed intake. A merchant correction is useful product evidence, not AI failure. Metrics never justify extra questions, fabricated completeness, or weaker consent.

## 40 Open Decisions

The following require product evidence, architecture evidence, merchant research, privacy review, accessibility review, or founder judgment:

1. Does optional website analysis begin immediately after URL submission or require separate confirmation?
2. Can website factual statements become review candidates, or only contextual leads until independently confirmed?
3. May website screenshots be retained or shown, and under what ownership, privacy, and provenance rules?
4. What exact evidence threshold makes the first Provisional preview available?
5. Are confidence bands visible to merchants, and if so, as labels, reasons, or both?
6. What deterministic evidence combinations define High, Medium, Low, and Unknown for each output family?
7. How granular should the canonical industry taxonomy be, and how are genuinely multi-domain merchants represented?
8. How far may audience candidacy go before an explicit merchant answer is required?
9. How much should existing theme settings influence a future direction when the merchant wants change?
10. Are Shopify policy documents used only to detect presence, or may exact approved policy text be recommended for unchanged placement?
11. What tie-breaker governs two equally suitable approved resources?
12. Which low-confidence optional resource recommendations should be omitted automatically rather than reviewed?
13. How much intake reasoning is visible by default in Quick Start?
14. Can Quick Start combine preset acceptance with another explicit approval action?
15. What merchant action clears or limits project-scoped intake memory without altering immutable paid-order history?
16. How should Calinium handle stores serving multiple markets, languages, B2B audiences, or materially different regional catalogs in the first intake release?
17. What current-store accessibility observations are safe to report without implying a compliance audit?
18. When Shopify and website content conflict about brand direction, how prominently should that conflict appear before Calinium asks the merchant?

These decisions must not be answered implicitly through behavior changes or implementation convenience.

## 41 Implementation Readiness

This contract is ready to govern the next product document: Recommended Resource Set.

The next contract should define slot ownership, resource eligibility, ranking dimensions, alternatives, safe fallbacks, confidence presentation, set-level approval, individual sensitive confirmation, replacement, stale-resource behavior, omissions, and the handoff into Store Resources and Content Plan.

Before any future implementation, Automatic Merchant Intake must be demonstrably capable of producing these deterministic project-scoped outputs without fabricating truth:

```text
Business Profile
Brand Profile
Audience candidate
Industry candidate
Preset recommendation
Homepage Strategy
Resource Recommendations
Questions Remaining
Confidence and source summary
Omissions and conflicts
```

This document introduces no interface, API, schema, prompt, model-provider, database, Shopify-scope, generation, billing, or deployment design. Every later implementation must preserve the governing customer journey, interaction design, AI behavior, merchant authority, project isolation, explicit approvals, immutable revisions, paid generation, read-only delivery, and prohibition on automatic theme upload, update, or publication.
