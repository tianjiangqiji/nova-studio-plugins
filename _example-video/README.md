# Plugin template

**English** · [简体中文](README.zh-CN.md)

Copy this directory, point it at your own upstream, and you have a working plugin pack.

```bash
cp -r _example-video my-plugin
```

Directories starting with `_` or `.` are **skipped by the host without error**, so this template can
safely live inside `backend/plugins/` as a reference — it won't appear in the plugin list. Rename it to
something without the underscore and it gets loaded.

> **`manifest.id` must exactly match the directory name**, otherwise loading fails and says so.
> The ID format is `^[a-z0-9][a-z0-9-]{1,63}$` (lowercase letters, digits, hyphens).
> So right after `cp -r _example-video my-plugin`, the first thing to do is set `id` to `my-plugin`
> in `manifest.json`.

## What to change

In this order — each step can be validated on its own:

1. **`manifest.json`** — `id` (**must match the directory name**), `name`, `author`, `homepage`,
   `credential.defaultBaseUrl`, `permissions.hosts` (**only the upstream API's domains**; artifact CDNs
   don't belong here), and `models[]` (model IDs must match the upstream's real IDs; if you're unsure
   about pricing, delete the `price` field entirely).
2. **`ui.schema.json`** — `modelSelector.variants` is the factual table mapping facet combinations to
   model IDs. Fill it in completely first; the host derives the form's interlocking behaviour from it.
   Then add or remove `fields` as needed.
3. **`provider.json`** — the upstream's request body shape, status vocabulary, progress field, and which
   paths hold the result URL.
4. **`fixtures/`** — paste the upstream's real responses into `upstream-*.json` and write the
   `expected-*.json` you expect. This is the only way to confirm a plugin is correct without spending
   credits.

## Verification

Run this from the host repository, with `NOVA_PLUGINS_DIR` pointing at the directory holding your plugin:

```bash
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins node backend/plugin-runtime/verify.js
# just one plugin:
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins node backend/plugin-runtime/verify.js my-plugin
```

It does two things: JSON structural validation (missing fields are reported with their exact path), and
the contract cases under `fixtures/` — using the same normalization code that runs in production, so
passing fixtures means passing in production.

## The fictional upstream this template targets

`https://api.example.test`, two models (720P / 1080P), requests shaped like:

```
POST /v1/video/generate
{ "model": "...", "prompt": "...", "duration": 6, "resolution": "1080P", "image_urls": [...] }
→ { "id": "ex-0001", "status": "queued" }

GET /v1/video/tasks/ex-0001
→ { "status": "completed", "progress": 100, "video_url": "...", "duration": 6 }
```

For the full meaning of every field, see the host repository's
[`docs/plugins/`](https://github.com/tianjiangqiji/nova-image-studio/tree/main/docs/plugins).
