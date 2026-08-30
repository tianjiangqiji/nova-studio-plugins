# 插件模板

[English](README.md) · **简体中文**

复制这个目录、改成你自己的上游，就是一个可用的插件包。

```bash
cp -r _example-video my-plugin
```

目录名以 `_` 或 `.` 开头的会被宿主**跳过且不报错**，所以这份模板可以安全地留在
`backend/plugins/` 里当参考——它不会出现在界面的插件列表里。改名成不带 `_` 的
名字，它才会被加载。

> **`manifest.id` 必须与目录名完全一致**，否则加载会失败并明确报出这一点。
> ID 的格式是 `^[a-z0-9][a-z0-9-]{1,63}$`（小写字母、数字、短横）。
> 所以 `cp -r _example-video my-plugin` 之后，第一件事就是把 `manifest.json`
> 里的 `id` 改成 `my-plugin`。

## 改哪些地方

按这个顺序改，每步都能单独验证：

1. **`manifest.json`** — `id`（**必须与目录名一致**）、
   `name`、`author`、`homepage`、`credential.defaultBaseUrl`、
   `permissions.hosts`（**只填上游 API 的域名**，产物 CDN 不用填）、
   `models[]`（模型 ID 要与上游真实 ID 一致，`price` 不确定就整个删掉）。
2. **`ui.schema.json`** — `modelSelector.variants` 是「facet 组合 → 模型 ID」的事实表，
   先把它列全，界面的联动是宿主从这张表算出来的。然后按需增删 `fields`。
3. **`provider.json`** — 上游的请求体形状、状态词表、进度字段、产物 URL 在哪几层。
4. **`fixtures/`** — 把上游真实的响应体贴进 `upstream-*.json`，写出你期望的
   `expected-*.json`。这一步是唯一能在不消耗额度的前提下确认插件是对的方式。

## 验证

在宿主仓库里跑（`NOVA_PLUGINS_DIR` 指向放着你的插件的目录）：

```bash
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins node backend/plugin-runtime/verify.js
# 只验一个插件：
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins node backend/plugin-runtime/verify.js my-plugin
```

它会做两件事：JSON 结构校验（字段缺失会指出具体路径），以及跑 `fixtures/` 里的
契约用例——用的是线上同一套归一化代码，所以 fixtures 通过就等于线上行为通过。

## 这份模板对应的假想上游

`https://api.example.test`，两个模型（720P / 1080P），请求形如：

```
POST /v1/video/generate
{ "model": "...", "prompt": "...", "duration": 6, "resolution": "1080P", "image_urls": [...] }
→ { "id": "ex-0001", "status": "queued" }

GET /v1/video/tasks/ex-0001
→ { "status": "completed", "progress": 100, "video_url": "...", "duration": 6 }
```

字段的完整语义见宿主仓库的 [`docs/plugins/`](https://github.com/tianjiangqiji/nova-image-studio/tree/main/docs/plugins)。
