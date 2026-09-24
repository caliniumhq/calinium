# Verification History

Each terminal report is copied once, using exclusive file creation, to:

`output/verification-history/events/preview-verification-*.json`

This directory is append-only. Reusing a verification ID is rejected before any report or remote read-only pull occurs. The history is separate from `output/deployment-history/`; Milestone 8C reads deployment history but never alters it.

`node verify-preview.js history` emits concise record summaries. Use `node verify-preview.js report --verification <id>` for the complete evidence report.
