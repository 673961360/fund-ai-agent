# QwenPaw Chat 前端技术原型 — 集成指南

> 本文档面向业务开发人员，指导如何将 `runtime-prototypes/qwenpaw-chat` 中的 Vue 3 聊天原型集成到你自己的 Vue 项目中。

---

## 一、原型架构速览

```
runtime-prototypes/qwenpaw-chat/
├── src/
│   ├── views/ChatView.vue              # 主视图（编排器，唯一入口）
│   ├── components/                     # UI 组件
│   │   ├── ChatHeader.vue              # 顶栏：标题、Agent 名、状态徽章
│   │   ├── ChatMessageList.vue         # 消息列表容器（滚动管理）
│   │   ├── MessageBubble.vue           # 单条消息渲染（Markdown、Thinking、Tool 卡片）
│   │   ├── ChatInputBar.vue            # 输入栏（文本、附件、语音）
│   │   └── ChatSidebar.vue             # 侧边栏（Agent 选择、历史列表、登录、配置）
│   ├── composables/                    # 核心业务逻辑
│   │   ├── use-qwenpaw-chat-session.ts # 消息收发、SSE 流、会话管理（~1150 行）
│   │   ├── use-qwenpaw-auth.ts         # 认证状态管理
│   │   ├── use-qwenpaw-agents.ts       # Agent 列表加载与选择
│   │   ├── use-qwenpaw-runtime-config.ts  # 运行时配置面板
│   │   ├── use-qwenpaw-runtime-context.ts # 运行时上下文协调器
│   │   └── chat-session/               # 子模块
│   │       ├── history.ts              # 历史消息规范化
│   │       ├── media.ts                # 文件上传/录音辅助
│   │       ├── message-helpers.ts      # 消息创建/内容块转换
│   │       ├── stream.ts               # SSE 流式事件处理
│   │       ├── speech.ts               # Web Speech API 封装
│   │       ├── types.ts                # Composable 内部类型
│   │       └── workspace.ts            # 工作区辅助（排序、标题生成）
│   ├── types/chat-ui.ts                # UI 专属类型
│   ├── utils/render-markdown.ts        # Markdown 渲染
│   ├── styles/chat.css                 # 全部样式（含响应式断点）
│   ├── App.vue                         # 根组件（仅渲染 ChatView）
│   └── main.ts                         # Vue 应用入口
├── shared/                             # 前后端共享模块
│   ├── types.ts                        # 所有接口契约（~390 行）
│   ├── qwenpaw-client.ts               # HTTP API 客户端（~680 行）
│   ├── fetch-client.ts                 # Fetch 封装（超时、Abort）
│   ├── sse-handler.ts                  # SSE/NDJSON 流消费器
│   └── uuid.ts                         # UUID v4 生成
└── vite.config.ts                      # Vite 配置（含开发代理）
```

**依赖关系**：
```
ChatView.vue
  ├── useQwenPawAuth()          → shared/qwenpaw-client.ts（认证 API）
  ├── useQwenPawAgents()        → shared/qwenpaw-client.ts（Agent API）
  ├── useQwenPawChatSession()   → shared/qwenpaw-client.ts（聊天 CRUD + SSE）
  │                               → composables/chat-session/*（子模块）
  ├── useQwenPawRuntimeConfig() → shared/qwenpaw-client.ts（配置管理）
  ├── useQwenPawRuntimeContext()→ 协调 auth + agents + chat-session
  ├── ChatHeader.vue            （纯展示）
  ├── ChatMessageList.vue       → MessageBubble.vue
  ├── ChatInputBar.vue          （自包含）
  └── ChatSidebar.vue           （纯展示 + 事件转发）
```

---

## 二、后端 API 端点清单

原型通过 `shared/qwenpaw-client.ts` 调用以下 QwenPaw API，你的后端需要实现或代理这些端点：

| 端点 | 方法 | 说明 | 认证头 |
|------|------|------|--------|
| `/api/auth/status` | GET | 检查认证是否启用、是否有用户 | 无 |
| `/api/auth/verify` | GET | 验证 token 是否有效 | `Authorization: Bearer <token>` |
| `/api/auth/login` | POST | 用户名密码登录 | 无，Body: `{username, password, expires_in?}` |
| `/api/agents` | GET | 获取 Agent 列表 | `Authorization: Bearer <token>` |
| `/api/agents/:id/chats` | GET | 获取聊天列表 | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/chats/:id` | GET | 获取聊天历史 | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/chats` | POST | 创建新聊天 | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/chats/:id` | PUT | 更新聊天（重命名等） | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/chats/:id` | DELETE | 删除聊天 | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/console/chat` | POST | 发送消息（SSE 流式响应） | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/console/chat/stop` | POST | 停止流式输出 | `Authorization`, `X-Agent-Id` |
| `/api/agents/:id/console/upload` | POST | 上传文件 | `Authorization`, `X-Agent-Id` |

**关键说明**：
- 如果后端地址不同，只需修改 `apiBaseUrl` 配置（见第五节）
- 如果你的系统不需要认证，原型中的 `auth/status` 应返回 `{enabled: false}`，前端会自动跳过登录流程
- SSE 流式响应需符合标准 SSE 格式（`data:` 行）或 NDJSON（每行一个 JSON 对象）

---

## 三、集成方式选择

### 方式 A：整包引入（推荐首次集成）

将整个 `qwenpaw-chat` 目录作为独立子项目引入，保持文件结构不变。适合快速验证。

**步骤**：

1. 将 `runtime-prototypes/qwenpaw-chat/` 和 `runtime-prototypes/shared/` 复制到你的项目
2. 配置 Vite 别名（见第四节）
3. 安装依赖（见第四节）
4. 配置环境变量（见第五节）
5. 在你的路由中挂载 `ChatView.vue`

### 方式 B：组件拆分引入

只引入需要的组件，将 `ChatView.vue` 作为参考，拆分到你自己的页面结构中。适合已有页面框架、只想嵌入聊天区域的场景。

**最小引入集合**（去掉侧边栏后）：

| 必须引入 | 可选引入 |
|----------|----------|
| `ChatView.vue`（需改造为组件模式） | `ChatSidebar.vue` |
| `ChatMessageList.vue` | `use-qwenpaw-auth.ts` |
| `MessageBubble.vue` | `use-qwenpaw-runtime-config.ts` |
| `ChatInputBar.vue` | `use-qwenpaw-runtime-context.ts` |
| `ChatHeader.vue` | `chat-session/speech.ts`（语音输入） |
| `use-qwenpaw-chat-session.ts` | `chat-session/media.ts`（文件上传） |
| `composables/chat-session/stream.ts` | |
| `composables/chat-session/message-helpers.ts` | |
| `shared/` 全部文件 | |
| `utils/render-markdown.ts` | |
| `styles/chat.css` | |
| `types/chat-ui.ts` | |

---

## 五、快速启动与验证

### 5.1 启动开发服务器

```bash
cd runtime-prototypes/qwenpaw-chat
npm run dev
```

成功后访问 `http://localhost:5173`。

### 5.2 验证后端可达

在启动前端前，确认后端 API 服务可用：

```bash
# 替换为你的后端地址
curl http://127.0.0.1:8088/api/auth/status
```

预期返回：`{"enabled": false}` 或 `{"enabled": true, "has_users": true/false}`

### 5.3 首次使用流程

1. 如果后端返回 `{"enabled": false}`，自动跳过登录，直接进入聊天
2. 如果后端返回 `{"enabled": true, "has_users": false}`，需先注册第一个用户
3. 如果后端返回 `{"enabled": true, "has_users": true}`，在侧边栏登录表单输入用户名密码
4. 登录后在侧边栏选择 Agent，即可开始对话

---

## 六、构建配置与依赖

## 七、Vite 别名配置

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

`@proto-shared` 指向 `shared/` 目录是关键——原型中所有 `import ... from '@proto-shared/xxx'` 都依赖这个别名。

### 5.2 项目依赖

**必须安装**：
```bash
npm install vue@^3.4.0 markdown-it@^14.1.1
```

**开发依赖**（可选）：
```bash
npm install -D vite@^5.0.0 typescript@^5.4 vue-tsc @vitejs/plugin-vue
```

原型**不依赖**以下库，如果你的项目已有，不影响：
- vue-router（原型不用）
- pinia（原型用 composable refs 管理状态）
- Element Plus / Ant Design（原型纯手写 CSS）

### 5.3 TypeScript 配置

确保 `tsconfig.json` 中 `paths` 别名与 Vite 一致：

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

## 五、环境变量

原型使用以下环境变量（`.env` 或 `.env.local`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_QWENPAW_PROXY_PREFIX` | `/qwenpaw-api` | 开发服务器代理前缀 |
| `VITE_QWENPAW_TARGET` | `http://127.0.0.1:8088` | 后端目标地址（开发时代理转发） |
| `VITE_QWENPAW_USER_ID` | `default_user` | 默认用户 ID |
| `VITE_QWENPAW_CHANNEL` | `console` | 默认渠道 |
| `VITE_QWENPAW_MODEL` | `""`（空） | 默认模型（空表示后端自选） |

**快速启动配置**：

原型需要 `.env.local` 文件才能运行。如果从仓库 clone 后缺少此文件，创建一个：

```env
# runtime-prototypes/qwenpaw-chat/.env.local
VITE_QWENPAW_PROXY_PREFIX=/qwenpaw-api
VITE_QWENPAW_TARGET=http://127.0.0.1:8088
```

把 `VITE_QWENPAW_TARGET` 改为你的 QwenPaw 后端实际地址即可。

**生产环境说明**：
- 生产构建中，`VITE_QWENPAW_PROXY_PREFIX` 和 `VITE_QWENPAW_TARGET` 不生效（Vite 代理仅开发时有效）
- 生产环境应通过 `apiBaseUrl` 配置直接指向后端（见第六节运行时配置）

---

## 六、运行时配置

原型支持两种运行时配置方式：

### 6.1 通过 UI 配置面板

在侧边栏底部展开"运行时配置"面板，可修改：
- **API 地址**：后端 API 基础 URL（如 `http://127.0.0.1:8088` 或 `/qwenpaw-api`）
- **Channel**：渠道标识（默认 `console`）
- **Model**：模型标识（默认空）
- **User ID**：用户标识（默认 `default_user`）

配置保存在浏览器 `localStorage`（key: `qwenpaw_runtime_config`）。

### 6.2 通过代码预设

在 `shared/qwenpaw-client.ts` 的 `getDefaultQwenPawClientConfig()` 中硬编码默认值：

```typescript
export function getDefaultQwenPawClientConfig(): QwenPawClientConfig {
  return {
    apiBaseUrl: import.meta.env.VITE_QWENPAW_PROXY_PREFIX ?? '/qwenpaw-api',
    userId: import.meta.env.VITE_QWENPAW_USER_ID ?? 'default_user',
    channel: import.meta.env.VITE_QWENPAW_CHANNEL ?? 'console',
    model: import.meta.env.VITE_QWENPAW_MODEL ?? '',
  };
}
```

修改此处即可为不同环境预设不同的后端地址。

---

## 七、本地存储 Key 清单

原型使用浏览器存储，集成时注意不要与宿主应用冲突：

| Key | 存储位置 | 用途 |
|-----|----------|------|
| `qwenpaw_auth_token` | localStorage | 认证 token |
| `qwenpaw_username` | localStorage | 登录用户名 |
| `qwenpaw_runtime_config` | localStorage | 运行时配置 |
| `qwenpaw-agent-storage` | sessionStorage | 当前选中 Agent ID |
| `qwenpaw_active_chat:${agentId}:${userId}:${channel}` | sessionStorage | 每个 Agent 的活跃聊天 ID |

---

## 八、组件 Props 与事件 API

### 8.1 ChatView.vue（主入口）

当前 `ChatView.vue` 是根级视图组件，**没有定义 props**。集成时如需参数化，建议改造为接收以下 props：

```typescript
interface ChatViewProps {
  apiBaseUrl?: string;    // 后端 API 地址
  token?: string;         // 预置认证 token（跳过登录）
  agentId?: string;       // 固定 Agent ID（隐藏选择器）
  hideSidebar?: boolean;  // 是否隐藏侧边栏
  hideConfig?: boolean;   // 是否隐藏配置面板
  hideAuth?: boolean;     // 是否隐藏登录表单
}
```

### 8.2 ChatHeader.vue

```typescript
interface Props {
  title: string;              // 对话标题
  agentName: string;          // Agent 名称
  statusLabel: string;        // 状态文本
  statusTone: 'idle' | 'busy' | 'error' | 'warning';  // 状态颜色
  errorMessage?: string;      // 错误信息
}
```

### 8.3 ChatMessageList.vue

```typescript
interface Props {
  messages: ChatMessage[];    // 消息列表
  loading?: boolean;          // 是否加载中
  emptyTitle?: string;        // 空状态标题
  emptyDescription?: string;  // 空状态描述
}
// 暴露方法: requestScrollToBottom()
```

### 8.4 MessageBubble.vue

```typescript
interface Props {
  message: ChatMessage;       // 单条消息
}
```

### 8.5 ChatInputBar.vue

```typescript
interface Props {
  modelValue: string;               // v-model: 输入文本
  disabled: boolean;                // 是否禁用
  busy?: boolean;                   // 是否流式中
  canSubmit?: boolean;              // 是否可发送
  canRecord?: boolean;              // 是否可录音
  canSpeech?: boolean;              // 是否可语音识别
  pendingUploads: PendingUpload[];  // 待上传文件
  recordingState: RecordingState;   // 录音状态
  speechState: SpeechRecognitionState; // 语音识别状态
  placeholder?: string;             // 占位文本
  helperText?: string;              // 辅助文本
}

// Emits:
// 'update:modelValue', 'submit', 'stop',
// 'add-files', 'retry-upload', 'remove-upload',
// 'start-recording', 'stop-recording', 'cancel-recording',
// 'start-speech', 'stop-speech'
```

### 8.6 ChatSidebar.vue

```typescript
// 31 个 props，包括：agents, selectedAgentId, chatList, activeChatId,
// requiresLogin, hasUsers, runtimeConfig, configExpanded, 等
// 详见 ChatSidebar.vue 的 defineProps 定义

// Emits:
// 'select-agent', 'new-chat', 'open-chat',
// 'delete-chat', 'rename-chat',
// 'login', 'toggle-config', 'save-config', 'reset-config',
// 'update:username', 'update:password',
// 'update:apiBaseUrl', 'update:channel', 'update:model', 'update:userId'
```

---

## 九、集成到已有页面的示例

### 示例：在你的 Vue 项目中嵌入聊天组件

假设你的项目已有路由和页面结构：

```vue
<!-- src/views/MyBusinessPage.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import ChatView from '@/qwenpaw-chat/src/views/ChatView.vue'
// 需要把 qwenpaw-chat 目录复制到 src/qwenpaw-chat/
// 并确保 vite.config.ts 中配置了 @proto-shared 别名
</script>

<template>
  <div class="my-business-page">
    <h1>我的业务页面</h1>
    <!-- 其他业务内容 -->
    <ChatView />
  </div>
</template>
```

如果你的后端 API 地址不是默认值，需要在挂载前修改配置：

```typescript
// src/main.ts 或 ChatView 的父组件中
import { setStoredQwenPawClientConfig, getDefaultQwenPawClientConfig } from '@/qwenpaw-chat/shared/qwenpaw-client'

const config = getDefaultQwenPawClientConfig()
config.apiBaseUrl = 'http://your-backend-host:port'  // 替换为你的后端地址
setStoredQwenPawClientConfig(config)
```

如果已有认证体系，可以预设 token 跳过登录：

```typescript
import { storeAuthSession } from '@/qwenpaw-chat/shared/qwenpaw-client'

storeAuthSession({ token: 'your-existing-token', username: 'current-user' })
```

---

## 十、认证对接指南

### 10.1 如果后端不需要认证

确保 `/api/auth/status` 返回 `{ "enabled": false }`，原型会自动跳过登录流程。

### 10.2 如果已有外部认证（SSO/OAuth）

两种方式：

**方式一：预存 token**（简单）
在页面加载时调用 `storeAuthSession()` 预存 token，原型会自动使用该 token 发起 API 请求。

**方式二：禁用认证检查**（更彻底）
修改 `use-qwenpaw-auth.ts` 中的 `initialize()` 方法，直接设置 `authState.valid = true`。

### 10.3 使用原型自带的登录

如果后端有用户体系，原型的 `ChatSidebar` 内置登录表单可以直接使用：
- 调用 `POST /api/auth/login`，Body: `{ username, password, expires_in: 604800 }`
- Token 存储在 localStorage，有效期 7 天

---

## 十一、核心 Composable 说明

### useQwenPawChatSession（核心中的核心）

这是最大的 composable（~1150 行），管理所有聊天状态。主要返回值：

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `draft` | `Ref<string>` | 输入框文本（v-model） |
| `messages` | `Computed<ChatMessage[]>` | 当前消息列表 |
| `chatList` | `Computed<ChatSpec[]>` | 聊天历史列表 |
| `isSending` | `Computed<boolean>` | 是否正在发送/流式中 |
| `errorMessage` | `Ref<string>` | 错误信息 |
| `sendDraft(options)` | `(agentId, token) => Promise` | 发送消息 |
| `stopStreaming(options)` | `(agentId, token) => Promise` | 停止流式输出 |
| `createNewConversation()` | `() => void` | 新建聊天 |
| `openChat(chatId, options)` | `() => Promise` | 打开历史聊天 |
| `deleteChatById(chatId, options)` | `() => Promise` | 删除聊天 |
| `renameChatById(chatId, name, options)` | `() => Promise` | 重命名聊天 |
| `addPendingFiles(options)` | `() => Promise` | 添加待上传文件 |
| `setActiveAgent(agentId, options)` | `() => Promise` | 切换 Agent |

### 其他 Composable

| Composable | 职责 | 主要返回值 |
|------------|------|------------|
| `useQwenPawAuth()` | 认证管理 | `authState`, `token`, `login()`, `initialize()` |
| `useQwenPawAgents()` | Agent 列表 | `agents`, `selectedAgent`, `loadAgents()`, `selectAgent()` |
| `useQwenPawRuntimeConfig()` | 配置面板 | `runtimeConfig`, `runtimeConfigForm`, `handleSaveConfig()` |
| `useQwenPawRuntimeContext()` | 上下文协调 | `refreshRuntimeContext()` |

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

### Q: 代理前缀 `/qwenpaw-api` 是什么？

开发时，Vite 会将 `/qwenpaw-api/*` 的请求代理到 `VITE_QWENPAW_TARGET` 指向的后端。路径中的 `/qwenpaw-api` 前缀会被去掉。例如：
- 前端请求 `/qwenpaw-api/api/agents` → 后端收到 `/api/agents`

生产环境不走 Vite 代理，需直接配置 `apiBaseUrl`。

### Q: 如何更换后端地址？

两种方式：
1. 开发时：修改 `.env` 中的 `VITE_QWENPAW_TARGET`
2. 运行时：在侧边栏配置面板中修改，或调用 `setStoredQwenPawClientConfig()`

### Q: SSE 流式响应格式要求？

后端 SSE 响应需符合以下格式之一：
- 标准 SSE：`data: {"text": "xxx"}\n\n`
- NDJSON：每行一个 JSON 对象
- 以 `[DONE]` 结尾表示流结束

### Q: 可以不显示侧边栏吗？

可以。将 `ChatView.vue` 模板中 `<ChatSidebar />` 注释掉，并相应移除 `useQwenPawAgents`、`useQwenPawAuth` 等 composable 的调用。

### Q: TypeScript 报错 `Cannot find module '@proto-shared/xxx'`？

确保 `vite.config.ts` 和 `tsconfig.json` 中的 `@proto-shared` 别名路径正确指向 `shared/` 目录。

---

## 十四、集成检查清单

- [ ] 复制 `qwenpaw-chat/` 和 `shared/` 目录到项目
- [ ] 配置 Vite 别名 `@` 和 `@proto-shared`
- [ ] 安装 `vue@^3.4.0` 和 `markdown-it@^14.1.1`
- [ ] 配置 `tsconfig.json` 路径别名
- [ ] 配置环境变量（`.env.local`），确认 `VITE_QWENPAW_TARGET` 指向后端地址
- [ ] 确认后端 API 端点可达（`curl http://你的后端地址/api/auth/status` 测试）
- [ ] 在路由或父组件中引入 `ChatView.vue`
- [ ] 测试消息发送/接收/SSE 流式输出
- [ ] 配置 CSS 变量与宿主应用主题统一（可选）
- [ ] 对接认证体系或预存 token（可选）
