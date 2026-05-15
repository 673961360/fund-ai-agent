# Hermes Chat 前端技术原型 — 集成指南

> 本文档面向业务开发人员，指导如何将 `runtime-prototypes/hermes-chat` 中的 Vue 3 聊天原型集成到你自己的 Vue 项目中。
>
> **与 qwenpaw-chat 的差异**：hermes-chat 是极简版，无认证、无 Agent 选择、无文件上传、无语音输入。适合快速嵌入、对接 Hermes API Server 的场景。

---

## 一、原型架构速览

```
runtime-prototypes/hermes-chat/
├── src/
│   ├── views/ChatView.vue              # 主视图（编排器，唯一入口）
│   ├── components/                     # UI 组件
│   │   ├── ChatHeader.vue              # 顶栏：状态徽章、错误信息
│   │   ├── ChatMessageList.vue         # 消息列表容器（滚动管理）
│   │   ├── MessageBubble.vue           # 单条消息渲染（Markdown、Thinking、Tool 卡片）
│   │   ├── ChatInputBar.vue            # 输入栏（纯文本，无附件/语音）
│   │   └── ChatSidebar.vue             # 侧边栏（新对话、配置面板、Health Check）
│   ├── composables/                    # 核心业务逻辑
│   │   ├── use-hermes-chat-session.ts  # 消息收发、SSE 流、会话管理
│   │   ├── use-hermes-config.ts        # 运行时配置（代理前缀 + API Key）
│   │   ├── hermes-client.ts            # Hermes HTTP 客户端
│   │   ├── hermes-sse.ts               # SSE 流消费器
│   │   └── hermes-session/             # 子模块
│   │       ├── types.ts                # Composable 内部类型
│   │       ├── message-helpers.ts      # 消息创建/内容块转换
│   │       └── stream.ts               # SSE 流式事件处理
│   ├── types/hermes.ts                 # Hermes 专用类型 + 复用 shared/types
│   ├── utils/render-markdown.ts        # Markdown 渲染
│   ├── styles/chat.css                 # 全部样式（含响应式断点）
│   ├── App.vue                         # 根组件（仅渲染 ChatView）
│   └── main.ts                         # Vue 应用入口
├── shared/                             # 前后端共享模块（与 qwenpaw-chat 共用）
│   ├── types.ts                        # 核心接口契约（ChatMessage 等）
│   ├── fetch-client.ts                 # Fetch 封装
│   ├── sse-handler.ts                  # SSE/NDJSON 流消费器（qwenpaw 用）
│   └── uuid.ts                         # UUID v4 生成
└── vite.config.ts                      # Vite 配置（含开发代理）
```

**依赖关系**（比 qwenpaw-chat 简单很多）：
```
ChatView.vue
  ├── useHermesChatSession()    → hermes-client.ts（HTTP 请求）
  │                               → hermes-sse.ts（SSE 流消费）
  │                               → hermes-session/*（子模块）
  ├── useHermesConfig()         → hermes-client.ts（配置管理）
  ├── ChatHeader.vue            （纯展示）
  ├── ChatMessageList.vue       → MessageBubble.vue
  ├── ChatInputBar.vue          （纯文本输入）
  └── ChatSidebar.vue           （配置面板 + 新对话按钮）
```

---

## 二、与 QwenPaw Chat 原型的差异

| 维度 | hermes-chat | qwenpaw-chat |
|------|-------------|-------------|
| 认证 | 无用户登录，全局 API Key | 完整用户鉴权体系 |
| Agent | 单 Hermes 实例，无选择 | 多 Agent 列表 + 切换 |
| 历史 | 仅 localStorage 持久化当前会话 | 服务端历史查询 API |
| 文件上传 | 不支持 | 支持拖拽/粘贴/重试 |
| 语音 | 不支持 | 录音 + Web Speech API |
| 流式重连 | 无（靠 conversation 参数维持上下文） | 有重连机制 |
| 配置项 | 仅 proxyPrefix + apiKey | proxyPrefix + channel + model + userId |
| 代码量 | 约 qwenpaw-chat 的 1/3 | 完整功能 |

**选择建议**：
- 如果对接的是 **Hermes API Server**（单实例、无认证），用 hermes-chat
- 如果对接的是 **QwenPaw 平台**（多 Agent、有用户体系），用 qwenpaw-chat

---

## 三、后端 API 端点清单

hermes-chat 通过 `hermes-client.ts` 调用 Hermes API Server，只需以下端点：

| 端点 | 方法 | 说明 | 认证头 |
|------|------|------|--------|
| `/health` | GET | 健康检查 | 无 |
| `/v1/responses` | POST | 发送消息（SSE 流式响应，Responses API） | `Authorization: Bearer <apiKey>` |
| `/v1/chat/completions` | POST | 发送消息（旧兼容模式，Chat Completions API） | `Authorization: Bearer <apiKey>` |

**关键说明**：
- 推荐使用 **Responses API** (`/v1/responses`)，服务端通过 `conversation` 参数自动管理多轮上下文
- Chat Completions API (`/v1/chat/completions`) 保留为向后兼容
- 所有请求必须走代理前缀（开发时）或直接指向 Hermes 地址（生产时）
- SSE 流式响应格式：标准 SSE（`data:` 行），支持 Responses API 命名事件

---

## 四、集成方式选择

### 方式 A：整包引入（推荐首次集成）

将整个 `hermes-chat` 目录作为独立子项目引入。适合快速验证。

**步骤**：

1. 将 `runtime-prototypes/hermes-chat/` 复制到你的项目
2. 确保 `runtime-prototypes/shared/` 可访问（hermes-chat 的 `@proto-shared` 别名指向上级的 shared 目录）
3. 配置 Vite 别名（见第五节）
4. 安装依赖（见第五节）
5. 配置环境变量（见第六节）
6. 在你的路由中挂载 `ChatView.vue`

### 方式 B：组件拆分引入

只引入需要的组件，将 `ChatView.vue` 作为参考，拆分到你自己的页面结构中。

**最小引入集合**：

| 必须引入 | 可选引入 |
|----------|----------|
| `ChatView.vue` | `ChatSidebar.vue` |
| `ChatMessageList.vue` | `use-hermes-config.ts` |
| `MessageBubble.vue` | `hermes-session/*` 子模块 |
| `ChatInputBar.vue` | |
| `ChatHeader.vue` | |
| `use-hermes-chat-session.ts` | |
| `hermes-client.ts` | |
| `hermes-sse.ts` | |
| `shared/types.ts` | |
| `utils/render-markdown.ts` | |
| `styles/chat.css` | |
| `types/hermes.ts` | |

---

## 五、快速启动与验证

### 5.1 启动开发服务器

```bash
cd runtime-prototypes/hermes-chat
npm run dev
```

成功后访问 `http://localhost:5173`。

### 5.2 验证后端可达

在启动前端前，确认 Hermes API Server 可用：

```bash
# 替换为你的 Hermes 地址
curl http://127.0.0.1:8056/health
```

预期返回：`{"status": "ok"}` 或类似健康检查响应。

### 5.3 首次使用流程

1. 启动后在侧边栏展开"配置"面板
2. 确认 `代理前缀` 为 `/hermes-api`，填入 `API Key`
3. 点击"检测连接"按钮，状态变为 `connected` 表示可达
4. 点击"新对话"按钮，即可开始聊天

---

## 六、构建配置与依赖

### 6.1 Vite 别名配置

在你的 `vite.config.ts` 中添加路径别名：

```typescript
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@proto-shared': fileURLToPath(new URL('../shared', import.meta.url)),
      // 如果 shared 目录放在不同位置，调整上面的路径
    },
  },
})
```

### 6.2 项目依赖

**必须安装**：
```bash
npm install vue@^3.4.0 markdown-it@^14.1.1
```

**开发依赖**（可选）：
```bash
npm install -D vite@^5.0.0 typescript@^5.4 vue-tsc @vitejs/plugin-vue
```

原型**不依赖**以下库：
- vue-router
- pinia
- Element Plus / Ant Design（纯手写 CSS）

### 6.3 TypeScript 配置

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@proto-shared/*": ["../shared/*"]
    }
  }
}
```

---

## 六、环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_HERMES_PROXY_PREFIX` | `/hermes-api` | 开发服务器代理前缀 |
| `VITE_HERMES_API_KEY` | `""`（空） | 本地开发 API Key |
| `VITE_HERMES_TARGET` | `http://127.0.0.1:8056` | Hermes API Server 地址 |

**快速启动配置**：

原型需要 `.env.local` 文件才能运行。如果从仓库 clone 后缺少此文件，创建一个：

```env
# runtime-prototypes/hermes-chat/.env.local
VITE_HERMES_PROXY_PREFIX=/hermes-api
VITE_HERMES_TARGET=http://127.0.0.1:8056
VITE_HERMES_API_KEY=
```

把 `VITE_HERMES_TARGET` 改为你的 Hermes API Server 实际地址，`VITE_HERMES_API_KEY` 填入有效的 Key。

**生产环境说明**：
- `VITE_HERMES_PROXY_PREFIX` 和 `VITE_HERMES_TARGET` 仅开发时有效（Vite 代理）
- 生产环境通过 `hermes-client.ts` 中的 `getHermesConfig()` 读取 localStorage 配置
- API Key 可通过 UI 配置面板设置，或预先写入 localStorage

---

## 七、运行时配置

### 7.1 通过 UI 配置面板

在侧边栏展开"配置"面板，可修改：
- **代理前缀**：请求路径前缀（默认 `/hermes-api`）
- **API Key**：Hermes 鉴权密钥

配置保存在浏览器 `localStorage`（key: `hermes_config`）。

### 7.2 Health Check

配置面板内置健康检查按钮，调用 `GET {proxyPrefix}/health` 验证连接状态。

### 7.3 通过代码预设

```typescript
// 在页面加载时预设配置
import { saveHermesConfig } from '@/hermes-chat/src/composables/hermes-client'

// saveHermesConfig 接收 HermesConfigFormState
saveHermesConfig({
  proxyPrefix: '/hermes-api',  // 或通过 nginx 反向代理的完整路径
  apiKey: 'your-api-key-here',
})
```

---

## 八、本地存储 Key 清单

| Key | 存储位置 | 用途 |
|-----|----------|------|
| `hermes_config` | localStorage | 运行时配置（proxyPrefix + apiKey） |
| `hermes_chat_messages` | localStorage | 当前会话消息（JSON 序列化） |
| `hermes_conversation_id` | localStorage | Responses API 会话 ID（上下文延续） |

---

## 九、组件 Props 与事件 API

### 9.1 ChatView.vue（主入口）

当前是根级视图组件，**无 props**。如需参数化，建议改造为：

```typescript
interface ChatViewProps {
  proxyPrefix?: string;     // 请求前缀
  apiKey?: string;          // 预置 API Key
  hideSidebar?: boolean;    // 是否隐藏侧边栏
  hideConfig?: boolean;     // 是否隐藏配置面板
}
```

### 9.2 ChatHeader.vue

```typescript
interface Props {
  statusLabel: string;                          // 状态文本（如 '生成中' / '空闲' / '错误'）
  statusTone: 'idle' | 'busy' | 'error' | 'warning';
  errorMessage?: string;
}
```

### 9.3 ChatMessageList.vue

```typescript
interface Props {
  messages: ChatMessage[];
  loading?: boolean;
  emptyTitle?: string;          // 默认 '开始一段新对话'
  emptyDescription?: string;    // 默认 '发送第一条消息给 Hermes。'
}
// 暴露方法: requestScrollToBottom()
```

### 9.4 MessageBubble.vue

```typescript
interface Props {
  message: ChatMessage;
}
```

### 9.5 ChatInputBar.vue

```typescript
interface Props {
  modelValue: string;           // v-model: 输入文本
  disabled: boolean;
  busy?: boolean;               // 是否流式中
  canSubmit?: boolean;          // 是否可发送
  placeholder?: string;         // 默认 '发送消息给 Hermes...'
  helperText?: string;          // 默认 'Enter 发送，Shift + Enter 换行'
}

// Emits:
// 'update:modelValue', 'submit', 'stop'
```

### 9.6 ChatSidebar.vue

```typescript
interface Props {
  isSending: boolean;
  proxyTarget: string;
  requestEntry: string;
  configExpanded: boolean;
  configBusy: boolean;
  configDirty: boolean;
  form: HermesConfigFormState;
  connectionStatus: 'unknown' | 'connected' | 'error';
  connectionError: string;
  feedbackMessage: string;
  feedbackIsError: boolean;
}

// Emits:
// 'new-chat', 'toggle-config',
// 'update:proxyPrefix', 'update:apiKey',
// 'save-config', 'reset-config', 'check-health'
```

---

## 十、集成到已有页面的示例

```vue
<!-- src/views/MyBusinessPage.vue -->
<script setup lang="ts">
import ChatView from '@/hermes-chat/src/views/ChatView.vue'
// 需要把 hermes-chat 目录复制到 src/hermes-chat/
// 并确保 vite.config.ts 中配置了 @proto-shared 别名
</script>

<template>
  <div class="my-business-page">
    <h1>我的业务页面</h1>
    <ChatView />
  </div>
</template>
```

预设 API Key：

```typescript
// src/main.ts 或父组件中
import { saveHermesConfig } from '@/hermes-chat/src/composables/hermes-client'

saveHermesConfig({
  proxyPrefix: '/hermes-api',
  apiKey: 'sk-your-key-here',
})
```

---

## 十一、Hermes API 对接说明

### 11.1 Responses API（推荐）

原型使用 **Responses API** (`POST /v1/responses`)，通过 `conversation` 参数管理服务端上下文：

```typescript
// hermes-client.ts 内部调用
{
  input: '用户消息文本',
  conversation: 'conversation-id',  // 首次为空，服务端返回新 ID
  stream: true,
}
```

- 首次发送：`conversation` 为 `null`，服务端返回新的 conversation ID
- 后续发送：携带 conversation ID，服务端自动延续上下文
- 无需前端维护消息历史（由服务端管理）
- 历史消息仅用于 UI 展示（存在 localStorage）

### 11.2 Chat Completions API（兼容模式）

旧模式需要前端维护完整消息列表：

```typescript
{
  model: 'your-model',
  messages: [
    { role: 'user', content: '第一条消息' },
    { role: 'assistant', content: '回复' },
    { role: 'user', content: '第二条消息' },
  ],
  stream: true,
}
```

### 11.3 SSE 流式响应格式

支持以下 SSE 事件：

| 事件名 | 说明 |
|--------|------|
| `data:` （无命名） | 标准文本增量（Chat Completions 模式） |
| `response.created` | 新响应创建，携带 response ID |
| `response.output_text.delta` | 文本增量（Responses API） |
| `response.output_text.done` | 文本输出完成 |
| `response.output_item.added` | 新输出项添加（含 Tool Call） |
| `response.output_item.done` | 输出项完成 |
| `response.completed` | 整个响应完成 |
| `response.failed` | 响应失败 |
| `hermes.tool.progress` | 工具调用进度 |
| `data: [DONE]` | 流结束标记 |

---

## 十二、样式说明

所有样式在 `src/styles/chat.css` 中，纯 CSS，无预处理器。

**CSS 变量**（可在 `:root` 中覆盖）：

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `--bg` | `#eef2f6` | 页面背景 |
| `--surface` | `rgba(255,255,255,0.96)` | 卡片背景 |
| `--text-primary` | `#162535` | 主文本 |
| `--accent` | `#19344d` | 强调色 |
| `--brand` | `#ad7a2c` | 品牌色（金色） |
| `--danger` | `#af463b` | 错误色 |
| `--warning` | `#9b6827` | 警告色 |

如需与宿主应用主题统一，覆盖这些 CSS 变量即可。

---

## 十三、常见问题

### Q: 代理前缀 `/hermes-api` 是什么？

开发时，Vite 会将 `/hermes-api/*` 的请求代理到 `VITE_HERMES_TARGET` 指向的 Hermes 服务。路径中的 `/hermes-api` 前缀会被去掉。例如：
- 前端请求 `/hermes-api/v1/responses` → Hermes 收到 `/v1/responses`

生产环境不走 Vite 代理，需直接配置 `proxyPrefix` 为完整 URL。

### Q: 如何更换 Hermes 地址？

两种方式：
1. 开发时：修改 `.env` 中的 `VITE_HERMES_TARGET`
2. 运行时：在侧边栏配置面板中修改 proxyPrefix，或调用 `saveHermesConfig()`

### Q: SSE 流式响应格式要求？

后端 SSE 响应需符合标准 SSE 格式（`data:` 行）或支持 Responses API 命名事件。以 `[DONE]` 结尾表示流结束。

### Q: 可以不显示侧边栏吗？

可以。将 `ChatView.vue` 模板中 `<ChatSidebar />` 注释掉，并相应移除 `useHermesConfig` 的调用。

### Q: TypeScript 报错 `Cannot find module '@proto-shared/xxx'`？

确保 `vite.config.ts` 和 `tsconfig.json` 中的 `@proto-shared` 别名路径正确指向 `shared/` 目录。

---

## 十四、集成检查清单

- [ ] 复制 `hermes-chat/` 到项目，确保 `shared/` 可访问
- [ ] 配置 Vite 别名 `@` 和 `@proto-shared`
- [ ] 安装 `vue@^3.4.0` 和 `markdown-it@^14.1.1`
- [ ] 配置 `tsconfig.json` 路径别名
- [ ] 配置环境变量（`.env.local`），确认 `VITE_HERMES_TARGET` 指向 Hermes 地址
- [ ] 确认 Hermes API Server 可达（`curl http://你的Hermes地址/health` 测试）
- [ ] 在路由或父组件中引入 `ChatView.vue`
- [ ] 预设 API Key（通过 `saveHermesConfig()` 或 UI 配置面板）
- [ ] 测试消息发送/接收/SSE 流式输出
- [ ] 配置 CSS 变量与宿主应用主题统一（可选）
