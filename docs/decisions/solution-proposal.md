# 方案提议

## 任务ID
TASK-20260423-003

## 任务名称
阶段2核心对齐 - 代码与契约枚举/命名统一

## 本次任务理解
阶段2的契约文档已详细落盘，后端骨架和前端类型均已到位。但代码中的枚举值和事件命名与契约真源存在3处关键偏差。本轮目标是修复这些偏差，完成"代码-契约对齐"。

## 当前真源是否足够
足够。

原因：
- 契约文档（docs/contracts/*.md）已详细定义了所有枚举值和事件族
- 后端三层（entity → dto → schema）和前端 types/gateway.ts 均可读取当前值
- 下游引用文件已通过搜索完整识别

## 冲突点 / 缺失点 / 风险点

### 偏差1：RequestStatus 缺少 `rejected`

**契约定义**（gateway-http-and-sse.md）：
7个状态：`accepted | streaming | waiting_confirmation | completed | failed | cancelled | rejected`

**代码实际**：6个状态，无 `rejected`

影响文件：
- `backend/app/core/entities/request.py`（entity 层）
- `backend/app/api/http/schemas/request.py`（schema 层）
- `backend/app/application/dto/request_dto.py`（dto 层）
- `frontend/src/types/gateway.ts`
- `frontend/src/types/chat.ts`（下游引用 RequestStatus）

### 偏差2：ConfirmationStatus `approved` → `confirmed`

**契约定义**（gateway-http-and-sse.md、tool-gateway.md）：
4个状态：`pending | confirmed | rejected | expired`
tool-gateway.md 第97行明确声明："不再使用 approved，统一改成 confirmed"

**代码实际**：5个状态，含 `approved` 和 `cancelled`，不含 `confirmed`

影响文件：
- `backend/app/core/entities/confirmation.py`（entity 层）
- `backend/app/api/http/schemas/confirmation.py`（schema 层）
- `backend/app/application/dto/confirmation_dto.py`（dto 层）
- `frontend/src/types/gateway.ts`
- `frontend/src/types/confirmation.ts`（下游引用 ConfirmationStatus）

附加考虑：
- `backend/app/api/http/schemas/confirmation.py` 中 `ApproveConfirmationSchema` 类名是否需改为 `ConfirmConfirmationSchema`（待确认契约是否有明确类名要求）
- `frontend/src/types/confirmation.ts` 中 `action: 'approve' | 'reject'` 是否需改为 `'confirm' | 'reject'`
- `frontend/src/types/gateway.ts` 中 `ApproveConfirmationPayload` 类型名是否需改

### 偏差3：StreamEventType 事件族命名完全不同

**契约定义**（gateway-http-and-sse.md）：
6个事件类型：
- `request.accepted`
- `response.delta`
- `response.completed`
- `confirmation.required`
- `request.status.changed`
- `request.terminal`

**代码实际**（stream_event.py、gateway.ts）：
6个事件类型，但命名完全不同：
- `message.delta` → 应为 `response.delta`
- `message.completed` → 应为 `response.completed`
- `confirmation.created` → 应为 `confirmation.required`
- `request.completed` → 应为 `request.terminal`（语义也不同）
- `request.failed` → 应为 `request.terminal`（terminal 包含 failed）
- `trace.notice` → 契约中无对应

影响文件：
- `backend/app/api/http/schemas/stream_event.py`
- `frontend/src/types/gateway.ts`

注意：契约的 `request.terminal` 是一个统一终态事件，`terminal_status` 字段为 `completed | failed | cancelled | rejected`，而代码中的 `request.completed` 和 `request.failed` 是分开的两个事件。这里不仅是命名差异，语义模型也有差异。本轮以契约为准。

## 推荐方案
采用"逐一偏差修复 + 全局残留检查"的方案：

1. **偏差1**：在3个后端文件和2个前端文件中加入 `rejected`，使 RequestStatus 与契约一致
2. **偏差2**：在3个后端文件和2个前端文件中将 `approved` 改为 `confirmed`，去掉 `cancelled`
3. **偏差3**：在后端 stream_event.py 和前端 gateway.ts 中将事件族全部替换为契约命名
4. 同步更新下游引用文件（confirmation.ts、chat.ts 中的类型引用无需改值，但需确认无隐式依赖旧值）
5. 全局搜索确认无旧命名残留

## 精确执行步骤

### 步骤1：修复 RequestStatus
1. `backend/app/core/entities/request.py` — 加 `REJECTED = "rejected"`
2. `backend/app/api/http/schemas/request.py` — 加 `REJECTED = "rejected"`
3. `backend/app/application/dto/request_dto.py` — Literal 中加 `"rejected"`
4. `frontend/src/types/gateway.ts` — RequestStatus 加 `| 'rejected'`

### 步骤2：修复 ConfirmationStatus
1. `backend/app/core/entities/confirmation.py` — `APPROVED = "approved"` → `CONFIRMED = "confirmed"`，去掉 `CANCELLED = "cancelled"`
2. `backend/app/api/http/schemas/confirmation.py` — 同步，`APPROVED` → `CONFIRMED`，去掉 `CANCELLED`
3. `backend/app/application/dto/confirmation_dto.py` — Literal 中 `"approved"` → `"confirmed"`，去掉 `"cancelled"`
4. `frontend/src/types/gateway.ts` — ConfirmationStatus 改为 `'pending' | 'confirmed' | 'rejected' | 'expired'`

### 步骤3：修复 StreamEventType
1. `backend/app/api/http/schemas/stream_event.py` — 替换全部6个枚举值：
   - `MESSAGE_DELTA` → `REQUEST_ACCEPTED = "request.accepted"`
   - `MESSAGE_COMPLETED` → `RESPONSE_DELTA = "response.delta"`（注意不是一一对应）
   - `CONFIRMATION_CREATED` → `RESPONSE_COMPLETED = "response.completed"`
   - `REQUEST_COMPLETED` → `CONFIRMATION_REQUIRED = "confirmation.required"`
   - `REQUEST_FAILED` → `REQUEST_STATUS_CHANGED = "request.status.changed"`
   - `TRACE_NOTICE` → `REQUEST_TERMINAL = "request.terminal"`
2. `frontend/src/types/gateway.ts` — StreamEventType 替换为契约的6个值

### 步骤4：检查下游引用
1. `frontend/src/types/confirmation.ts` — 检查 `action: 'approve' | 'reject'` 是否需改为 `'confirm' | 'reject'`
2. `frontend/src/types/chat.ts` — 确认 RequestStatus 引用无隐式依赖旧值
3. `backend/app/api/http/schemas/confirmation.py` — 检查 `ApproveConfirmationSchema` 是否需重命名

### 步骤5：全局残留检查
全仓搜索以下旧命名，确认除 docs/contracts/ 外无残留：
- `approved`（Confirmation 上下文中）
- `message.delta`
- `message.completed`
- `confirmation.created`
- `trace.notice`

## 需要 Codex 修改的文件清单
- `backend/app/core/entities/request.py`
- `backend/app/core/entities/confirmation.py`
- `backend/app/api/http/schemas/request.py`
- `backend/app/api/http/schemas/confirmation.py`
- `backend/app/api/http/schemas/stream_event.py`
- `backend/app/application/dto/request_dto.py`
- `backend/app/application/dto/confirmation_dto.py`
- `frontend/src/types/gateway.ts`
- `frontend/src/types/confirmation.ts`
- `frontend/src/types/chat.ts`（确认无隐式依赖）

## 不该做的事情
- 不改 docs/contracts/ 文档（契约是标准，不反向修改）
- 不改业务逻辑实现
- 不接真实 provider / runtime / workflow / HTTP / SSE
- 不改规则层文件（AGENTS.md、CLAUDE.md、README.md）
- 不改 ports / policies / adapters

## 验收标准
- RequestStatus 在后端三层和前端中与契约完全一致（7个状态）
- ConfirmationStatus 在后端三层和前端中与契约完全一致（4个状态，使用 confirmed）
- StreamEventType 在后端 schema 和前端中与契约完全一致（6个事件类型）
- 全仓搜索无旧命名残留（docs/contracts/ 除外）：
  - 无 `approved`（Confirmation 上下文）
  - 无 `message.delta`、`message.completed`
  - 无 `confirmation.created`
  - 无 `request.completed`、`request.failed`（作为 StreamEventType）
  - 无 `trace.notice`
- 前端下游文件已同步
- 未越过阶段2边界
