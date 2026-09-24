# Discovery

Discovery is the first Merchant Interview category. It records merchant-confirmed context before the existing Business category: business stage, website presence, Shopify presence, desired outcomes, and the creative-freedom constraint.

The question catalog remains the source of truth. The React application renders the server-supplied questions and does not reimplement visibility rules. A website URL is retained only as a normalized merchant reference; this phase does not fetch, crawl, analyse, or connect to it. Shopify URLs and `myshopify` domains are also references only.

Existing 1.0 interview sessions remain valid. When an in-progress session is resumed or saved with the 1.1 catalog, the engine records a `catalog_migrated` event and resolves the new visible-question set. The merchant can then complete the newly relevant Discovery questions without losing compatible prior answers.

Discovery values are stored in the optional, separately versioned `MerchantProfile.enrichment` extension. The original profile version remains `1`, preserving the current Strategy Compiler contract.
