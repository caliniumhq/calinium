# Compiler versioning

Compiler output records `compiler_version` and the versions of the design-intelligence, section-manifest, setting-metadata, and block-taxonomy catalogs. Version values are part of determinism: identical profile, compiler, and catalog versions must produce identical output.

Increment the compiler major version for a breaking output contract or precedence change. Increment a catalog version when its interpretation changes. Never rename a catalog ID silently; retain an explicit compatibility mapping in a future version before consumers migrate.
