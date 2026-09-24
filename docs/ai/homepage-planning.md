# Homepage and page planning

The homepage plan begins with the Strategy Compiler’s ordered sections. `resolve-homepage` requires every selected section to appear in `config/strategy-section-mapping.json` for the selected layout recipe. It rejects a section that is not installed or is absent from that mapping.

For each instance, the builder:

1. assigns a stable ID from page, position, and section ID;
2. preserves compiler order;
3. maps safe section settings to their approved schema defaults;
4. leaves protected fields unresolved;
5. carries real mapping dependencies and fallback behavior;
6. sets the section validation status after asset and picker checks.

Other-page plans use only their `page_blueprint.*` mapping records. Product, Collection, About, Contact, and Article are currently mapped. Blog is intentionally represented as an `unsupported` plan because 6A has no approved Blog page-blueprint mapping. The Draft Builder does not infer or silently add a Blog section.

No plan changes a template or creates a section instance. The plan simply describes the future configuration work that a separately authorized generator may perform.
