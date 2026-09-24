# Release history

Release history is append-only JSON evidence stored at `output/release-history/events/<release-id>.json`. The history event is byte-for-byte semantically identical to the release manifest written inside the isolated release directory.

The manager opens history files with exclusive creation and rejects an existing release ID. On every release eligibility check it validates all existing history records against `calinium-release-manifest.schema.json` and confirms each filename matches its `release_id`.

Use:

```sh
node release-theme.js history --type releases
```

History is not a deployment control plane and cannot publish, alter, or overwrite a Shopify theme.
