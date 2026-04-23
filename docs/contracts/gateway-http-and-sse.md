# Gateway HTTP 与 SSE 契约（Stage 2 真源）

## 1. 文档定位

本文档是阶段 2 的首要协议真源，用于定义前后端共享的资源命名、字段约束、状态语义、HTTP 路径草案与流事件模型。

阶段 2 只细化契约与模型，不代表网关已完成真实实现。

---

## 2. 资源模型

阶段 2 固化以下资源：

- `Session`
- `Message`
- `Request`
- `StreamEvent`
- `Confirmation`

---

## 3. 字段约定

### 3.1 通用字段与统一约束

统一约束：

- 所有资源 `id` 均为不透明字符串，不在阶段 2 固化生成策略
- 所有时间字段统一使用带时区的 `string(datetime)`，推荐按 RFC3339 / ISO8601 语义理解
- 列表资源默认使用 `{ items: [...] }` 包裹
- 文档真源中的 snake_case 命名优先于其他占位表达

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 资源主键 |
| `request_id` | `string` | 请求主键，适用于请求与流事件 |
| `trace_id` | `string` | 主链路追踪标识 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime) \| null` | 更新时间，按资源类型可为空 |

### 3.2 Session

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | session 主键 |
| `title` | `string \| null` | 会话标题，占位字段 |
| `status` | `"active" \| "archived"` | 会话状态 |
| `last_message_preview` | `string \| null` | 最近消息摘要 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime) \| null` | 更新时间 |

阶段 2 约束：

- `active -> archived` 为当前唯一固化状态流转
- 是否允许从 `archived` 恢复到 `active` 仍待后续阶段确认

### 3.3 Message

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | message 主键 |
| `session_id` | `string` | 所属会话 |
| `request_id` | `string \| null` | 来源请求，可空 |
| `role` | `"user" \| "assistant" \| "system" \| "tool"` | 消息角色 |
| `content` | `string` | 阶段 2 仍仅保留纯文本占位 |
| `attachments` | `AttachmentPlaceholder[]` | 附件入口占位 |
| `created_at` | `string(datetime)` | 创建时间 |

阶段 2 约束：

- `Message` 当前不单独定义状态枚举
- `Message` 的生命周期由所属 `Request` 与 `StreamEvent` 推进语义间接体现

### 3.4 Request

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | request 主键 |
| `session_id` | `string` | 所属会话 |
| `user_message_id` | `string` | 用户消息主键 |
| `status` | `"accepted" \| "streaming" \| "waiting_confirmation" \| "completed" \| "failed" \| "cancelled" \| "rejected"` | 请求状态 |
| `confirmation_id` | `string \| null` | 关联确认对象 |
| `trace_id` | `string` | 追踪标识 |
| `created_at` | `string(datetime)` | 创建时间 |
| `updated_at` | `string(datetime) \| null` | 更新时间 |

阶段 2 状态约束：

- `accepted`：网关已受理请求，允许进入流式处理或确认等待
- `streaming`：请求正在产生消息增量或处理中间事件
- `waiting_confirmation`：请求已被确认边界拦截，等待 `Confirmation` 结果
- `completed`：请求已完成且进入终态
- `failed`：请求因错误进入终态
- `cancelled`：请求被主动取消并进入终态
- `rejected`：请求因确认拒绝进入终态

阶段 2 请求终态边界：

- `completed`
- `failed`
- `cancelled`
- `rejected`

补充边界：

- `expired` 只属于 `ConfirmationStatus`，不属于 `Request` 终态
- `response.completed` 不等于 `Request` 终态，真正进入终态以 `request.terminal` 为准

阶段 2 请求状态流转：

- `accepted -> streaming | waiting_confirmation | completed | failed | cancelled | rejected`
- `streaming -> waiting_confirmation | completed | failed | cancelled | rejected`
- `waiting_confirmation -> accepted | streaming | completed | failed | cancelled | rejected`
- `completed | failed | cancelled | rejected` 为终态

补充约束：

- 当请求处于 `waiting_confirmation` 时，`confirmation_id` 必须非空
- `confirmation_id` 一旦建立，可在请求终态后继续保留为留痕引用

### 3.5 StreamEvent

| 字段 | 类型 | 说明 |
|------|------|------|
| `request_id` | `string` | 对应请求 |
| `event_id` | `string` | 事件主键 |
| `event_type` | `string` | 事件类型 |
| `timestamp` | `string(datetime)` | 事件时间 |
| `payload` | `object` | 事件载荷 |
| `trace_id` | `string` | 追踪标识 |

阶段 2 固化的 `event_type` 族：

- `request.accepted`
- `response.delta`
- `response.completed`
- `confirmation.required`
- `request.status.changed`
- `request.terminal`

阶段 2 事件语义：

- `request.accepted`：请求已被系统受理
- `response.delta`：响应增量事件
- `response.completed`：响应内容已完成，但不等于请求终态
- `confirmation.required`：请求已进入确认等待，需要创建或关联 `Confirmation`
- `request.status.changed`：请求状态发生变化
- `request.terminal`：请求进入终态，`payload.terminal_status` 必须属于 `completed | failed | cancelled | rejected`

### 3.6 Confirmation

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | confirmation 主键 |
| `request_id` | `string` | 来源请求 |
| `session_id` | `string` | 所属会话 |
| `status` | `"pending" \| "confirmed" \| "rejected" \| "expired"` | 确认状态 |
| `title` | `string` | 确认标题 |
| `summary` | `string` | 确认摘要 |
| `risk_level` | `"low" \| "medium" \| "high"` | 风险等级占位 |
| `approver_id` | `string \| null` | 审批人，占位字段 |
| `reason` | `string \| null` | 结果说明 |
| `created_at` | `string(datetime)` | 创建时间 |
| `expires_at` | `string(datetime) \| null` | 过期时间 |
| `resolved_at` | `string(datetime) \| null` | 处理完成时间 |

阶段 2 状态约束：

- `pending -> confirmed | rejected | expired`
- `confirmed | rejected | expired` 为终态

默认映射约束：

- `confirmed`：允许关联 `Request` 从 `waiting_confirmation` 返回 `accepted` 或 `streaming`
- `rejected`：默认使关联 `Request` 进入 `rejected`
- `expired`：默认使关联 `Request` 进入 `cancelled`

---

## 4. 附件占位模型

`AttachmentPlaceholder`

| 字段 | 类型 | 说明 |
|------|------|------|
| `attachment_id` | `string` | 附件主键 |
| `file_name` | `string` | 文件名 |
| `media_type` | `string \| null` | MIME 类型，占位字段 |
| `file_size_bytes` | `number \| null` | 文件大小，占位字段 |

阶段 2 仍不定义真实上传协议。

---

## 5. HTTP 路径草案

### 5.1 Session

- `GET /sessions`
- `GET /sessions/{session_id}`
- `GET /sessions/{session_id}/messages`

列表资源统一原则：

- 阶段 2 的列表资源默认使用 `{ items: [...] }` 包裹，避免前后端各自推断返回形态
- 该约定仅用于固化占位接口面，不代表阶段 2 已完成真实分页、游标或元信息设计

对应返回形态约定：

- `GET /sessions` 返回 `{ items: Session[] }`
- `GET /sessions/{session_id}/messages` 返回 `{ items: Message[] }`
- `GET /sessions/{session_id}` 返回 `Session`

### 5.2 Request

- `POST /requests`
- `GET /requests/{request_id}`
- `GET /requests/{request_id}/events`

对应返回形态约定：

- `POST /requests` 返回当前 `Request` 快照，初始状态通常为 `accepted`
- `GET /requests/{request_id}` 返回 `Request`
- `GET /requests/{request_id}/events` 返回该请求对应的 `StreamEvent` 序列占位接口

### 5.3 Confirmation

- `GET /confirmations/{confirmation_id}`
- `POST /confirmations/{confirmation_id}/approve`
- `POST /confirmations/{confirmation_id}/reject`

对应返回形态约定：

- `GET /confirmations/{confirmation_id}` 返回 `Confirmation`
- `POST /confirmations/{confirmation_id}/approve` 返回更新后的 `Confirmation`
- `POST /confirmations/{confirmation_id}/reject` 返回更新后的 `Confirmation`

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

阶段 2 仅固化以下字段与事件家族：

- `request_id`
- `event_id`
- `event_type`
- `timestamp`
- `payload`
- `trace_id`

阶段 2 不实现真实 SSE 行为，仅定义事件模型、终态语义与事件字段。

---

## 8. 默认假设

- session 持久化方式待定，本阶段按内存占位描述
- confirmation 默认由 Gateway 创建
- 附件协议待定，仅作为消息输入入口占位
- Request 的首个可见状态默认为 `accepted`，不额外定义 `created`

---

## 9. TODO

- TODO：明确消息内容块是否需要扩展为多模态数组
- TODO：明确分页、筛选与排序参数
- TODO：明确错误模型与统一响应包裹格式
- TODO：在阶段 2 后续轮次中明确 `request.status.changed` 与 `request.terminal` 的最小 `payload` 字段
