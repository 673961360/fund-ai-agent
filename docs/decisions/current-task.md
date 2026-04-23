# 当前任务

## 任务ID
TASK-20260423-003

## 任务名称
阶段2核心对齐 - 代码与契约枚举/命名统一

## 任务状态
done

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
阶段2的契约文档（docs/contracts/*.md）已完成详细定义，后端骨架代码和前端类型文件均已到位。但代码中的枚举值、事件命名与契约真源存在3处关键偏差，尚未完成"统一模型对齐"这一阶段2核心目标。

具体偏差：

1. **RequestStatus 缺少 `rejected`**：契约定义7个状态（含 rejected），代码只有6个
2. **ConfirmationStatus 用 `approved` 而非契约中的 `confirmed`**：契约明确写"不再使用 approved，统一改成 confirmed"，且契约不含 `cancelled`
3. **StreamEvent 事件族命名完全不同**：契约为 `request.accepted / response.delta / response.completed / confirmation.required / request.status.changed / request.terminal`，代码为 `message.delta / message.completed / confirmation.created / request.completed / request.failed / trace.notice`

如果不修复这些偏差，阶段2的"代码-契约对齐"完成标准无法达成，也无法进入阶段3 mock联调。

## 任务目标
以契约文档（docs/contracts/*.md）为真源，将后端和前端代码中的枚举值、事件命名统一到契约口径。修改范围仅限枚举值和命名对齐，不涉及业务逻辑实现。

## 当前阶段
阶段 2：统一模型、契约对齐、最小联调准备

## 阶段边界摘要
当前阶段允许：
- 统一模型定义、契约对齐
- 枚举值、命名、状态流转的代码层同步
- 不接真实 provider / runtime / workflow / HTTP / SSE

当前阶段不允许：
- 真实 provider / runtime / workflow / tool / HTTP / SSE 集成
- 业务逻辑实现
- 大规模重构

## 本轮只做
- 修复 RequestStatus：加 `rejected`，后端三层（entity → dto → schema）+ 前端 types/gateway.ts 同步
- 修复 ConfirmationStatus：`approved` → `confirmed`，去掉 `cancelled`，后端三层 + 前端同步
- 修复 StreamEventType：对齐到契约事件族（request.accepted / response.delta / response.completed / confirmation.required / request.status.changed / request.terminal），后端 schema + 前端同步
- 同步前端下游引用文件（confirmation.ts、chat.ts）
- 同步后端下游引用（ApproveConfirmationSchema 命名是否需跟随契约调整）

## 本轮不做
- 不改业务逻辑实现
- 不接真实 provider / runtime / workflow / HTTP / SSE
- 不改 docs/contracts/ 文档（以契约为真源，不反向修改契约）
- 不改 docs/project/、docs/phases/、docs/demo/
- 不改 AGENTS.md、CLAUDE.md、README.md 等规则层

## 第一优先级真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`

## 本轮依赖真源（契约作为对齐标准）
- `docs/contracts/gateway-http-and-sse.md`（StreamEvent 族、ConfirmationStatus、RequestStatus）
- `docs/contracts/tool-gateway.md`（ConfirmationStatus 明确声明 "不再使用 approved"）
- `docs/contracts/runtime-adapter.md`（RuntimeStreamEvent 事件族与 Gateway 保持兼容）

## 允许修改文件

### 偏差1：RequestStatus 加 `rejected`
- `backend/app/core/entities/request.py`
- `backend/app/api/http/schemas/request.py`
- `backend/app/application/dto/request_dto.py`
- `frontend/src/types/gateway.ts`
- `frontend/src/types/chat.ts`（下游引用 RequestStatus）

### 偏差2：ConfirmationStatus `approved` → `confirmed`，去掉 `cancelled`
- `backend/app/core/entities/confirmation.py`
- `backend/app/api/http/schemas/confirmation.py`
- `backend/app/application/dto/confirmation_dto.py`
- `frontend/src/types/gateway.ts`
- `frontend/src/types/confirmation.ts`（下游引用 ConfirmationStatus）

### 偏差3：StreamEventType 对齐契约事件族
- `backend/app/api/http/schemas/stream_event.py`
- `frontend/src/types/gateway.ts`

### 可能涉及的命名调整
- `backend/app/api/http/schemas/confirmation.py` 中的 `ApproveConfirmationSchema` 是否需跟随改为 `ConfirmConfirmationSchema`（以契约为准，检查契约是否有明确命名要求）

### 运行态文件
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`

## 禁止修改文件
- `docs/contracts/**`（契约是本轮对齐标准，不反向修改）
- `docs/project/**`
- `docs/phases/**`
- `docs/demo/**`
- `AGENTS.md`、`CLAUDE.md`、`README.md`
- `docs/agents/*.md`
- `backend/app/adapters/**`（mock adapter 不在本轮范围）
- `backend/app/core/ports/**`（ports 不在本轮范围）
- `backend/app/core/policies/**`（policies 不在本轮范围）

## 前置条件
- 契约文档（docs/contracts/*.md）已详细定义，可作为对齐标准
- 后端骨架代码和前端类型文件已全部到位
- 上一轮文档同步收口任务已完成

## 执行方式
Codex 按真源执行允许范围内的枚举/命名修改。

## 完成判定
- RequestStatus 在后端三层（entity → dto → schema）和前端 types/gateway.ts 中包含 `rejected`，且与契约定义的7个状态完全一致
- ConfirmationStatus 在后端三层和前端中使用 `confirmed`（不是 `approved`），不包含 `cancelled`，且与契约定义的4个状态完全一致
- StreamEventType 在后端 schema 和前端 types/gateway.ts 中使用契约事件族命名（request.accepted / response.delta / response.completed / confirmation.required / request.status.changed / request.terminal）
- 前端下游引用文件（confirmation.ts、chat.ts）已同步更新
- 全仓不再残留 `approved`、`message.delta`、`message.completed`、`confirmation.created`、`request.completed`、`request.failed`、`trace.notice` 等旧命名（docs/contracts/ 除外）
- 未越过阶段2边界
- 未修改业务逻辑实现
- 运行态文件已回写

## 输出物要求
- 执行结果：`docs/decisions/review-notes.md`
- 进度更新：`docs/decisions/task-status.md`

## 风险提示
- StreamEventType 改名后，如果有组件或 composable 使用了字符串字面量匹配旧事件名，会形成隐式断裂（需全局搜索确认）
- ConfirmationStatus 去掉 `cancelled` 后，如果有代码分支处理了 `cancelled` 状态，需同步移除
- 后端 ApproveConfirmationSchema 类名如果保留 `Approve`，与 `confirmed` 状态可能造成理解混淆

## 验收关注点
- 三处偏差是否全部修复
- 后端三层（entity → dto → schema）是否内部一致
- 前端 types/gateway.ts 是否与后端 schemas 一致
- 前端下游文件是否同步更新
- 全仓是否无旧命名残留
- 是否未越阶段2边界

## 交接说明
- 本轮由 Codex 按真源执行枚举/命名对齐
- 执行完成后由 Claude 或人工复核
- 复核通过后，阶段2"代码-契约对齐"可视为完成，准备进入阶段3 mock联调

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Codex
- 更新说明：已完成允许范围内的枚举/命名代码对齐，进入复核状态
