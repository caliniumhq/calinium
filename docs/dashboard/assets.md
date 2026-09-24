# Asset Library

The Asset Library is project scoped. Assets belong to both an organization and project, and every operation verifies the authenticated user’s organization membership and project permission.

Files are stored through a provider interface:

```text
Dashboard API → AssetService → StorageProvider → LocalFilesystemProvider
```

The initial local provider writes below `.calinium-data/assets` using opaque relative storage keys. Browser responses never expose absolute server paths; previews and downloads use authenticated application URLs. A future object-storage provider can satisfy the same `put`, `read`, and `remove` contract without changing the UI or Interview Engine.

Initial allowlisted formats are PNG, JPEG, WebP, PDF, MP4, and WebM, with a 25 MB maximum. The service checks MIME type, extension, file signature, generated safe name, checksum, ownership, and image dimensions where available. SVG, HTML, JavaScript, executable archives, and arbitrary binary files are not accepted.

Deletion is a confirmed soft deletion. The physical local file is removed, while metadata remains marked deleted for audit history. If a confirmed Merchant Profile references the asset, the application warns before deletion and preserves the historical profile reference rather than mutating it.
