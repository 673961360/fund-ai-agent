# Vue3 接入 QwenPaw 聊天接口指南

## 0. 从零开始的完整接入流程

### 步骤 1：确认 QwenPaw 服务状态

```bash
# 检查服务是否运行
status_qwenpaw.bat
# 确认端口 8088 已监听，且 Swagger 文档可用
# 浏览器打开：http://127.0.0.1:8088/docs
```

### 步骤 2：创建 Vue3 项目

```bash
npm create vue@latest my-qwenpaw-ui
# 选择: TypeScript ✓, Vue Router ✓, Pinia ✓
cd my-qwenpaw-ui
npm install
npm install axios
```

### 步骤 3：配置 Vite 开发代理

编辑 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
    },
  },
})
```

### 步骤 4：创建项目目录结构

```
src/
├── api/
│   ├── auth.ts          # 认证：登录、token 管理、axios 拦截器
│   ├── agents.ts        # Agent 管理：列表、创建、切换
│   ├── chat.ts          # 核心聊天：SSE 流式通信
│   ├── chats.ts         # 聊天列表与历史
│   └── upload.ts        # 文件上传
├── stores/
│   ├── auth.ts          # 认证状态（Pinia）
│   ├── agent.ts         # 当前选中的 Agent
│   └── chat.ts          # 聊天状态与消息列表
├── views/
│   ├── Login.vue        # 登录页
│   └── ChatView.vue     # 主聊天页
├── router/
│   └── index.ts         # 路由配置
└── App.vue
```

### 步骤 5：按顺序实现各模块

1. **认证模块** (`api/auth.ts`) → 登录 + Token 自动注入
2. **Agent 管理** (`api/agents.ts`) → 获取 Agent 列表 + 默认选中
3. **核心聊天** (`api/chat.ts`) → SSE 流式发送/接收
4. **聊天历史** (`api/chats.ts`) → 列表加载 + 历史记录
5. **UI 页面** (`views/`) → 登录页 + 聊天页

### 步骤 6：启动并验证

```bash
npm run dev
# 浏览器打开 http://localhost:5173
# 1. 登录 → 2. 选择 Agent → 3. 发送消息 → 4. 确认流式输出正常
```

---

## 1. 服务概览

| 项目 | 值 |
|------|-----|
| 服务地址 | `http://127.0.0.1:8088` |
| 协议 | HTTP/1.1 (FastAPI + Uvicorn) |
| 绑定 | 仅 `127.0.0.1`（不可外部直连） |
| API 文档 | `http://127.0.0.1:8088/docs`（Swagger UI） |
| 认证方式 | JWT Bearer Token |
| 流式协议 | Server-Sent Events (SSE) |

## 2. 跨域处理

### 开发环境（Vite Proxy）

在 `vite.config.ts` 中配置代理，避免跨域：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
      },
    },
  },
})
```

### 生产环境

使用 Nginx 反向代理，前后端同域部署。

## 3. 认证模块

> **官方控制台实现参考**：QwenPaw 内置控制台（React SPA）的认证逻辑为 — 使用 `localStorage` 存储 token，所有 API 请求携带 `Authorization: Bearer <token>` 和 `X-Agent-Id` 头。

### 3.1 登录接口

```
POST /api/auth/login
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "admin",
  "password": "your_password",
  "expires_in": 604800
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |
| `expires_in` | number \| null | 否 | Token 有效期（秒），默认 7 天（604800）。传 `0` 或 `-1` 表示永久 |

**响应：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

### 3.2 认证状态检查

```
GET /api/auth/status
Authorization: Bearer <token>
```

返回 `200` 表示 token 有效，`401` 表示未认证。

### 3.3 Vue3 认证实现

> **与官方控制台对齐**：官方使用 `localStorage` 存储 `qwenpaw_auth_token`，自动注入 `Authorization` 和 `X-Agent-Id` 请求头。

```typescript
// src/api/auth.ts
import axios from 'axios'

// 与官方控制台一致的 Token 存储 key
const TOKEN_KEY = 'qwenpaw_auth_token'
const USER_KEY = 'qwenpaw_username'
const AGENT_STORAGE_KEY = 'qwenpaw-agent-storage'

const api = axios.create({ baseURL: '' }) // 走 Vite proxy

export interface LoginParams {
  username: string
  password: string
  expires_in?: number
}

export async function login(params: LoginParams) {
  const res = await api.post('/api/auth/login', params)
  const { token, username } = res.data
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, username)
  return { token, username }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// 获取当前选中的 Agent ID（与官方控制台一致的 sessionStorage 结构）
export function getCurrentAgentId(): string {
  try {
    const storage = sessionStorage.getItem(AGENT_STORAGE_KEY)
    if (storage) {
      const parsed = JSON.parse(storage)
      return parsed?.state?.selectedAgent || 'default'
    }
  } catch {
    // ignore
  }
  return 'default'
}

export function setCurrentAgentId(agentId: string) {
  sessionStorage.setItem(
    AGENT_STORAGE_KEY,
    JSON.stringify({ state: { selectedAgent: agentId } })
  )
}

// Axios 拦截器 — 自动注入 Token + Agent ID（与官方控制台一致）
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const agentId = getCurrentAgentId()
  if (agentId) {
    config.headers['X-Agent-Id'] = agentId
  }
  return config
})

// 响应拦截器 — 401 自动跳转登录（与官方控制台一致）
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 页面加载时验证 token（与官方控制台一致的 auth guard）
export async function checkAuthStatus(): Promise<{ enabled: boolean; valid: boolean }> {
  try {
    const statusRes = await api.get('/api/auth/status')
    if (!statusRes.data.enabled) {
      return { enabled: false, valid: true }
    }
    const token = getToken()
    if (!token) {
      return { enabled: true, valid: false }
    }
    const verifyRes = await api.get('/api/auth/verify')
    return { enabled: true, valid: verifyRes.status === 200 }
  } catch {
    return { enabled: true, valid: false }
  }
}

export default api
```

## 4. Agent 管理

### 4.1 列出所有 Agent

```
GET /api/agents
Authorization: Bearer <token>
```

**响应：**
```json
{
  "agents": [
    {
      "id": "default",
      "name": "默认助手",
      "description": "默认 AI 助手",
      "workspace_dir": "/path/to/workspace",
      "enabled": true
    }
  ]
}
```

### 4.2 创建 Agent

```
POST /api/agents
Content-Type: application/json
Authorization: Bearer <token>
```

**请求体：**
```json
{
  "id": "my_agent",
  "name": "我的助手",
  "description": "自定义 AI 助手",
  "language": "zh",
  "skill_names": []
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 否 | Agent ID，不传则自动生成 |
| `name` | string | 是 | Agent 名称 |
| `description` | string | 否 | 描述 |
| `language` | string | 否 | 语言，默认 `en` |
| `skill_names` | string[] | 否 | 绑定的技能列表 |

### 4.3 Vue3 Agent 管理实现

```typescript
// src/api/agents.ts
import api from './auth'

export interface AgentSummary {
  id: string
  name: string
  description: string
  workspace_dir: string
  enabled: boolean
}

export async function listAgents(): Promise<AgentSummary[]> {
  const res = await api.get('/api/agents')
  return res.data.agents
}

export async function createAgent(data: {
  id?: string
  name: string
  description?: string
  language?: string
  skill_names?: string[]
}) {
  const res = await api.post('/api/agents', data)
  return res.data
}

export async function getAgent(agentId: string) {
  const res = await api.get(`/api/agents/${agentId}`)
  return res.data
}

export async function deleteAgent(agentId: string) {
  await api.delete(`/api/agents/${agentId}`)
}
```

## 5. 核心聊天接口（SSE 流式）

### 5.1 接口定义

> **官方控制台实现**：官方控制台调用的是 `POST /api/console/chat`（不带 agentId），通过 `X-Agent-Id` 请求头传递 Agent ID。两种路径均可用：
> - `/api/console/chat` + `X-Agent-Id` 头（官方控制台方式）
> - `/api/agents/{agentId}/console/chat`（路径方式，推荐）

```
POST /api/agents/{agentId}/console/chat
Content-Type: application/json
Authorization: Bearer <token>
X-Agent-Id: <agentId>
Accept: text/event-stream
```

### 5.2 请求体（AgentRequest）

> **官方协议文档** ([Agent API Protocol](https://runtime.agentscope.io/en/protocol.html)) 定义了 `AgentRequest` 的标准结构，继承自 `BaseRequest`。

```json
{
  "input": [
    {
      "role": "user",
      "type": "message",
      "content": [
        {
          "type": "text",
          "text": "你好，请介绍一下你自己"
        }
      ]
    }
  ],
  "stream": true,
  "session_id": "console:default_user",
  "user_id": "default_user",
  "channel": "console"
}
```

> **官方控制台的请求体** 额外包含 `channel: "console"` 字段，建议保持一致。

**关键字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | Message[] | 是 | 消息数组，支持多轮上下文 |
| `input[].role` | string | 是 | 角色：`user`、`assistant`、`system`、`tool` |
| `input[].content` | ContentBlock[] | 是 | 内容块数组，支持文本、图片等 |
| `input[].content[].type` | string | 是 | 内容类型：`text`、`image`、`audio`、`video`、`file` 等 |
| `input[].content[].text` | string | 是(text时) | 文本内容 |
| `stream` | boolean | 否 | 是否流式返回，默认 `true` |
| `user_id` | string | 否 | 用户标识 |
| `session_id` | string | 否 | 会话标识，格式建议 `console:用户名` |
| `channel` | string | 否 | 渠道名，默认 `console` |
| `model` | string | 否 | 指定模型名称 |
| `temperature` | number | 否 | 温度参数 |
| `max_tokens` | integer | 否 | 最大 token 数 |

### 5.3 SSE 事件流（基于 AgentScope Runtime 官方协议）

> **官方协议文档**: [Agent API Protocol Specification](https://runtime.agentscope.io/en/protocol.html)
>
> QwenPaw 底层使用 **AgentScope Runtime** 作为 Agent 引擎，聊天接口遵循其标准 JSON 协议。

响应为 `text/event-stream` 格式，每行格式为 `data: {JSON}\n\n`。

**官方协议定义的 SSE 事件序列：**

```
// 1. 响应创建
data: {"status": "created", "id": "response_123", "object": "response"}

// 2. 消息创建
data: {"status": "created", "id": "msg_abc", "object": "message", "type": "assistant"}

// 3. 流式文本增量（delta）
data: {"status": "in_progress", "type": "text", "index": 0, "delta": true, "text": "你好", "object": "content", "msg_id": "msg_abc"}

data: {"status": "in_progress", "type": "text", "index": 0, "delta": true, "text": "！有什么可以帮你的", "object": "content", "msg_id": "msg_abc"}

// 4. 内容完成
data: {"status": "completed", "type": "text", "index": 0, "delta": false, "text": "你好！有什么可以帮你的？", "object": "content", "msg_id": "msg_abc"}

// 5. 消息完成
data: {"id": "msg_abc", "status": "completed", "object": "message"}

// 6. 响应完成（含 token 用量）
data: {"id": "response_123", "status": "completed", "object": "response", "usage": {"prompt_tokens": 50, "completion_tokens": 20}}
```

**关键字段说明：**

| 字段 | 说明 |
|------|------|
| `object` | 事件对象类型：`response`、`message`、`content` |
| `status` | 生命周期状态：`created` → `in_progress` → `completed` / `failed` / `canceled` |
| `delta` | `true` 表示增量片段，`false` 表示完成 |
| `index` | 内容在消息中的位置索引 |
| `msg_id` | 关联的父消息 ID |
| `type` | 内容类型：`text`、`image`、`data` 等 |

**特殊事件：**

| 事件特征 | 说明 |
|----------|------|
| `object === "response"` + `status === "completed"` | 流式对话完成标志 |
| `metadata.clear_history === true` | 需要清空聊天历史 |
| `error` 字段存在 | 发生错误，需展示错误信息 |

### 5.4 Vue3 流式聊天实现

```typescript
// src/api/chat.ts
import api, { getToken } from './auth'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: Array<{ type: string; text?: string; [key: string]: any }>
}

export interface ChatEvent {
  type: string
  content?: string
  tool_name?: string
  input?: Record<string, any>
  output?: any
  usage?: Record<string, any>
  [key: string]: any
}

/**
 * 发送消息并接收 SSE 流式响应
 * 使用 Generator 函数，逐块 yield 解析后的事件
 *
 * 官方协议参考:
 * - https://runtime.agentscope.io/en/protocol.html
 * - 官方控制台使用 fetch + ReadableStream，透传 Response 给 UI 组件处理
 */
export async function* sendChatMessage(
  agentId: string,
  messages: ChatMessage[],
  options?: {
    userId?: string
    sessionId?: string
    signal?: AbortSignal
  }
): AsyncGenerator<ChatEvent> {
  const token = getToken()

  const response = await fetch(`/api/agents/${agentId}/console/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'X-Agent-Id': agentId,
    },
    body: JSON.stringify({
      input: messages.map((msg) => ({
        role: msg.role,
        type: 'message',
        content: msg.content,
      })),
      stream: true,
      user_id: options?.userId ?? 'default_user',
      session_id: options?.sessionId ?? 'console:default_user',
      channel: 'console',
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Failed to get response reader')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 按 \n\n 分割 SSE 事件（官方协议格式）
      const lines = buffer.split('\n\n')
      // 最后一个可能不完整，保留在 buffer 中
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            yield event
          } catch {
            // 忽略解析失败的非 JSON 行
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 断线重连（与官方控制台一致）
 * 官方控制台在 reconnect 时只传 session_id/user_id/channel
 */
export async function* reconnectChat(
  agentId: string,
  options?: {
    userId?: string
    sessionId?: string
    signal?: AbortSignal
  }
): AsyncGenerator<ChatEvent> {
  const token = getToken()

  const response = await fetch(`/api/agents/${agentId}/console/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'X-Agent-Id': agentId,
    },
    body: JSON.stringify({
      reconnect: true,
      user_id: options?.userId ?? 'default_user',
      session_id: options?.sessionId ?? 'console:default_user',
      channel: 'console',
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    throw new Error(`Reconnect error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Failed to get response reader')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            yield JSON.parse(line.slice(6))
          } catch {
            // ignore
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 停止正在运行的聊天
 */
export async function stopChat(agentId: string) {
  await api.post(`/api/agents/${agentId}/console/chat/stop`)
}
```

### 5.5 Vue 组件中使用

> **官方控制台的实现方式**：官方将 `Response` 对象直接传递给第三方聊天 UI 组件，由组件内部处理 SSE。以下代码展示的是手动解析的完整实现，便于理解和定制。

```vue
<!-- src/views/ChatView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { sendChatMessage, stopChat, type ChatEvent } from '@/api/chat'

const agentId = ref('default')
const userInput = ref('')
const messages = ref<{ role: string; text: string }[]>([])
const isStreaming = ref(false)
const currentAssistantText = ref('')

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || isStreaming.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', text })
  userInput.value = ''
  isStreaming.value = true
  currentAssistantText.value = ''

  try {
    // 构建完整的消息历史（上下文）
    const chatMessages = messages.value.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: [{ type: 'text', text: m.text }],
    }))

    for await (const event of sendChatMessage(agentId.value, chatMessages)) {
      // 官方协议格式的事件处理
      // object: "content" + delta: true → 增量文本
      // object: "response" + status: "completed" → 完成
      if (event.object === 'content' && event.delta) {
        currentAssistantText.value += event.text ?? ''
      } else if (event.object === 'response' && event.status === 'completed') {
        // 流式完成，将完整的 assistant 消息加入列表
        messages.value.push({
          role: 'assistant',
          text: currentAssistantText.value,
        })
      } else if (event.object === 'message' && event.status === 'completed') {
        // 消息完成（备用判断）
        if (currentAssistantText.value && !messages.value.some(m => m.text === currentAssistantText.value)) {
          messages.value.push({
            role: 'assistant',
            text: currentAssistantText.value,
          })
        }
      } else if (event.error) {
        // 错误事件
        messages.value.push({
          role: 'assistant',
          text: `错误：${event.error.message ?? '未知错误'}`,
        })
      } else if (event.metadata?.clear_history) {
        // 清空历史指令（官方协议支持）
        messages.value = []
        currentAssistantText.value = ''
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      messages.value.push({
        role: 'assistant',
        text: `请求失败：${err.message}`,
      })
    }
  } finally {
    isStreaming.value = false
    currentAssistantText.value = ''
  }
}

async function handleStop() {
  try {
    await stopChat(agentId.value)
    isStreaming.value = false
  } catch (err) {
    console.error('Failed to stop chat:', err)
  }
}
</script>

<template>
  <div class="chat-container">
    <div class="messages">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="['message', msg.role]"
      >
        <strong>{{ msg.role === 'user' ? '我' : 'AI' }}：</strong>
        <span>{{ msg.text }}</span>
      </div>
      <!-- 正在流式输出的内容 -->
      <div v-if="isStreaming && currentAssistantText" class="message assistant streaming">
        <strong>AI：</strong>
        <span>{{ currentAssistantText }}</span>
      </div>
    </div>

    <div class="input-area">
      <input
        v-model="userInput"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
        :disabled="isStreaming"
      />
      <button @click="sendMessage" :disabled="isStreaming">发送</button>
      <button v-if="isStreaming" @click="handleStop">停止</button>
    </div>
  </div>
</template>
```

## 6. 聊天列表与历史

### 6.1 列出聊天

```
GET /api/agents/{agentId}/chats
Authorization: Bearer <token>
```

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 否 | 按用户过滤 |
| `channel` | string | 否 | 按渠道过滤 |

**响应（ChatSpec[]）：**
```json
[
  {
    "id": "uuid-here",
    "name": "新聊天",
    "session_id": "console:default_user",
    "user_id": "default_user",
    "channel": "console",
    "created_at": "2026-04-24T10:00:00Z",
    "updated_at": "2026-04-24T10:05:00Z",
    "status": "idle",
    "pinned": false,
    "meta": {}
  }
]
```

### 6.2 获取聊天历史（含完整消息）

```
GET /api/agents/{agentId}/chats/{chatId}
Authorization: Bearer <token>
```

**响应（ChatHistory）：**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "type": "message",
      "content": [
        { "type": "text", "text": "你好" }
      ],
      "status": "completed"
    },
    {
      "id": "msg-uuid",
      "role": "assistant",
      "type": "message",
      "content": [
        { "type": "text", "text": "你好！有什么可以帮你的？" }
      ],
      "status": "completed",
      "usage": { "prompt_tokens": 20, "completion_tokens": 15 }
    }
  ],
  "status": "idle"
}
```

### 6.3 创建聊天

```
POST /api/agents/{agentId}/chats
Content-Type: application/json
Authorization: Bearer <token>
```

**请求体（ChatSpec）：**
```json
{
  "id": "custom-uuid",
  "name": "我的新聊天",
  "session_id": "console:user1",
  "user_id": "user1",
  "channel": "console"
}
```

### 6.4 Vue3 聊天管理实现

```typescript
// src/api/chats.ts
import api from './auth'

export interface ChatSpec {
  id: string
  name: string
  session_id: string
  user_id: string
  channel: string
  created_at: string
  updated_at: string
  status: 'idle' | 'running'
  pinned: boolean
  meta: Record<string, any>
}

export interface ChatHistory {
  messages: any[]
  status: 'idle' | 'running'
}

export async function listChats(
  agentId: string,
  params?: { user_id?: string; channel?: string }
): Promise<ChatSpec[]> {
  const res = await api.get(`/api/agents/${agentId}/chats`, { params })
  return res.data
}

export async function getChatHistory(
  agentId: string,
  chatId: string
): Promise<ChatHistory> {
  const res = await api.get(`/api/agents/${agentId}/chats/${chatId}`)
  return res.data
}

export async function createChat(
  agentId: string,
  data: Partial<ChatSpec> & { session_id: string; user_id: string }
): Promise<ChatSpec> {
  const res = await api.post(`/api/agents/${agentId}/chats`, data)
  return res.data
}

export async function deleteChat(agentId: string, chatId: string) {
  await api.delete(`/api/agents/${agentId}/chats/${chatId}`)
}
```

## 7. 文件上传

```
POST /api/agents/{agentId}/console/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

| 字段 | 说明 |
|------|------|
| 请求体 | `multipart/form-data`，字段名 `file` |
| 大小限制 | 最大 10MB |
| 响应 | 返回文件的 URL，可在聊天消息中引用 |

```typescript
// src/api/upload.ts
import api from './auth'

export async function uploadFile(
  agentId: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post(
    `/api/agents/${agentId}/console/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return res.data
}
```

## 8. 后端日志查看（调试用）

```
GET /api/agents/{agentId}/console/debug/backend-logs
Authorization: Bearer <token>
```

用于排查问题时查看 QwenPaw 后端运行日志。

## 9. 完整 API 端点速查

### 9.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/register` | 注册（首次） |
| GET | `/api/auth/status` | 检查认证状态 |
| POST | `/api/auth/revoke-token` | 撤销 token |

### 9.2 Agent

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 列出所有 Agent |
| POST | `/api/agents` | 创建 Agent |
| GET | `/api/agents/{agentId}` | Agent 详情 |
| PUT | `/api/agents/{agentId}` | 更新 Agent |
| DELETE | `/api/agents/{agentId}` | 删除 Agent |

### 9.3 聊天

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/agents/{agentId}/console/chat` | **流式聊天** |
| POST | `/api/agents/{agentId}/console/chat/stop` | 停止聊天 |
| GET | `/api/agents/{agentId}/chats` | 聊天列表 |
| GET | `/api/agents/{agentId}/chats/{chatId}` | 聊天历史 |
| POST | `/api/agents/{agentId}/chats` | 创建聊天 |
| DELETE | `/api/agents/{agentId}/chats/{chatId}` | 删除聊天 |

### 9.4 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/version` | 版本号（公开） |
| POST | `/api/agents/{agentId}/console/upload` | 文件上传 |
| GET | `/api/agents/{agentId}/console/debug/backend-logs` | 后端日志 |
| GET | `/api/skills` | 技能列表 |
| GET | `/api/tools` | 工具列表 |
| GET | `/api/models` | 模型供应商列表 |

## 10. 注意事项

1. **Agent ID 传递**：官方控制台使用 `X-Agent-Id` 请求头 + `sessionStorage` 存储当前选中的 Agent。建议同时支持 URL 路径和请求头两种方式。
2. **SSE 断线重连**：聊天接口支持 `reconnect: true` 参数，只传 `session_id`/`user_id`/`channel` 即可恢复之前的流。
3. **Token 过期**：默认 7 天，前端必须监听 401 状态码并跳转登录。
4. **认证开关**：通过 `QWENPAW_AUTH_ENABLED` 环境变量控制，默认开启。如果关闭，所有接口无需 token 即可访问。
5. **首次登录**：如果从未注册过用户，可能需要先调用 `/api/auth/register` 创建初始账号（取决于服务配置）。
6. **`clear_history` 指令**：当 SSE 事件中 `metadata.clear_history === true` 时，前端应清空当前聊天历史。
7. **状态生命周期**：官方协议定义状态流转为 `created` → `in_progress` → `completed`/`failed`/`canceled`/`rejected`。

## 11. 官方文档与参考

> 以下资源是本文档的依据，建议在开发过程中随时参考。

### 11.1 QwenPaw 官方文档

| 资源 | 链接 |
|------|------|
| QwenPaw 文档首页 | https://qwenpaw.agentscope.io/docs/ |
| QwenPaw GitHub | https://github.com/agentscope-ai/QwenPaw |
| 快速开始 | https://qwenpaw.agentscope.io/docs/quickstart/ |
| 控制台文档 | https://qwenpaw.agentscope.io/docs/console/ |
| 频道配置 | https://qwenpaw.agentscope.io/docs/channels/ |
| Release Notes | https://qwenpaw.agentscope.io/release-notes |

### 11.2 AgentScope Runtime（底层引擎）

QwenPaw 的聊天接口底层基于 **AgentScope Runtime**，以下文档定义了标准协议：

| 资源 | 链接 |
|------|------|
| AgentScope Runtime 文档 | https://runtime.agentscope.io/ |
| **Agent API 协议规范** | https://runtime.agentscope.io/en/protocol.html |
| API Reference | https://runtime.agentscope.io/en/api/index.html |
| 快速开始 | https://runtime.agentscope.io/en/quickstart.html |
| 高级部署 | https://runtime.agentscope.io/en/advanced_deployment.html |
| Cookbook | https://runtime.agentscope.io/en/intro.html |

### 11.3 本文档与官方实现的对齐

| 实现点 | 本文档做法 | 官方控制台做法 |
|--------|-----------|---------------|
| Token 存储 | `localStorage["qwenpaw_auth_token"]` | `localStorage["qwenpaw_auth_token"]` |
| Agent 存储 | `sessionStorage["qwenpaw-agent-storage"]` | `sessionStorage["qwenpaw-agent-storage"]` |
| 请求头 | `Authorization` + `X-Agent-Id` | `Authorization` + `X-Agent-Id` |
| 聊天端点 | `/api/agents/{id}/console/chat` | `/api/console/chat` + `X-Agent-Id` 头 |
| SSE 解析 | `fetch` + `ReadableStream` + `data:` 分割 | 透传 `Response` 给 UI 组件 |
| 请求体字段 | `input`, `stream`, `user_id`, `session_id`, `channel` | 同上 + `biz_params` |
| 401 处理 | 清除 token → 跳转 `/login` | 清除 token → 跳转 `/login` |
| Auth Guard | 启动时检查 `/api/auth/status` + `/api/auth/verify` | 相同 |
