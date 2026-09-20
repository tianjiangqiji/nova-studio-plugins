# 视频插件模板（极简双文件模式）

本项目是 Nova Studio 视频插件的官方极简模板。制作一个全新的视频模型插件，**只需 1 个描述文件 (`manifest.json`) + 1 个 JS 驱动 (`index.js`)**，无需手写繁琐的 `ui.schema.json` 与 `provider.json`。

## 文件结构

```
my-plugin/
├── manifest.json      # 插件元数据、支持的模型、分辨率/时长选项、权限声明
├── index.js           # 纯函数驱动：组装请求、轮询状态、提取视频产物
└── fixtures/          # 离线契约用例（可选但推荐，支持本地免 Key 自检）
```

---

## 1. 描述文件 `manifest.json`

在 `manifest.json` 中配置您的模型信息和特性，后端**智能 UI 合成器**会自动将其转化为前端渲染所需的表单与工具栏：

```json
{
  "apiVersion": 1,
  "id": "my-plugin",
  "name": "我的视频生成",
  "version": "1.0.0",
  "kind": "video",
  "mode": "script",
  "description": "基于极简 JS 驱动的视频生成插件",
  "author": "Your Name",
  "credential": {
    "source": "client",
    "label": "API Key",
    "defaultBaseUrl": "https://api.upstream.example.com",
    "helpUrl": "https://example.com/api-keys"
  },
  "permissions": {
    "hosts": [
      "api.upstream.example.com"
    ]
  },
  "models": [
    {
      "id": "model-v1",
      "name": "模型标准版",
      "price": { "unit": "per-second", "amount": 0.05 }
    }
  ],
  "media": {
    "images": { "maxCount": 1, "label": "参考图片", "hint": "可选垫图" }
  },
  "features": {
    "aspectRatios": ["16:9", "9:16", "1:1"],
    "durations": [5, 10]
  }
}
```

### UI 是如何兼容的？新模式怎么扩展？
- **零前端修改**：后端加载时，若未发现手写的 `ui.schema.json`，会自动依据 `manifest.json` 生成合规的 `PluginUiSchema`，前端宿主无缝渲染。
- **扩展新模式（如运镜控制、光影风格、首尾帧等）**：
  在 `features.customControls` 中声明控件即可，例如：
  ```json
  "customControls": [
    {
      "key": "camera_motion",
      "type": "select",
      "label": "运镜方式",
      "default": "zoom_in",
      "options": [
        { "value": "zoom_in", "label": "镜头推进" },
        { "value": "pan_left", "label": "向左横移" }
      ]
    }
  ]
  ```
  声明后，前端工具栏会自动出现该控件，用户选中的值将直接流入 `ctx.fields.camera_motion`！

---

## 2. 纯函数驱动 `index.js`

使用标准的 CommonJS 导出，编写纯函数，无任何第三方包依赖：

```javascript
'use strict';

module.exports = {
  /**
   * 1. 构造创建任务请求
   * @param {object} ctx 执行上下文
   *   - ctx.baseUrl: 用户配置或默认的上游地址
   *   - ctx.apiKey: 用户配置的鉴权密钥
   *   - ctx.model: 当前选中的模型 ID
   *   - ctx.fields: 用户填写的表单参数（prompt, aspectRatio, seconds, 自定义控件等）
   *   - ctx.media: 用户上传的素材（images 等本地代理路径）
   */
  buildSubmit(ctx) {
    return {
      url: `${ctx.baseUrl}/v1/videos/generations`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: ctx.model,
        prompt: ctx.fields.prompt,
        aspect_ratio: ctx.fields.aspectRatio || '16:9',
        duration: Number(ctx.fields.seconds) || 5,
        image_url: ctx.media.images?.[0],
      },
    };
  },

  /**
   * 2. 解析上游创建响应（可选，缺省默认提取常见 id 字段）
   */
  parseSubmitResponse(data) {
    const taskId = data.id || data.task_id || data.data?.id;
    if (!taskId) throw new Error('未返回任务 ID');
    return { taskId: String(taskId) };
  },

  /**
   * 3. 构造轮询状态请求
   */
  buildQuery(taskId, ctx) {
    return {
      url: `${ctx.baseUrl}/v1/videos/generations/${taskId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
      },
    };
  },

  /**
   * 4. 归一化解析任务状态与视频产物
   * @returns {{ state: 'queued'|'processing'|'completed'|'failed', progress?: number, assets?: Array<{ url: string }>, error?: string }}
   */
  parseTaskResult(data) {
    const status = String(data.status || data.state || '').toLowerCase();

    if (['succeeded', 'completed', 'done'].includes(status)) {
      const url = data.video_url || data.output?.video_url || data.data?.video_url;
      if (!url) return { state: 'failed', error: '上游报告完成但无视频下载地址' };
      return {
        state: 'completed',
        progress: 100,
        assets: [{ url }],
      };
    }

    if (['failed', 'error'].includes(status)) {
      return {
        state: 'failed',
        error: data.error?.message || data.error || '生成失败',
      };
    }

    if (['queued', 'pending'].includes(status)) {
      return { state: 'queued' };
    }

    return {
      state: 'processing',
      progress: typeof data.progress === 'number' ? data.progress : undefined,
    };
  },
};
```

---

## 3. 本地免 Key 校验

在宿主仓库运行自检：
```bash
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins node backend/plugin-runtime/verify.js my-plugin
```
校验器会自动进行语法检测、权限主机校验与离线用例匹配，确保插件运行万无一失。
