# Calinium block taxonomy

`config/calinium-block-taxonomy.json` is the canonical reusable-block vocabulary. Each ID is snake_case, maps to a concrete Shopify block type, and has one semantic meaning.

The Brand Storytelling Pack adds: `achievement`, `timeline_item`, `material`, `craft_step`, `process_step`, `initiative`, `metric`, `certification`, `value`, `team_member`, `award`, and `gallery_item`.

Do not substitute vague names such as `item`, `card`, or `entry`. Before adding a block type, check the taxonomy for an equivalent and extend that record only when its meaning is genuinely new. The validator ensures every manifest-supported type is both registered and present in the applicable section schema.
