# Gateway HTTP 与 SSE 契约（Stage 1 真源）

## 1. 文档定位

本文档是阶段 1 的首要协议真源，用于定义前后端共享的资源命名、字段占位、HTTP 路径草案与流事件模型。

阶段 1 只固化契约，不代表网关已完成真实实现。

---

## 2. 资源模型

阶段 1 固化以下资源：

- `Session`
- `Message`
- `Request`
- `StreamEvent`
- `Confirmation`

---

## 3. 字段约定

### 3.1 通用字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 资源主键 |
| `request_id` | `string` | 请求主键，适用于请求与流事件 |
| `trace_id` | `string` | 主链路追踪标识 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime)` | 更新时间 |

### 3.2 Session

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | session 主键 |
| `title` | `string \| null` | 会话标题，占位字段 |
| `status` | `"active" \| "archived"` | 会话状态 |
| `last_message_preview` | `string \| null` | 最近消息摘要 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime)` | 更新时间 |

### 3.3 Message

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | message 主键 |
| `session_id` | `string` | 所属会话 |
| `request_id` | `string \| null` | 来源请求，可空 |
| `role` | `"user" \| "assistant" \| "system" \| "tool"` | 消息角色 |
| `content` | `string` | 阶段 1 仅保留纯文本占位 |
| `attachments` | `AttachmentPlaceholder[]` | 附件入口占位 |
| `created_at` | `string(datetime)` | 创建时间 |

### 3.4 Request

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | request 主键 |
| `session_id` | `string` | 所属会话 |
| `user_message_id` | `string` | 用户消息主键 |
| `status` | `"accepted" \| "streaming" \| "waiting_confirmation" \| "completed" \| "failed" \| "cancelled"` | 请求状态 |
| `confirmation_id` | `string \| null` | 关联确认对象 |
| `trace_id` | `string` | 追踪标识 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime)` | 更新时间 |

### 3.5 StreamEvent

| 字段 | 类型 | 说明 |
|------|------|------|
| `request_id` | `string` | 对应请求 |
| `event_id` | `string` | 事件主键 |
| `event_type` | `string` | 事件类型 |
| `timestamp` | `string(datetime)` | 事件时间 |
| `payload` | `object` | 事件载荷 |
| `trace_id` | `string` | 追踪标识 |

建议保留的 `event_type` 占位值：

- `message.delta`
- `message.completed`
- `confirmation.created`
- `request.completed`
- `request.failed`
- `trace.notice`

### 3.6 Confirmation

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | confirmation 主键 |
| `request_id` | `string` | 来源请求 |
| `session_id` | `string` | 所属会话 |
| `status` | `"pending" \| "approved" \| "rejected" \| "expired" \| "cancelled"` | 确认状态 |
| `title` | `string` | 确认标题 |
| `summary` | `string` | 确认摘要 |
| `risk_level` | `"low" \| "medium" \| "high"` | 风险等级占位 |
| `approver_id` | `string \| null` | 审批人，占位字段 |
| `reason` | `string \| null` | 结果说明 |
| `created_at` | `string(datetime)` | 创建时间 |
| `expires_at` | `string(datetime) \| null` | 过期时间 |
| `resolved_at` | `string(datetime) \| null` | 处理完成时间 |

---

## 4. 附件占位模型

`AttachmentPlaceholder`

| 字段 | 类型 | 说明 |
|------|------|------|
| `attachment_id` | `string` | 附件主键 |
| `file_name` | `string` | 文件名 |
| `media_type` | `string \| null` | MIME 类型，占位字段 |
| `file_size_bytes` | `number \| null` | 文件大小，占位字段 |

阶段 1 不定义真实上传协议。

---

## 5. HTTP 路径草案

### 5.1 Session

- `GET /sessions`
- `GET /sessions/{session_id}`
- `GET /sessions/{session_id}/messages`

### 5.2 Request

- `POST /requests`
- `GET /requests/{request_id}`
- `GET /requests/{request_id}/events`

### 5.3 Confirmation

- `GET /confirmations/{confirmation_id}`
- `POST /confirmations/{confirmation_id}/approve`
- `POST /confirmations/{confirmation_id}/reject`

### 5.4 内部或测试用途

- `POST /confirmations`

说明：

- 该接口用于 `internal/admin/test use`
- 默认不属于前端直接调用路径
- 正常链路下应由 Gateway 在请求处理中自动创建 confirmation

---

## 6. 请求体草案

### 6.1 `POST /requests`

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | `string \| null` | 可为空，表示由网关创建新会话 |
| `content` | `string` | 用户输入内容 |
| `attachments` | `AttachmentPlaceholder[]` | 附件占位 |
| `client_context` | `object \| null` | 前端上下文占位 |

### 6.2 `POST /confirmations/{id}/approve`

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `comment` | `string \| null` | 审批备注占位 |

### 6.3 `POST /confirmations/{id}/reject`

建议字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `reason` | `string` | 拒绝原因 |

---

## 7. SSE 约束

阶段 1 仅固化以下字段：

- `request_id`
- `event_id`
- `event_type`
- `timestamp`
- `payload`
- `trace_id`

阶段 1 不实现真实 SSE 行为，仅定义事件模型与字段。

---

## 8. 默认假设

- session 持久化方式待定，本阶段按内存占位描述
- confirmation 默认由 Gateway 创建
- 附件协议待定，仅作为消息输入入口占位

---

## 9. TODO

- TODO：明确 `GET /requests/{request_id}` 的响应模型细节
- TODO：明确消息内容块是否需要扩展为多模态数组
- TODO：明确分页、筛选与排序参数
- TODO：明确错误模型与统一响应包裹格式

