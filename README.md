# Nova Studio Plugins

**English** · [简体中文](README.zh-CN.md)

Video plugin packs and developer guidelines for [Nova Studio](https://github.com/tianjiangqiji/nova-image-studio).

Nova Studio supports two plugin development modes, with the **Minimal Two-File Mode** recommended:

### 1. Minimal JS Driver Mode (Recommended)
Only **1 manifest file + 1 pure JS driver file**. No tedious `ui.schema.json` or `provider.json` needed. The UI is synthesized automatically by the backend without front-end intrusion.
```
my-plugin/
├── manifest.json      # Metadata, models, durations/aspect ratios, allowed hosts
├── index.js           # Pure JS driver: build submit, query status, parse results
└── fixtures/          # Offline contract fixtures (optional)
```

### 2. Classic Declarative Mode (Supported)
```
my-plugin/
├── manifest.json      # Metadata
├── ui.schema.json     # Custom form layout
├── provider.json      # Template-based request and extraction definitions
└── fixtures/          # Offline fixtures
```

## What's in here

| Directory | Mode | Description |
| --- | --- | --- |
| [`_template-video/`](_template-video/) | Two-File Driver | **Official recommended template**. Pure JS driver, auto UI synthesis. Copy it to start. |
| [`sora/`](sora/) | Two-File Driver | **OpenAI Sora production plugin**. Clean 30-line JS driver with full fixtures. |
| [`_example-video/`](_example-video/) | Declarative | Classic 3-JSON declarative template. |

> Directories prefixed with `_` are automatically ignored by the host during scanning.

## Installing

Installing a plugin means **placing a directory in the host's `backend/plugins/` folder**, done by an admin on the server. The host UI can only list what's installed and let each user fill in their own credentials; it cannot install or remove plugins.

The whole collection:

```bash
cd /path/to/nova-image-studio/backend/plugins
git clone https://github.com/tianjiangqiji/nova-studio-plugins.git .
```

Just one plugin (sparse checkout):

```bash
cd /path/to/nova-image-studio/backend/plugins
git clone --filter=blob:none --sparse https://github.com/tianjiangqiji/nova-studio-plugins.git tmp
cd tmp && git sparse-checkout set some-plugin && mv some-plugin .. && cd .. && rm -rf tmp
```

Or the simplest way — download the zip and drag the plugin directory into `backend/plugins/`.

**No backend restart needed**: hit Reload under Settings → Plugins and the host rescans the directory.

## Writing a plugin

```bash
cp -r _example-video my-plugin
```

Then follow [`_example-video/README.md`](_example-video/README.md) and change four things. Start by
setting `manifest.json`'s `id` to `my-plugin` — **the `id` must match the directory name**. The core
idea in one line: **don't write rules, write facts.**

An upstream usually exposes a pile of model IDs that are really combinations of a few dimensions
(tier × resolution). List every combination that actually exists as one `variant` row:

```json
"variants": [
  { "model": "h3-standard-768p",  "tier": "standard", "resolution": "768P" },
  { "model": "h3-standard-1080p", "tier": "standard", "resolution": "1080P" },
  { "model": "h3-lite-768p",      "tier": "lite",     "resolution": "768P" }
]
```

From that table alone the host works out which model ID to submit, which resolutions remain once Lite
is picked, and where to land a value that stopped existing after switching tiers. In the example above
Lite has no 1080P, so selecting Lite leaves a single resolution option which then hides itself — none
of that requires you to write a condition.

## Verification: confirm the plugin is right without spending credits

Run the host's verifier with `NOVA_PLUGINS_DIR` pointed at this repository:

```bash
git clone https://github.com/tianjiangqiji/nova-image-studio.git
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins \
  node nova-image-studio/backend/plugin-runtime/verify.js
```

It does two things:

1. **Structural validation** — missing fields, wrong types, a `variant` missing one of the facets, a
   model ID never declared in `manifest.models`: each is reported with its exact path.
2. **Contract cases** — every case under `fixtures/`: `input.json` is resolved into a request body and
   deep-compared against `expected-request.json`; `upstream-poll.json` goes through normalization and
   is deep-compared against `expected-result.json`.

Step 2 runs **the same normalization function production uses**, not a reimplementation in the tests,
so passing fixtures means passing in production. It also means you can write and validate an entire
plugin without holding an API key.

This repository's CI runs that check on every push. (Until the host's plugin runtime lands on its
default branch, CI emits a warning and skips — a red X only ever means the plugin pack itself is wrong.)

## Documentation

The full protocol docs live in the host repository under
[`docs/plugins/`](https://github.com/tianjiangqiji/nova-image-studio/tree/main/docs/plugins)
(written in Chinese):

| Document | Contents |
| --- | --- |
| [quickstart.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/quickstart.md) | First plugin from scratch in 30 minutes |
| [manifest.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/manifest.md) | Every `manifest.json` field |
| [ui-schema.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/ui-schema.md) | Form description, facet matrix, visibility vocabulary |
| [provider.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/provider.md) | Request template DSL, status and result extraction |
| [lifecycle.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/lifecycle.md) | Task lifecycle, polling and timeout semantics |
| [errors.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/errors.md) | Error codes and troubleshooting |
| [testing.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/testing.md) | How to write fixtures |
| [cookbook.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/cookbook.md) | "The upstream looks like this, so the schema looks like that" |
| [LLM.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/LLM.md) | **Single-file protocol summary to feed an AI** |

If you want an AI to write the plugin: hand it `LLM.md` together with the upstream's API docs and it can
produce all three JSON files directly. Validate the result with the verifier above.

## Submitting a plugin

PRs welcome. Before merging we look at:

- `NOVA_PLUGINS_DIR=... node .../verify.js <your-plugin>` passes
- At least 3 fixtures: one normal completion, one upstream failure, one with reference media
- `permissions.hosts` lists only the upstream API's domains — no wildcards, no artifact CDNs
- No API keys, accounts or internal addresses anywhere in the pack
- `price` either states the real declared price or is omitted entirely (omitted means no price is shown, never ¥0.00)

## Security notes

- Plugin packs are **pure data**; the host never evals any part of them. The protocol deliberately has
  no support for executable code.
- A plugin may only reach hosts declared in `permissions.hosts`; private ranges and loopback addresses
  are always refused (SSRF defence).
- API keys live in the user's browser — the server holds nobody's key, and a plugin pack certainly
  shouldn't contain one.
- Before installing, `cat` the three JSON files. Being plain JSON is the whole point: you can audit a
  pack at a glance.

## License

AGPL-3.0, matching the host project. See [LICENSE](LICENSE).


