# Video Plugin Template (Minimal Two-File Mode)

Official template for Nova Studio video plugins. Creating a new video model plugin requires **only 1 manifest (`manifest.json`) + 1 JS driver (`index.js`)**, eliminating the need to write verbose `ui.schema.json` and `provider.json` files.

## Directory Structure

```
my-plugin/
├── manifest.json      # Metadata, models, aspect ratios, durations, allowed hosts
├── index.js           # Pure JS driver: build requests, query status, extract video assets
└── fixtures/          # Offline contract fixtures (optional, for local verification)
```

## Quick Start

1. Copy this directory as `backend/plugins/<your-plugin-id>`
2. Configure `manifest.json` (`mode: "script"`, models, and features)
3. Implement `index.js` (`buildSubmit`, `buildQuery`, `parseTaskResult`)
4. Verify with `node backend/plugin-runtime/verify.js <your-plugin-id>`
