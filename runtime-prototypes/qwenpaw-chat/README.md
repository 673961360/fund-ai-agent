# QwenPaw Chat 原型

`runtime-prototypes/qwenpaw-chat` 是一个 Vue 3 单页原型，用来验证 QwenPaw 聊天链路、历史会话恢复、流式输出、附件上传和录音发送。它属于 `runtime-prototypes/` 旁路实验目录，不直接并入主线 `frontend/`、`backend/` 或 `docs/contracts/`。

## 运行

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## 当前结构

```text
qwenpaw-chat/
├─ src/
│  ├─ components/                 UI 组件
│  ├─ composables/
│  │  ├─ chat-session/            聊天工作区、历史、流式、媒体辅助模块
│  │  ├─ use-qwenpaw-auth.ts      认证状态
│  │  ├─ use-qwenpaw-agents.ts    Agent 加载与选择
│  │  ├─ use-qwenpaw-runtime-config.ts
│  │  ├─ use-qwenpaw-runtime-context.ts
│  │  └─ use-qwenpaw-chat-session.ts
│  ├─ styles/
│  ├─ utils/
│  └─ views/ChatView.vue
├─ vite.config.ts
└─ ../shared/
   ├─ fetch-client.ts             Fetch 请求治理收口
   ├─ qwenpaw-client.ts           QwenPaw API 客户端
   ├─ sse-handler.ts
   ├─ types.ts
   └─ uuid.ts
```

## 原型豁免说明

本目录显式保留以下豁免：

- 不引入 `vue-router`。当前仍是单页单视图原型，没有多页面导航收益。
- 不引入 `pinia`。当前主要问题是内部职责拆分，而不是跨页面全局状态。
- 不引入 `Element Plus`、`Tailwind`。避免为了栈统一而扰动已稳定的原型界面和交互。
- 不迁移到 `axios`。聊天主链路依赖 `fetch + AbortController + stream`，本轮只做请求层治理收口。

## 本轮治理调整

- `ChatView.vue` 只保留页面编排和事件桥接，运行时配置与上下文协调下沉到独立 composables。
- `use-qwenpaw-chat-session.ts` 保留外部接口，内部逻辑拆到 `chat-session/` 子模块。
- `../shared/fetch-client.ts` 统一了 headers、timeout、JSON 错误解析和非 JSON 失败兜底。
- 新增 `ESLint`、`Prettier` 与脚本，作为原型阶段的最小工程治理。

## 验证边界

- 允许在 `runtime-prototypes/` 中直连真实 QwenPaw API 做轻量验证。
- 不把原型私有协议回写主线契约。
- 浏览器人工回归仍需单独执行，本轮默认验证口径是 `typecheck`、`lint`、`format:check`、`build`。
