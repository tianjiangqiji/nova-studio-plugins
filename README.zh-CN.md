# Nova Studio Plugins

[English](README.md) · **简体中文**

[Nova Studio](https://github.com/tianjiangqiji/nova-image-studio) 视频插件包的合集。

一个插件包就是**三个 JSON 文件的目录**，没有可执行代码、不需要编译、不需要安装依赖。
放进宿主的 `backend/plugins/` 就能用。

```
my-plugin/
├── manifest.json      # 我是谁、有哪些模型、价格、允许访问哪些主机
├── ui.schema.json     # 表单长什么样（宿主用自己的组件渲染）
├── provider.json      # 怎么发请求、怎么读状态与产物
└── fixtures/          # 离线契约用例（可选，但强烈建议）
```

## 仓库里有什么

| 目录 | 说明 |
| --- | --- |
| [`_example-video/`](_example-video/) | 最小完整插件模板。可校验、fixtures 可通过。复制它开始写你自己的。 |

> `_example-video` 以下划线开头，宿主加载时会**跳过且不报错**，所以整个仓库可以直接
> clone 进 `backend/plugins/`，模板不会出现在界面的插件列表里。

官方维护的插件（如 Sora、SeedDance）会陆续加进来。参考实现
[`ccode-h3`](https://github.com/tianjiangqiji/nova-image-studio/tree/main/backend/plugins/ccode-h3)
留在宿主仓库里——它同时是协议的测试基线，宿主的单元测试直接读它的真实 JSON。

## 安装

插件的安装就是**把目录放进宿主的插件文件夹**，由管理员在服务器上操作。宿主界面
只能查看已装插件、填写各自的调用凭据，装不了也删不了插件。

整个合集：

```bash
cd /path/to/nova-image-studio/backend/plugins
git clone https://github.com/tianjiangqiji/nova-studio-plugins.git .
```

只要其中一个插件（sparse checkout）：

```bash
cd /path/to/nova-image-studio/backend/plugins
git clone --filter=blob:none --sparse https://github.com/tianjiangqiji/nova-studio-plugins.git tmp
cd tmp && git sparse-checkout set some-plugin && mv some-plugin .. && cd .. && rm -rf tmp
```

或者最朴素的方式——下载 zip，把插件目录拖进 `backend/plugins/`。

装完**不用重启后端**：设置 → 插件里点一下刷新，宿主会重扫目录。

## 写一个插件

```bash
cp -r _example-video my-plugin
```

然后照 [`_example-video/README.zh-CN.md`](_example-video/README.zh-CN.md) 改四个地方。第一件事是把
`manifest.json` 的 `id` 改成 `my-plugin`——**`id` 必须与目录名一致**。核心思路一句话：
**不写规则，写事实。**

上游往往有一堆模型 ID，它们其实是几个维度的组合（档位 × 分辨率）。你把每个真实存在的
组合列成一行 `variant`：

```json
"variants": [
  { "model": "h3-standard-768p",  "tier": "standard", "resolution": "768P" },
  { "model": "h3-standard-1080p", "tier": "standard", "resolution": "1080P" },
  { "model": "h3-lite-768p",      "tier": "lite",     "resolution": "768P" }
]
```

宿主就能自己算出：该提交哪个模型 ID、选了 Lite 之后分辨率里还剩哪些选项、切换档位后
把不存在的取值收敛到哪里。上例中 Lite 没有 1080P，于是选中 Lite 后分辨率只剩一个
选项并自动隐藏——这些都不需要你写任何条件。

## 验证：不花额度就能确认插件是对的

在宿主仓库里跑校验器，用 `NOVA_PLUGINS_DIR` 指向这个仓库：

```bash
git clone https://github.com/tianjiangqiji/nova-image-studio.git
NOVA_PLUGINS_DIR=/path/to/nova-studio-plugins \
  node nova-image-studio/backend/plugin-runtime/verify.js
```

它做两件事：

1. **结构校验** — 字段缺失、类型不对、`variants` 少写了某个 facet、模型 ID 没在
   `manifest.models` 里申报过，都会指出具体路径和行号。
2. **契约用例** — 跑 `fixtures/` 里的每个用例：`input.json` 求出请求体，与
   `expected-request.json` 深比较；`upstream-poll.json` 过一遍归一化，与
   `expected-result.json` 深比较。

第 2 步用的是**线上同一个归一化函数**，不是测试里另写一份，所以 fixtures 通过就等于
线上行为通过。这也意味着你可以在完全没有 API Key 的情况下把插件写完、验对。

本仓库的 CI 对每次推送都跑这套校验。（宿主的插件运行时尚未发布到默认分支之前，
CI 会打一条 warning 并跳过——红叉只代表插件包本身写错了。）

## 文档

完整协议文档在宿主仓库
[`docs/plugins/`](https://github.com/tianjiangqiji/nova-image-studio/tree/main/docs/plugins)：

| 文档 | 内容 |
| --- | --- |
| [quickstart.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/quickstart.md) | 30 分钟从零写出第一个插件 |
| [manifest.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/manifest.md) | `manifest.json` 每个字段 |
| [ui-schema.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/ui-schema.md) | 表单描述、facet 矩阵、可见性词汇 |
| [provider.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/provider.md) | 请求模板 DSL、状态与产物提取 |
| [lifecycle.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/lifecycle.md) | 任务生命周期、轮询与超时语义 |
| [errors.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/errors.md) | 错误码与排查 |
| [testing.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/testing.md) | fixtures 怎么写 |
| [cookbook.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/cookbook.md) | 「上游长这样，schema 该怎么写」对照例子 |
| [LLM.md](https://github.com/tianjiangqiji/nova-image-studio/blob/main/docs/plugins/LLM.md) | **喂给 AI 的单文件协议摘要** |

如果你想让 AI 帮你写插件：把 `LLM.md` 和上游的 API 文档一起给它，它能直接产出三个
JSON 文件。写完用上面的校验器验一遍即可。

## 提交插件

欢迎 PR。合并前会看这几点：

- `NOVA_PLUGINS_DIR=... node .../verify.js <your-plugin>` 通过
- 至少 3 个 fixtures：一个正常完成、一个上游失败、一个带参考素材
- `permissions.hosts` 只列上游 API 的域名，不要图省事列通配或产物 CDN
- 不含任何 API Key、账号、内网地址
- `price` 要么写真实申报价，要么整个字段删掉（不写就不显示价格，不会显示 ¥0.00）

## 安全说明

- 插件包是**纯数据**，宿主不会 eval 它的任何内容。协议刻意不支持可执行代码。
- 插件只能访问 `permissions.hosts` 里申报过的主机；私有网段与回环地址一律拒绝（SSRF 防线）。
- API Key 存在用户浏览器本地，服务器不持有任何人的密钥；插件包里当然也不该有。
- 装插件前建议 `cat` 一遍这三个 JSON——纯 JSON 的意义就在于一眼能审完。

## 许可

AGPL-3.0，与宿主项目一致。见 [LICENSE](LICENSE)。
