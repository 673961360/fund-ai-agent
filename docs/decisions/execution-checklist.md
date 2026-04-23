# 执行清单

## 任务ID
TASK-20260423-003

## 任务名称
阶段2核心对齐 - 代码与契约枚举/命名统一

## 执行前检查
- [x] 已阅读 `AGENTS.md`
- [x] 已阅读 `docs/phases/stage-2-deliverables.md`
- [x] 已阅读 `docs/decisions/current-task.md`
- [x] 已阅读 `docs/decisions/solution-proposal.md`
- [x] 已阅读 `docs/contracts/gateway-http-and-sse.md`（对齐标准）
- [x] 已阅读 `docs/contracts/tool-gateway.md`（ConfirmationStatus 声明）
- [x] 已阅读 `docs/contracts/runtime-adapter.md`（RuntimeStreamEvent 事件族）
- [x] 已阅读本轮涉及的所有后端和前端文件

## 本轮允许修改文件
- [x] `backend/app/core/entities/request.py`
- [x] `backend/app/core/entities/confirmation.py`
- [x] `backend/app/api/http/schemas/request.py`
- [x] `backend/app/api/http/schemas/confirmation.py`
- [x] `backend/app/api/http/schemas/stream_event.py`
- [x] `backend/app/application/dto/request_dto.py`
- [x] `backend/app/application/dto/confirmation_dto.py`
- [x] `frontend/src/types/gateway.ts`
- [x] `frontend/src/types/confirmation.ts`（已检查，无需修改）
- [x] `frontend/src/types/chat.ts`（已检查，无需修改）

## 步骤1：修复 RequestStatus — 加 `rejected`
- [x] `backend/app/core/entities/request.py` — 加 `REJECTED = "rejected"`
- [x] `backend/app/api/http/schemas/request.py` — 加 `REJECTED = "rejected"`
- [x] `backend/app/application/dto/request_dto.py` — Literal 加 `"rejected"`
- [x] `frontend/src/types/gateway.ts` — RequestStatus 加 `| 'rejected'`

## 步骤2：修复 ConfirmationStatus — `approved` → `confirmed`，去掉 `cancelled`
- [x] `backend/app/core/entities/confirmation.py` — `APPROVED = "approved"` → `CONFIRMED = "confirmed"`，删 `CANCELLED = "cancelled"`
- [x] `backend/app/api/http/schemas/confirmation.py` — 同上
- [x] `backend/app/application/dto/confirmation_dto.py` — `"approved"` → `"confirmed"`，删 `"cancelled"`
- [x] `frontend/src/types/gateway.ts` — ConfirmationStatus 改为 `'pending' | 'confirmed' | 'rejected' | 'expired'`

## 步骤3：修复 StreamEventType — 对齐契约事件族
- [x] `backend/app/api/http/schemas/stream_event.py` — 替换全部枚举值为契约命名：
  - `REQUEST_ACCEPTED = "request.accepted"`
  - `RESPONSE_DELTA = "response.delta"`
  - `RESPONSE_COMPLETED = "response.completed"`
  - `CONFIRMATION_REQUIRED = "confirmation.required"`
  - `REQUEST_STATUS_CHANGED = "request.status.changed"`
  - `REQUEST_TERMINAL = "request.terminal"`
- [x] `frontend/src/types/gateway.ts` — StreamEventType 替换为契约的6个值

## 步骤4：检查下游引用与附加命名
- [x] `frontend/src/types/confirmation.ts` — 已检查，契约仍保留 approve 动作路径，暂不改为 `confirm`
- [x] `frontend/src/types/chat.ts` — 已确认无对旧 RequestStatus 值的隐式依赖
- [x] `backend/app/api/http/schemas/confirmation.py` — 已检查，`ApproveConfirmationSchema` 保留动作名
- [x] `frontend/src/types/gateway.ts` — 已检查，`ApproveConfirmationPayload` 保留动作名

## 步骤5：全局残留检查
- [x] 后端/前端代码搜索 `approved`（Confirmation 上下文），确认无残留
- [x] 后端/前端代码搜索 `message.delta`、`message.completed`，确认无残留
- [x] 后端/前端代码搜索 `confirmation.created`，确认无残留
- [x] 后端/前端代码搜索 `request.completed`、`request.failed`（StreamEventType 上下文），确认无残留
- [x] 后端/前端代码搜索 `trace.notice`，确认无残留
- [x] 全仓排除 `docs/contracts/` 后的文档历史残留已记录在 `review-notes.md`

## 步骤6：自检与回写
- [x] 后端 entity → dto → schema 三层是否内部一致
- [x] 前端 types/gateway.ts 是否与后端 schemas 一致
- [x] 未越过阶段2边界
- [x] 回写 `review-notes.md`
- [x] 回写 `task-status.md`

## 本轮禁止项
- [x] 不修改 docs/contracts/**
- [x] 不修改 docs/project/**
- [x] 不修改 docs/phases/**
- [x] 不修改 AGENTS.md、CLAUDE.md、README.md
- [x] 不修改 backend/app/adapters/**
- [x] 不修改 backend/app/core/ports/**
- [x] 不修改 backend/app/core/policies/**
- [x] 不接真实 provider / runtime / workflow / HTTP / SSE

## 执行完成后必须输出
- [x] 本次改动摘要
- [x] 受影响文件清单
- [x] 当前真源是否仍一致
- [x] 是否引入了新冲突
- [x] 全局残留检查结果
- [x] 下一步建议

## 完成判定
- [x] RequestStatus 后端三层 + 前端与契约一致（7个状态）
- [x] ConfirmationStatus 后端三层 + 前端与契约一致（4个状态，用 confirmed）
- [x] StreamEventType 后端 schema + 前端与契约一致（6个事件类型）
- [x] 后端/前端代码无旧命名残留；文档历史残留已说明
- [x] 未引入阶段2越界内容
