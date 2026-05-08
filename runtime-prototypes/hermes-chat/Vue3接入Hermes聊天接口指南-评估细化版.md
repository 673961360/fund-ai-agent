# Vue3 接入 Hermes 聊天接口指南（评估细化版）

> 本文档基于 Hermes Agent v0.11.0 服务端源码（`hermes-source/gateway/platforms/api_server.py`）验证编写。
>
> 标记为 `⚠️ 待确认` 的内容表示服务端源码无法完全确认，需实际运行验证或向 Hermes 上游确认。
>
> 本文档**不包含前端代码实现**，仅描述接口行为。前端参考代码见[附录 A](#附录-a参考实现代码仅供参考)。

---

## 1. 文档目标

### 1.1 定位

本文档是 Hermes Agent API Server 的**接口参考文档**，面向需要从 Vue3 前端接入 Hermes 聊天能力的开发者。

### 1.2 读者对象

- 前端开发者（需要了解接口格式和流式事件）
- 后端开发者（需要了解 Hermes 与业务层的边界）
- 测试工程师（需要验证接口行为）

### 1.3 不涉及范围

- Vue3 组件设计、页面布局、UI 实现
- 前端状态管理方案
- WebAudio、录音组件、上传组件等前端实现
- Hermes Agent 的内部架构和工具开发

### 1.4 信息来源

| 来源 | 说明 |
|------|------|
| `hermes-source/gateway/platforms/api_server.py`（2742行） | API Server 核心实现，所有端点、SSE 格式、鉴权、错误的真源 |
| `hermes-source/gateway/stream_consumer.py`（984行） | SSE 消费端，thinking 标签过滤逻辑 |
| `hermes-source/tools/transcription_tools.py` | STT（语音转文字）工具 |
| `hermes-source/tools/tts_tool.py` | TTS（文字转语音）工具 |
| `hermes-source/gateway/config.py` | Gateway 配置（端口、环境变量） |
| `hermes-source/.env.example`（400行） | 完整环境变量列表 |
| `_env_hermes.bat` | 本地端口/地址配置 |
| `start_hermes.bat` | 启动命令 |

---

## 2. 接入边界

### 2.1 Hermes 负责什么

Hermes Agent 作为 AI 网关，负责：

- 接收用户消息，调用 LLM 生成回复
- 管理多轮对话上下文（通过 `conversation` 参数或 `X-Hermes-Session-Id`）
- 流式输出 SSE 事件（文本增量、工具调用进度、完成/失败事件）
- 执行工具调用（终端命令、文件操作、网页搜索、浏览器等）
- 定时任务管理（Cron Jobs）
- 图片输入理解（通过 `image_url` / `input_image`）

### 2.2 Hermes 不负责什么

Hermes **不**负责：

- **用户认证和权限管理**：仅有全局 API Key，无用户体系
- **前端 UI 渲染**：只输出 SSE 事件流，不提供前端组件
- **文件上传**：API Server 不支持文件上传端点（`file`/`input_file` 类型会被拒绝）
- **语音直接接入**：STT/TTS 是 Agent 内部工具，不作为 HTTP 端点暴露（见[第17章](#17-语音接入能力探索)）
- **业务状态管理**：不管理订单、持仓、资金等业务状态
- **候选指令执行**：CandidateCommand（暂停/确认/改价等）是业务层概念，Hermes 不原生支持
- **WebSocket 通信**：API Server 仅使用 HTTP + SSE

### 2.3 与资金AI业务状态的关系

Hermes 是**无状态的 AI 网关**。业务状态（如持仓信息、订单状态、交易确认）应由业务层管理。Hermes 可以：

- 根据业务层传入的上下文信息生成回复
- 调用工具获取信息（如终端命令查询数据）
- 但**不会**自行维护或修改业务状态

> ⚠️ **安全警告**：Hermes Agent 拥有终端命令执行等高权限工具。在生产环境中，必须通过工具权限配置限制其可执行的操作范围。

---

## 3. 基础信息

### 3.1 服务地址

| 项目 | 值 |
|------|-----|
| 协议 | HTTP/1.1 (aiohttp) |
| 默认绑定 | `0.0.0.0`（允许局域网访问） |
| 本机访问 | `http://127.0.0.1:8056` |
| API 路径前缀 | `/v1`（聊天/模型）、`/api`（任务管理） |
| 健康检查 | `GET /health` → `{"status": "ok", "platform": "hermes-agent"}` |
| Dashboard | `http://127.0.0.1:9119`（仅本机，非 API Server） |

### 3.2 端口信息

| 服务 | 端口 | 绑定 | 配置位置 |
|------|------|------|----------|
| API Server | **8056**（本地覆盖） | `0.0.0.0` | `_env_hermes.bat` 中 `API_SERVER_PORT=8056` |
| Dashboard | 9119 | `127.0.0.1` | `runtime/_dashboard_wrapper.bat` |

> 上游代码默认端口为 8642（`api_server.py:55`），本地通过环境变量覆盖为 8056。

### 3.3 启动命令

```bat
# 前台启动（日志直出到控制台）
start_hermes.bat fg

# 后台启动（日志重定向到文件，90秒就绪等待）
start_hermes.bat bg

# 核心启动命令
hermes.exe gateway run
```

验证就绪：
```bat
curl http://127.0.0.1:8056/health
# 返回: {"status": "ok", "platform": "hermes-agent"}
```

### 3.4 接口版本

Hermes 兼容 OpenAI API 格式：
- Chat Completions：`/v1/chat/completions`（OpenAI Chat Completions 规格）
- Responses：`/v1/responses`（OpenAI Responses API 规格）
- Runs：`/v1/runs`（异步 Agent 运行）

### 3.5 鉴权方式

**Bearer Token 认证**：

```http
Authorization: Bearer <API_SERVER_KEY>
```

- 密钥在 `~/.hermes/.env` 中通过 `API_SERVER_KEY` 配置
- 绑定 `0.0.0.0` 时**强制要求** API Key（代码 `api_server.py:2651-2657`）
- 使用 `hmac.compare_digest` 进行常量时间比较（防时序攻击）
- 未配置 API Key 时所有请求允许通过（不安全）

无需认证的端点：
- `GET /health`
- `GET /health/detailed`
- `GET /v1/health`

### 3.6 Content-Type 约定

| 请求类型 | Content-Type |
|----------|-------------|
| 聊天请求 | `application/json` |
| SSE 响应 | `text/event-stream` |
| 错误响应 | `application/json` |

### 3.7 超时约定

| 项目 | 值 | 来源 |
|------|-----|------|
| SSE Keepalive 间隔 | 30 秒 | `api_server.py` 中 `CHAT_COMPLETIONS_SSE_KEEPALIVE_SECONDS` |
| 请求体大小限制 | 1 MB | `MAX_REQUEST_BYTES`，通过 `Content-Length` 检查 |
| Runs 孤儿清理 TTL | 300 秒（5分钟） | `_RUN_STREAM_TTL` |
| Runs 并发上限 | 10 | `_MAX_CONCURRENT_RUNS` |

### 3.8 环境变量配置

核心变量（`~/.hermes/.env`）：

```bash
# API Server
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key-here     # >=8字符，绑定0.0.0.0时强制
API_SERVER_PORT=8056
API_SERVER_HOST=0.0.0.0
API_SERVER_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# LLM 提供商（至少一个）
DASHSCOPE_API_KEY=sk-xxxxxx             # 通义千问

# Gateway
GATEWAY_ALLOW_ALL_USERS=true
```

> ⚠️ 待确认：修改 `API_SERVER_CORS_ORIGINS` 后是否需要重启 Gateway 才生效。

---

## 4. 核心概念

### 4.1 Conversation（会话）

Hermes 支持两种会话管理模式：

| 模式 | 接口 | 机制 |
|------|------|------|
| 无状态 | `/v1/chat/completions` | 前端在每次请求中发送完整消息历史 |
| 有状态（推荐） | `/v1/responses` | 通过 `conversation` 参数，服务端自动管理上下文 |
| 会话延续 | `/v1/chat/completions` | 通过 `X-Hermes-Session-Id` 请求头 |

`conversation` 值为字符串标识符（如 `"my-chat-001"`），服务端内部维护该标识符关联的上下文历史。

### 4.2 Message（消息）

消息结构遵循 OpenAI 格式：

```json
{
  "role": "system" | "user" | "assistant" | "tool",
  "content": "文本内容" | ContentPart[]
}
```

多模态 ContentPart 数组（见[第12章](#12-附件与截图)）：
```json
[
  {"type": "text", "text": "描述文字"},
  {"type": "image_url", "image_url": {"url": "https://..."}}
]
```

### 4.3 Run / Task（异步运行）

Run 是 Hermes 的异步 Agent 运行单元：
- 通过 `POST /v1/runs` 创建，立即返回 `run_id`
- 通过 `GET /v1/runs/{run_id}/events` 订阅 SSE 事件流
- 通过 `POST /v1/runs/{run_id}/stop` 中断运行
- 最大并发：10 个
- 孤儿清理：5分钟未消费事件流自动清理

### 4.4 Tool Call（工具调用）

Hermes Agent 在生成回复过程中可能调用工具（终端、文件、搜索、浏览器等）。不同接口的事件格式不同：

| 接口 | 工具事件 |
|------|----------|
| Chat Completions | `event: hermes.tool.progress`（自定义 SSE 事件） |
| Responses API | `response.output_item.added(done)` 中的 `function_call` / `function_call_output` |
| Runs API | `tool.started` / `tool.completed` 事件 |

### 4.5 Thinking Trace（思考过程）

- Runs API 提供 `reasoning.available` 事件（包含推理文本）
- Stream Consumer 会过滤 `<thinking>`、`<REASONING_SCRATCHPAD>`、`<reasoning>` 等标签
- ⚠️ 待确认：Chat Completions 和 Responses API 是否也返回 thinking 内容

### 4.6 CandidateCommand（候选指令）

**CandidateCommand 是业务层概念，与 Hermes 无关。**

候选指令（暂停/恢复/确认/改量/改价/拒绝/继续/结束）由业务层根据 Hermes 的文本回复和工具调用结果自行判断和生成。Hermes 不原生支持此概念。

在事件映射表（[第16章](#16-hermes原始事件到统一事件的映射)）中预留了 CandidateCommand 的映射位置，供业务层后续定义。

---

## 5. 接口总览

### 5.1 健康与模型

| 方法 | 路径 | 说明 | 认证 | 确认状态 | 源码位置 |
|------|------|------|------|----------|----------|
| GET | `/health` | 健康检查 | 否 | ✅ 已确认 | api_server.py:765-767 |
| GET | `/health/detailed` | 详细状态（含PID、平台、运行时间） | 否 | ✅ 已确认 | api_server.py:769-788 |
| GET | `/v1/health` | 同 `/health` | 否 | ✅ 已确认 | api_server.py:2622 |
| GET | `/v1/models` | 可用模型列表 | 是 | ✅ 已确认 | api_server.py:790-809 |

### 5.2 聊天接口

| 方法 | 路径 | 说明 | 流式 | 认证 | 确认状态 | 源码位置 |
|------|------|------|------|------|----------|----------|
| POST | `/v1/chat/completions` | OpenAI 格式聊天（无状态） | 是 | 是 | ✅ 已确认 | api_server.py:811-1172 |
| POST | `/v1/responses` | Responses 格式（有状态） | 是 | 是 | ✅ 已确认 | api_server.py:1174-1672 |
| GET | `/v1/responses/{id}` | 获取已存储的响应 | 否 | 是 | ✅ 已确认 | api_server.py:1674-1700 |
| DELETE | `/v1/responses/{id}` | 删除已存储的响应 | 否 | 是 | ✅ 已确认 | api_server.py:1700-1670 |

### 5.3 异步运行接口

| 方法 | 路径 | 说明 | 流式 | 认证 | 确认状态 | 源码位置 |
|------|------|------|------|------|----------|----------|
| POST | `/v1/runs` | 创建异步 Agent 运行 | 否 | 是 | ✅ 已确认 | api_server.py:2342-2500 |
| GET | `/v1/runs/{run_id}/events` | SSE 事件流 | 是 | 是 | ✅ 已确认 | api_server.py:2502-2549 |
| POST | `/v1/runs/{run_id}/stop` | 中断运行中的 Agent | 否 | 是 | ✅ 已确认 | api_server.py:2551-2587 |

### 5.4 任务管理接口

| 方法 | 路径 | 说明 | 认证 | 确认状态 | 源码位置 |
|------|------|------|------|----------|----------|
| GET | `/api/jobs` | 列出所有任务 | 是 | ✅ 已确认 | api_server.py:1973-2010 |
| POST | `/api/jobs` | 创建定时任务 | 是 | ✅ 已确认 | api_server.py:2012-2058 |
| GET | `/api/jobs/{job_id}` | 获取任务详情 | 是 | ✅ 已确认 | api_server.py:2058-2080 |
| PATCH | `/api/jobs/{job_id}` | 更新任务 | 是 | ⚠️ CORS待确认 | api_server.py:2080-2095 |
| DELETE | `/api/jobs/{job_id}` | 删除任务 | 是 | ✅ 已确认 | api_server.py:2095-2108 |
| POST | `/api/jobs/{job_id}/pause` | 暂停任务 | 是 | ✅ 已确认 | api_server.py:2108-2120 |
| POST | `/api/jobs/{job_id}/resume` | 恢复任务 | 是 | ✅ 已确认 | api_server.py:2120-2132 |
| POST | `/api/jobs/{job_id}/run` | 立即执行任务 | 是 | ✅ 已确认 | api_server.py:2132-2145 |

> ⚠️ **CORS 待确认**：`Access-Control-Allow-Methods` 中不含 `PATCH`（api_server.py:390），但 `/api/jobs/{job_id}` 更新端点使用 PATCH 方法。浏览器预检请求可能被阻止。

---

## 6. 会话接口

### 6.1 创建会话

Hermes 没有独立的"创建会话"接口。会话通过聊天接口隐式创建：

**方式一**：`POST /v1/responses` 传入 `conversation` 参数
```json
{
  "input": "你好",
  "conversation": "my-chat-001",
  "stream": true
}
```

**方式二**：`POST /v1/chat/completions` 首次发送消息

### 6.2 继续会话

**Responses API（推荐）**：
- 使用相同 `conversation` 值继续对话
- 服务端自动加载之前的上下文
- 或使用 `previous_response_id` 链式引用上一次响应

**Chat Completions**：
- 方式一：前端在每次请求中发送完整 `messages` 数组
- 方式二：使用 `X-Hermes-Session-Id` 请求头（需 API Key 认证）

```http
POST /v1/chat/completions
Authorization: Bearer your-key
X-Hermes-Session-Id: my-session-001
```

> 服务端会在响应头中返回 `X-Hermes-Session-Id`（api_server.py:1040, 1066）。

### 6.3 查询会话列表

API Server **不提供**会话列表查询端点。

会话管理功能仅存在于 TUI Gateway（JSON-RPC），不对外暴露。前端需自行维护会话列表。

### 6.4 查询会话详情

可通过 `GET /v1/responses/{id}` 查询已存储的响应（需要知道 response_id）。响应持久化在 SQLite 中，最大 100 条（LRU 淘汰）。

### 6.5 删除会话

可通过 `DELETE /v1/responses/{id}` 删除已存储的响应。

> 注意：这仅删除单个响应记录，不是删除整个会话。会话上下文由服务端内部管理，无公开的删除接口。

---

## 7. 聊天接口

### 7.1 普通聊天（Chat Completions）

```
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <API_SERVER_KEY>
```

**请求字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | 否 | 模型名称，实际使用服务端配置的 LLM |
| `messages` | Message[] | 是 | 完整消息历史 |
| `stream` | boolean | 否 | 是否流式，默认 `false` |

**Message 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | string | `system`、`user`、`assistant`、`tool` |
| `content` | string \| ContentPart[] | 文本内容或内容数组 |

**非流式响应**：

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1745478000,
  "model": "hermes-agent",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "你好！我是 Hermes Agent..."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 50, "completion_tokens": 200, "total_tokens": 250}
}
```

### 7.2 有状态聊天（Responses API，推荐）

```
POST /v1/responses
Content-Type: application/json
Authorization: Bearer <API_SERVER_KEY>
```

**请求字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string \| Message[] | 是 | 用户输入 |
| `conversation` | string | 否 | 会话名称，与 `previous_response_id` 互斥 |
| `previous_response_id` | string | 否 | 链式引用上一次响应 |
| `conversation_history` | Message[] | 否 | 显式会话历史，优先级高于 `previous_response_id` |
| `instructions` | string | 否 | 系统提示词 |
| `stream` | boolean | 否 | 是否流式 |
| `store` | boolean | 否 | 是否持久化，默认 `true` |
| `truncation` | string | 否 | `"auto"` 时超过 100 条历史截断 |
| `tools` | array | 否 | 工具配置 |
| `tool_choice` | string | 否 | 工具选择策略 |

**非流式响应**：

```json
{
  "id": "resp_abc123def456",
  "object": "response",
  "status": "completed",
  "created_at": 1745478000,
  "model": "hermes-agent",
  "output": [
    {
      "type": "function_call",
      "name": "terminal",
      "arguments": "{\"command\": \"ls\"}",
      "call_id": "call_1"
    },
    {
      "type": "function_call_output",
      "call_id": "call_1",
      "output": [{"type": "input_text", "text": "README.md src/ tests/"}]
    },
    {
      "type": "message",
      "role": "assistant",
      "content": [{"type": "output_text", "text": "你的项目有 README.md、src/ 和 tests/ 目录。"}]
    }
  ],
  "usage": {"input_tokens": 120, "output_tokens": 85, "total_tokens": 205}
}
```

> `output` 数组按执行顺序排列：先 `function_call`，再 `function_call_output`，最后 `message`。

### 7.3 异步运行（Runs API）

```
POST /v1/runs
Content-Type: application/json
Authorization: Bearer <API_SERVER_KEY>
```

**请求字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string \| Message[] | 是 | 用户输入（取最后一项的 content 作为消息） |
| `instructions` | string | 否 | 系统提示词 |
| `previous_response_id` | string | 否 | 链式响应 |
| `conversation_history` | Message[] | 否 | 会话历史 |
| `session_id` | string | 否 | 会话 ID |

**响应**（HTTP 202）：

```json
{"run_id": "run_a1b2c3d4e5f6...", "status": "started"}
```

> `run_id` 格式为 `run_` + UUID hex（api_server.py:2368）。

### 7.4 响应查询和删除

```
GET /v1/responses/{response_id}
DELETE /v1/responses/{response_id}
```

响应持久化在 SQLite 中，最大 100 条（LRU 淘汰），网关重启后保留。

---

## 8. 流式协议

### 8.1 协议类型

所有流式接口统一使用 **Server-Sent Events (SSE)**：

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

**不支持** WebSocket 或 fetch stream。

### 8.2 三种接口的 SSE 格式差异

| 特性 | Chat Completions | Responses API | Runs API |
|------|-----------------|---------------|----------|
| 事件格式 | `data: {JSON}\n\n` | `event: {type}\ndata: {JSON}\n\n` | `data: {JSON}\n\n` |
| 结束标记 | `data: [DONE]\n\n` | 无显式 [DONE]（`response.completed`/`response.failed` 为终端事件） | `: stream closed\n\n` |
| 工具进度 | `event: hermes.tool.progress\ndata: {JSON}\n\n` | 通过 `response.output_item.added/done` 事件 | `data: {"event":"tool.started/completed"}\n\n` |
| 心跳 | `: keepalive\n\n`（30秒） | `: keepalive\n\n`（30秒） | `: keepalive\n\n`（30秒） |
| 序列号 | 无 | 有（`sequence_number`，单调递增） | 无 |

> ⚠️ 注意：Runs API 的结束标记 `: stream closed\n\n` 是 SSE 注释格式（以冒号开头），不是标准 `data:` 行。前端解析器不能仅靠 `data:` 前缀判断流结束，需要通过 `run.completed` / `run.failed` 事件判断。

### 8.3 心跳机制

三种接口的 keepalive 行为一致：

- 每 30 秒无数据时发送 `: keepalive\n\n`
- 以冒号 `:` 开头，是 SSE 标准的注释行
- 前端解析器应跳过以 `:` 开头的行

### 8.4 客户端断连行为

当客户端在 SSE 传输过程中断开连接：

- 服务端捕获 `ConnectionResetError` / `BrokenPipeError` 等异常
- 自动调用 `agent.interrupt("SSE client disconnected")` 停止 LLM 调用
- 取消 asyncio task
- Responses API 会持久化一个 `incomplete` 快照（如果 `store=true`），保证 `previous_response_id` 链式引用仍可恢复

源码位置：api_server.py:1154-1170, 1638-1670

### 8.5 CORS 与 SSE

SSE 响应在 `prepare()` 之前注入 CORS 头（api_server.py:1061-1064），确保浏览器能正常接收流式响应。

---

## 9. 流式事件类型

### 9.1 Chat Completions SSE 事件

**角色块**（流开始）：
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"hermes-agent","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}
```

**文本增量**：
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}
```

**工具进度**（自定义事件类型）：
```
event: hermes.tool.progress
data: {"tool":"terminal","emoji":"⌨️","label":"执行命令: ls"}
```

**完成块**：
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":50,"completion_tokens":200,"total_tokens":250}}
```

**流结束**：
```
data: [DONE]
```

### 9.2 Responses API SSE 事件

所有事件包含 `type` 字段和 `sequence_number`（单调递增）。

**response.created** — 响应开始：
```
event: response.created
data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_...","object":"response","status":"in_progress","created_at":...,"model":"hermes-agent","output":[]}}
```

**response.output_text.delta** — 文本增量：
```
event: response.output_text.delta
data: {"type":"response.output_text.delta","sequence_number":1,"item_id":"msg_...","output_index":0,"content_index":0,"delta":"你好","logprobs":[]}
```

**response.output_item.added** — 新输出项（工具调用开始）：
```
event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":2,"output_index":1,"item":{"id":"fc_...","type":"function_call","status":"in_progress","name":"terminal","call_id":"call_...","arguments":"{\"command\":\"ls\"}"}}
```

**response.output_item.done** — 输出项完成（工具调用完成）：
```
event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":3,"output_index":1,"item":{"id":"fc_...","type":"function_call","status":"completed","name":"terminal","call_id":"call_...","arguments":"{\"command\":\"ls\"}"}}
```

**response.output_item.added** — 工具输出结果：
```
event: response.output_item.added
data: {"type":"response.output_item.added","sequence_number":4,"output_index":2,"item":{"id":"fco_...","type":"function_call_output","call_id":"call_...","output":[{"type":"input_text","text":"README.md src/"}],"status":"completed"}}
```

**response.output_text.done** — 文本完成：
```
event: response.output_text.done
data: {"type":"response.output_text.done","sequence_number":5,"item_id":"msg_...","output_index":0,"content_index":0,"text":"完整回复文本","logprobs":[]}
```

**response.output_item.done** — 消息项完成：
```
event: response.output_item.done
data: {"type":"response.output_item.done","sequence_number":6,"output_index":0,"item":{"id":"msg_...","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"完整回复文本"}]}}
```

**response.completed** — 终端事件（成功）：
```
event: response.completed
data: {"type":"response.completed","sequence_number":7,"response":{"id":"resp_...","status":"completed","output":[...],"usage":{...}}}
```

**response.failed** — 终端事件（失败）：
```
event: response.failed
data: {"type":"response.failed","sequence_number":7,"response":{"id":"resp_...","status":"failed","error":{"message":"...","type":"server_error"},"output":[...],"usage":{...}}}
```

### 9.3 Runs API SSE 事件

事件为标准 `data:` 行，每行 JSON 包含 `event` 字段标识类型。

**message.delta** — 文本增量：
```json
{"event": "message.delta", "run_id": "run_...", "timestamp": 1745478000.0, "delta": "你好"}
```

**tool.started** — 工具调用开始：
```json
{"event": "tool.started", "run_id": "run_...", "timestamp": 1745478000.0, "tool": "terminal", "preview": "执行命令: ls"}
```

**tool.completed** — 工具调用完成：
```json
{"event": "tool.completed", "run_id": "run_...", "timestamp": 1745478000.0, "tool": "terminal", "duration": 1.234, "error": false}
```

**reasoning.available** — 推理内容：
```json
{"event": "reasoning.available", "run_id": "run_...", "timestamp": 1745478000.0, "text": "推理文本..."}
```

**run.completed** — 运行完成：
```json
{"event": "run.completed", "run_id": "run_...", "timestamp": 1745478000.0, "output": "最终回复文本", "usage": {"input_tokens": 50, "output_tokens": 200, "total_tokens": 250}}
```

**run.failed** — 运行失败：
```json
{"event": "run.failed", "run_id": "run_...", "timestamp": 1745478000.0, "error": "错误信息"}
```

---

## 10. 模型思考过程

### 10.1 是否返回

- **Runs API**：通过 `reasoning.available` 事件返回推理内容（api_server.py:2331-2337）
- **Chat Completions / Responses API**：思考内容可能嵌入在文本流中，以 `<thinking>`、`<REASONING_SCRATCHPAD>`、`<reasoning>` 等 XML 标签包裹

### 10.2 过滤机制

Stream Consumer（`stream_consumer.py`）会自动过滤以下 thinking 标签：

- `<thinking>...</thinking>`
- `<REASONING_SCRATCHPAD>...</REASONING_SCRATCHPAD>`
- `<reasoning>...</reasoning>`

这些标签的内容**不会**出现在 SSE 流的文本增量中。

> ⚠️ 待确认：
> - 过滤是在 API Server 层还是 Agent 层执行的？
> - 如果 LLM 返回了 thinking 标签，Chat Completions 的 delta 中是否会包含？
> - 是否有配置项控制是否返回 thinking 内容？

### 10.3 展示建议

- Runs API 的 `reasoning.available` 事件可展示为"模型思考过程"
- 建议与正文分开显示（如折叠区域）
- 不应将 thinking 内容作为正式 assistant 消息的一部分

---

## 11. 工具调用过程

### 11.1 Chat Completions 工具事件

通过自定义 SSE 事件类型 `hermes.tool.progress` 推送：

```
event: hermes.tool.progress
data: {"tool": "terminal", "emoji": "⌨️", "label": "执行命令: ls"}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `tool` | string | 工具名称（如 `terminal`、`browser`、`web_search`） |
| `emoji` | string | 工具图标 emoji |
| `label` | string | 展示文本（preview 或工具名） |

**限制**：
- 仅在 `tool.started` 时触发，不发送 `tool.completed` 事件
- 工具名称以 `_` 开头的不发送（如 `_thinking`）
- 不包含工具参数和结果

源码位置：api_server.py:935-964

### 11.2 Responses API 工具事件

工具调用通过 OpenAI Responses API 标准事件传递：

**工具调用开始** → `response.output_item.added`（item.type = `function_call`）

| 字段 | 说明 |
|------|------|
| `item.id` | 工具调用项 ID（`fc_` 前缀） |
| `item.type` | `"function_call"` |
| `item.status` | `"in_progress"` |
| `item.name` | 工具名称 |
| `item.call_id` | 调用 ID（`call_` 前缀） |
| `item.arguments` | 参数 JSON 字符串 |

**工具调用完成** → `response.output_item.done`（item.type = `function_call`，status = `completed`）

**工具输出结果** → `response.output_item.added`（item.type = `function_call_output`）

| 字段 | 说明 |
|------|------|
| `item.type` | `"function_call_output"` |
| `item.call_id` | 对应的调用 ID |
| `item.output` | `[{"type": "input_text", "text": "结果文本"}]` |
| `item.status` | `"completed"` |

源码位置：api_server.py:1378-1482

### 11.3 Runs API 工具事件

**tool.started**：
```json
{"event": "tool.started", "run_id": "...", "timestamp": ..., "tool": "terminal", "preview": "执行命令: ls"}
```

**tool.completed**：
```json
{"event": "tool.completed", "run_id": "...", "timestamp": ..., "tool": "terminal", "duration": 1.234, "error": false}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `tool` | string | 工具名称 |
| `preview` | string | 预览文本（仅 started） |
| `duration` | number | 执行时长秒（仅 completed） |
| `error` | boolean | 是否失败（仅 completed） |

源码位置：api_server.py:2301-2340

### 11.4 工具调用是否代表业务动作完成

**不代表**。工具调用仅表示 Hermes Agent 调用了一个工具并获得了返回结果。业务层需根据工具名称、参数和结果自行判断是否产生了业务动作。

> ⚠️ **安全提醒**：Hermes Agent 可调用终端命令等高权限工具。生产环境需通过工具权限配置限制可执行的操作。

### 11.5 待确认问题

- 工具调用的 `arguments` 字段是否包含完整参数？
- `tool.completed` 的 `error: true` 时，是否有详细的错误信息？
- 工具输出结果是否可能包含敏感信息（如文件内容、系统信息）？

---

## 12. 附件与截图

### 12.1 图片输入

Chat Completions 和 Responses API 均支持图片输入，通过 ContentPart 数组传递。

**Chat Completions 格式**：
```json
{
  "model": "hermes-agent",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "这张图片显示了什么？"},
      {"type": "image_url", "image_url": {"url": "https://example.com/image.png", "detail": "high"}}
    ]
  }],
  "stream": true
}
```

**Responses API 格式**：
```json
{
  "input": [
    {"type": "text", "text": "这张图片显示了什么？"},
    {"type": "input_image", "image_url": "https://example.com/image.png"}
  ],
  "stream": true
}
```

### 12.2 支持的图片来源

| 方式 | 格式 | 说明 |
|------|------|------|
| HTTP/HTTPS URL | `https://example.com/image.png` | ✅ 支持 |
| Data URI | `data:image/png;base64,iVBOR...` | ✅ 支持（仅 `data:image/` 前缀） |
| 本地文件路径 | `/path/to/image.png` | ❌ 不支持 |
| 文件上传 | `{"type": "file", ...}` | ❌ 不支持 |
| 文件 ID | `{"type": "input_file", ...}` | ❌ 不支持 |

源码位置：api_server.py:130-245

### 12.3 不支持的类型

以下类型会返回 `400 unsupported_content_type` 错误：
- `file`、`input_file`、`file_id`（文件上传不支持）
- 非 `data:image/` 的 data URI
- 非文本/图片的 ContentPart 类型

### 12.4 图片 detail 参数

可选值（由下游 LLM 解释）：
- `"auto"`（默认）
- `"low"`
- `"high"`

### 12.5 文件大小限制

图片通过 `image_url` 传递，受请求体总大小限制（1 MB）。Base64 编码的图片会使请求体显著增大，建议使用 HTTP URL 方式。

### 12.6 截图提问

截图提问通过图片输入实现：
1. 前端将截图转为 Base64 Data URI（`data:image/png;base64,...`）
2. 或将截图上传到可公开访问的 HTTP URL
3. 作为 `image_url` 类型发送给 Hermes

> ⚠️ 注意：无独立的文件上传接口。截图需嵌入请求体中。

---

## 13. 取消、中断与重试

### 13.1 取消当前生成

**Chat Completions / Responses API**：
- 断开 HTTP 连接（关闭 SSE 流），服务端自动调用 `agent.interrupt()` 停止 LLM 调用
- 前端通过 `AbortController` 的 `abort()` 方法实现

**Runs API**：
- 调用 `POST /v1/runs/{run_id}/stop` 主动中断
- 返回 `{"run_id": "...", "status": "stopping"}`
- 内部调用 `agent.interrupt("Stop requested via API")` + 取消 asyncio task
- 有 5 秒超时保护

```http
POST /v1/runs/run_abc123/stop
Authorization: Bearer your-key
```

### 13.2 网络中断处理

- SSE 连接中断后，服务端会：
  1. 停止 Agent 执行（`agent.interrupt()`）
  2. 取消后台任务
  3. Responses API 会持久化 `incomplete` 快照（如果 `store=true`）
- 前端应检测连接断开，向用户提示网络异常
- 已发送的 SSE 事件不会重发

### 13.3 用户手动重试

- 前端重新发送请求即可
- Chat Completions：重新发送完整消息历史
- Responses API：使用相同 `conversation` 参数重发

### 13.4 幂等支持（Idempotency-Key）

Chat Completions 和 Responses API 的**非流式模式**支持请求幂等：

```http
POST /v1/chat/completions
Authorization: Bearer your-key
Idempotency-Key: your-unique-key
```

- 缓存 TTL：300 秒（5分钟）
- 最大缓存条目：1000
- 仅非流式模式有效
- 指纹计算基于请求体部分字段的 SHA256

源码位置：api_server.py:466-520, 993-997, 1861-1868

### 13.5 Runs API 孤儿清理

- 如果 Runs 事件流创建后 300 秒内无人订阅，run 会被自动清理
- 订阅开始后，流关闭即清理（`_run_streams.pop`）
- ⚠️ 待确认：前端延迟订阅是否有丢失风险

---

## 14. 错误处理

### 14.1 HTTP 错误码

| HTTP 状态 | 错误码 | 场景 | 源码位置 |
|-----------|--------|------|----------|
| 400 | `invalid_request_error` | 缺少必填字段、JSON 解析失败 | api_server.py 各处 |
| 400 | `unsupported_content_type` | file/input_file 类型、非图片 data URI | api_server.py:223-234 |
| 400 | `invalid_image_url` | 缺少图片 URL、不支持的 URI scheme | api_server.py:201-213 |
| 400 | `invalid_content_part` | ContentPart 格式错误 | api_server.py:218, 231 |
| 400 | `body_too_large` | Content-Length > 1MB | api_server.py:441 |
| 400 | `invalid_content_length` | Content-Length 值无效 | api_server.py:443 |
| 401 | `invalid_api_key` | API Key 无效 | api_server.py:664-683 |
| 403 | — | 未配置 API Key 时使用 X-Hermes-Session-Id | api_server.py |
| 404 | — | 响应/运行/任务不存在 | api_server.py |
| 413 | `body_too_large` | 请求体超过限制 | api_server.py:441 |
| 429 | `rate_limit_exceeded` | 并发 Runs 超过 10 个 | api_server.py:2351 |
| 500 | `server_error` | Agent 内部错误 | api_server.py |
| 501 | — | Cron 模块不可用 | api_server.py |

### 14.2 错误响应格式

所有错误使用 OpenAI 风格信封：

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "invalid_api_key"
  }
}
```

### 14.3 流式错误事件

**Responses API**：通过 `response.failed` 终端事件传递

```
event: response.failed
data: {"type":"response.failed","response":{"status":"failed","error":{"message":"...","type":"server_error"},...}}
```

**Runs API**：通过 `run.failed` 事件传递

```json
{"event": "run.failed", "run_id": "...", "timestamp": ..., "error": "错误信息"}
```

**Chat Completions**：无专门的错误事件。错误时流可能直接中断，前端通过连接断开检测。

### 14.4 安全响应头

所有响应包含：
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

源码位置：api_server.py:448-463

---

## 15. CandidateCommand 候选指令

### 15.1 定义

CandidateCommand 是**业务层概念，与 Hermes 服务端无关**。

候选指令指需要用户确认后才能执行的业务动作，包括但不限于：
- 暂停、恢复
- 确认、拒绝
- 改量、改价
- 继续、结束

### 15.2 与 Hermes 的关系

Hermes 不原生产生 CandidateCommand。业务层需自行根据以下 Hermes 事件判断是否应生成候选指令：

- **文本回复**：解析 assistant 文本内容，识别意图
- **工具调用结果**：根据工具名称和返回值判断
- **推理过程**：根据 reasoning 内容判断

### 15.3 实现位置

CandidateCommand 的生成、状态管理、用户确认流程均由**前端/业务后端**实现，不在 Hermes 范围内。

---

## 16. Hermes 原始事件到统一事件的映射

### 16.1 Chat Completions 事件映射

| Hermes 原始事件 | 原始字段 | 建议统一事件名 | 前端展示区域 | 产生 CandidateCommand |
|----------------|----------|---------------|-------------|----------------------|
| `data:` + `delta.content` | `choices[0].delta.content` | `text.delta` | 聊天正文 | 由业务层判断 |
| `data:` + `delta.role` | `choices[0].delta.role` | `role.start` | 忽略 | 否 |
| `data:` + `finish_reason: "stop"` | `choices[0].finish_reason` | `text.done` | 聊天正文完成 | 由业务层判断 |
| `event: hermes.tool.progress` | `tool`, `emoji`, `label` | `tool.progress` | 工具状态栏 | 由业务层判断 |
| `data: [DONE]` | — | `stream.end` | — | 否 |

### 16.2 Responses API 事件映射

| Hermes 原始事件 | 建议统一事件名 | 前端展示区域 | 产生 CandidateCommand |
|----------------|---------------|-------------|----------------------|
| `response.created` | `stream.start` | — | 否 |
| `response.output_text.delta` | `text.delta` | 聊天正文 | 由业务层判断 |
| `response.output_text.done` | `text.done` | 聊天正文完成 | 由业务层判断 |
| `response.output_item.added` (function_call) | `tool.started` | 工具状态栏 | 由业务层判断 |
| `response.output_item.done` (function_call) | `tool.completed` | 工具状态栏 | 由业务层判断 |
| `response.output_item.added` (function_call_output) | `tool.result` | 工具结果区 | 由业务层判断 |
| `response.completed` | `stream.end` | — | 由业务层判断 |
| `response.failed` | `stream.error` | 错误提示 | 否 |

### 16.3 Runs API 事件映射

| Hermes 原始事件 | 原始字段 | 建议统一事件名 | 前端展示区域 | 产生 CandidateCommand |
|----------------|----------|---------------|-------------|----------------------|
| `message.delta` | `delta` | `text.delta` | 聊天正文 | 由业务层判断 |
| `tool.started` | `tool`, `preview` | `tool.started` | 工具状态栏 | 由业务层判断 |
| `tool.completed` | `tool`, `duration`, `error` | `tool.completed` | 工具状态栏 | 由业务层判断 |
| `reasoning.available` | `text` | `thinking.delta` | 思考过程区（折叠） | 否 |
| `run.completed` | `output`, `usage` | `stream.end` | — | 由业务层判断 |
| `run.failed` | `error` | `stream.error` | 错误提示 | 否 |

---

## 17. 语音接入能力探索

> 本章只做接口能力探索，不做前端实现设计。

### 17.1 结论

**API Server（`api_server.py`）中无任何语音相关 HTTP 端点。**

搜索 `voice`、`stt`、`tts`、`speech`、`whisper`、`transcri` 等关键词，在 api_server.py 中均返回零结果。

### 17.2 语音相关能力在 Hermes 中的位置

| 能力 | 实现位置 | 是否通过 API Server 暴露 |
|------|----------|------------------------|
| STT（语音转文字） | `tools/transcription_tools.py` | 否，是 Agent 内部工具 |
| TTS（文字转语音） | `tools/tts_tool.py` | 否，是 Agent 内部工具 |
| Voice Mode（即说即录） | `tools/voice_mode.py` | 否，仅用于 CLI/TUI Gateway |

### 17.3 STT 工具详情

6 个 STT 提供商：

| 提供商 | 需要的 API Key | 说明 |
|--------|---------------|------|
| `local`（默认） | 无需 | faster-whisper 本地运行 |
| `groq` | `GROQ_API_KEY` | Groq Whisper API |
| `openai` | `VOICE_TOOLS_OPENAI_KEY` | OpenAI Whisper API |
| `mistral` | `MISTRAL_API_KEY` | Mistral Voxtral |
| `xai` | `XAI_API_KEY` | xAI Grok STT |
| NeuTTS（本地） | 无需 | 本地 CLI |

支持的音频格式：mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, aac

### 17.4 TTS 工具详情

7 个 TTS 提供商：

| 提供商 | 需要的 API Key | 说明 |
|--------|---------------|------|
| Edge TTS（默认） | 无需 | Microsoft Edge 神经语音（免费） |
| ElevenLabs | `ELEVENLABS_API_KEY` | 高品质语音 |
| OpenAI TTS | `OPENAI_API_KEY` | OpenAI TTS |
| MiniMax TTS | `MINIMAX_API_KEY` | 带语音克隆 |
| Mistral | `MISTRAL_API_KEY` | Voxtral TTS |
| Gemini TTS | `GEMINI_API_KEY` | Google Gemini TTS |
| NeuTTS | 无需 | 本地 TTS |

### 17.5 语音输入可能的实现方式

由于 API Server 不直接暴露语音端点，以下为可能的实现方案：

1. **前端录音 → ASR 服务 → 文字 → Hermes**：前端录音后先调用外部 ASR 服务（或 Hermes 的 STT 工具）转文字，再把文字发给 Hermes
2. **前端录音 → Base64 → Hermes 图片接口？**：不可行，API Server 只支持图片 data URI
3. **前端录音 → 文件上传 → Hermes？**：不可行，API Server 不支持文件上传

### 17.6 语音输出可能的实现方式

1. **Hermes 返回文本 → 前端调用 TTS**：最可行的方案
2. **Hermes 调用 TTS 工具？**：⚠️ 待确认。如果 Hermes Agent 调用了 TTS 工具生成音频，结果是否通过 SSE 流传递？传递格式是什么？
3. **Hermes 返回音频 URL？**：⚠️ 待确认

### 17.7 待确认问题

- 用户通过 Chat API 发送"请朗读这段话"，Hermes Agent 是否会调用 TTS 工具？
- 如果调用 TTS 工具，音频文件路径是否通过 SSE 流传递？
- 语音识别结果是否需要进入正式聊天消息？
- 语音场景下如何防止误触发业务动作？
- 音频原始文件是否会保存？保存多久？
- 音频是否进入审计日志？
- 语音数据是否可能被模型训练使用？

---

## 18. 本地验证清单

### 18.1 基础验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 1 | 服务端口验证 | `curl http://127.0.0.1:8056/health` | `{"status": "ok"}` |
| 2 | 健康检查 | `curl http://127.0.0.1:8056/health/detailed` | 含 pid、platform 等字段 |
| 3 | 模型列表 | `curl http://127.0.0.1:8056/v1/models -H "Authorization: Bearer key"` | 返回模型数组 |

### 18.2 聊天验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 4 | 普通文本聊天（非流式） | POST /v1/chat/completions, stream=false | 完整 JSON 响应 |
| 5 | 流式聊天（Chat Completions） | POST /v1/chat/completions, stream=true | SSE delta 事件流 |
| 6 | 流式聊天（Responses API） | POST /v1/responses, stream=true, conversation | SSE response.* 事件流 |
| 7 | 多轮对话（Responses API） | 连续发送带相同 conversation 的请求 | 上下文正确延续 |
| 8 | 会话延续（X-Hermes-Session-Id） | POST /v1/chat/completions + header | 响应头返回 session ID |

### 18.3 Runs API 验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 9 | 创建运行 | POST /v1/runs | HTTP 202, `{"run_id":"run_...","status":"started"}` |
| 10 | 订阅事件流 | GET /v1/runs/{id}/events | SSE message.delta/tool.*/run.* 事件 |
| 11 | 停止运行 | POST /v1/runs/{id}/stop | `{"status":"stopping"}` |
| 12 | 并发限制 | 创建 >10 个 runs | HTTP 429 |

### 18.4 事件验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 13 | 流式事件顺序 | 记录 SSE 事件序列 | 按 9.1/9.2/9.3 章节描述的顺序 |
| 14 | Keepalive | 等待 30 秒无数据 | 收到 `: keepalive\n\n` |
| 15 | 工具调用事件 | 发送触发工具的问题 | 收到 tool.progress / tool.started 等事件 |
| 16 | 思考过程 | Runs API | 收到 reasoning.available 事件 |

### 18.5 多模态验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 17 | 图片 URL 输入 | 发送含 image_url 的请求 | Agent 能描述图片内容 |
| 18 | 图片 Data URI 输入 | 发送含 data:image/... 的请求 | Agent 能描述图片内容 |
| 19 | 不支持的文件类型 | 发送含 file 类型的请求 | HTTP 400 unsupported_content_type |

### 18.6 错误处理验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 20 | 无效 API Key | 不带 Authorization | HTTP 401 |
| 21 | 请求体过大 | 发送 >1MB 请求 | HTTP 413 |
| 22 | 缺少 input 字段 | POST /v1/runs 无 input | HTTP 400 |
| 23 | 不存在的 run_id | GET /v1/runs/run_nonexistent/events | HTTP 404 |

### 18.7 高级验证

| # | 验证项 | 方法 | 预期结果 |
|---|--------|------|----------|
| 24 | 客户端断连 | 流式中途关闭连接 | 服务端停止 Agent（检查日志） |
| 25 | Idempotency-Key | 非流式请求带相同 key 发送两次 | 第二次返回缓存结果 |
| 26 | 响应查询 | GET /v1/responses/{id} | 返回已存储的响应 |
| 27 | 响应删除 | DELETE /v1/responses/{id} 后再 GET | HTTP 404 |
| 28 | CORS 预检 | 浏览器发 OPTIONS /api/jobs/{id} | ⚠️ 检查是否允许 PATCH |

---

## 19. 待确认问题清单

### 关键问题（阻塞开发）

| # | 问题 | 来源 | 影响范围 |
|---|------|------|----------|
| Q1 | CORS `Access-Control-Allow-Methods` 不含 PATCH，但 `/api/jobs/{job_id}` 使用 PATCH 方法。浏览器预检请求是否会被 CORS 中间件阻止？是否为服务端 bug？ | api_server.py:390 vs 2080 | 前端是否能从浏览器调用 Jobs 更新 API |
| Q2 | Hermes Agent 是否可能直接调用业务工具（如终端命令）并影响生产环境？如何通过配置限制工具权限？ | 安全考虑 | 生产部署安全 |
| Q3 | Runs API 事件流末尾发送 `: stream closed\n\n`（SSE 注释格式），前端解析器如何正确检测流结束？ | api_server.py:2539 | SSE 解析实现 |

### 重要问题（影响文档准确性）

| # | 问题 | 来源 | 影响范围 |
|---|------|------|----------|
| Q4 | 用户通过 Chat API 发送"请朗读这段话"，Hermes Agent 是否会调用 TTS 工具？如果调用，返回的音频文件如何传递？ | tools/tts_tool.py | 语音接入方案 |
| Q5 | 修改 `API_SERVER_CORS_ORIGINS` 后是否需要重启 Gateway？ | 配置管理 | 生产部署 |
| Q6 | Runs 孤儿清理 TTL 300秒，前端延迟订阅是否有丢失风险？ | api_server.py:2299 | Runs API 使用 |
| Q7 | thinking/reasoning 内容在 Chat Completions 和 Responses API 中是否也会出现（而非仅 Runs API）？ | stream_consumer.py | 思考过程展示 |
| Q8 | 工具调用的 `arguments` 是否包含完整参数？`tool.completed` 的 `error: true` 时是否有详细错误信息？ | api_server.py:2314-2330 | 工具调用展示 |

### 次要问题

| # | 问题 | 来源 | 影响范围 |
|---|------|------|----------|
| Q9 | `/health/detailed` 返回的 `active_agents` 完整结构是什么？ | api_server.py:769-788 | 监控集成 |
| Q10 | `API_SERVER_MODEL_NAME` 是否影响 `/v1/models` 返回的模型名？ | api_server.py:611-628 | 模型名称一致性 |
| Q11 | Responses API `store: false` 时，响应是否完全不留痕？是否影响会话上下文？ | api_server.py:1285-1286 | 数据持久化 |
| Q12 | 图片生成（FAL.ai）和视觉分析工具是否通过 API Server 可用？需要哪些额外配置？ | tools/ | 多模态能力范围 |
| Q13 | Responses API `truncation: "auto"` 截断到 100 条历史的规则细节？ | api_server.py:1772 | 长会话处理 |

---

## 20. 不允许事项

1. **不允许在没有服务端证据的情况下声称 Hermes 支持实时语音**。当前 API Server 无任何语音端点。
2. **不允许在本轮写任何前端实现代码**。本文档仅描述接口行为。
3. **不允许编造接口字段、事件格式、错误码**。所有内容需有源码证据或标记为"待确认"。
4. **不允许把 Hermes 工具级能力（STT/TTS/Voice Mode）写成 API 级 HTTP 端点**。
5. **不允许把 CandidateCommand 写成 Hermes 原生概念**。它是业务层概念。

---

## 附录 A：参考实现代码（仅供参考）

> ⚠️ 以下代码从原文档迁移而来，**仅供参考**，不在本文档的核心范围内。正确性未经验证，可能存在与最新接口不一致的地方。

### A.1 CORS 配置（Vite Proxy）

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:8056',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8056',
        changeOrigin: true,
      },
    },
  },
})
```

### A.2 认证模块参考

```typescript
// src/api/auth.ts — 仅供参考
import axios from 'axios'

const API_KEY = import.meta.env.VITE_HERMES_API_KEY || ''
const api = axios.create({ baseURL: '' })

export function getApiKey(): string {
  return localStorage.getItem('hermes_api_key') || API_KEY
}

export function setApiKey(key: string) {
  localStorage.setItem('hermes_api_key', key)
}

api.interceptors.request.use((config) => {
  const key = getApiKey()
  if (key) {
    config.headers.Authorization = `Bearer ${key}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      setApiKey('')
      window.dispatchEvent(new CustomEvent('hermes:auth-required'))
    }
    return Promise.reject(error)
  }
)

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await api.get('/health')
    return res.data?.status === 'ok'
  } catch {
    return false
  }
}

export default api
```

### A.3 SSE 解析器参考

> ⚠️ **已知问题**：以下 `parseSSELine` 函数只处理 `data:` 开头的行，**忽略了 `event:` 行**。Chat Completions 的 `hermes.tool.progress` 事件使用 `event: hermes.tool.progress\ndata: {JSON}\n\n` 格式，当前解析器会丢失事件类型信息。

```typescript
// src/api/chat.ts — 仅供参考，存在已知问题
import { getApiKey } from './auth'

export interface ChatEvent {
  type: string
  content?: string
  delta?: string
  tool_name?: string
  finish_reason?: string
  usage?: Record<string, number>
  [key: string]: any
}

export async function* sendChatCompletions(
  messages: Array<{ role: string; content: string }>,
  options?: { signal?: AbortSignal }
): AsyncGenerator<ChatEvent> {
  const response = await fetch('/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'hermes-agent',
      messages,
      stream: true,
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Chat API error: ${response.status} ${err}`)
  }

  yield* parseSSEStream(response, options?.signal)
}

async function* parseSSEStream(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<ChatEvent> {
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
        const event = parseSSELine(line)
        if (event) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function parseSSELine(line: string): ChatEvent | null {
  // ⚠️ 已知问题：未处理 event: 行，hermes.tool.progress 事件类型会丢失
  if (line.startsWith(':')) return null
  if (!line.startsWith('data: ')) return null

  const data = line.slice(6)
  if (data.trim() === '[DONE]') return { type: 'done' }

  try {
    return JSON.parse(data) as ChatEvent
  } catch {
    return null
  }
}
```

---

*本文档基于 Hermes Agent v0.11.0 源码分析编写，最后更新：2026-04-29*
