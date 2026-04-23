# 评审记录

## 当前任务
- 任务ID：TASK-20260423-003
- 任务名称：阶段2核心对齐 - 代码与契约枚举/命名统一

---

## TASK-20260423-002 收口记录

- 收口时间：2026-04-23
- 收口操作：Claude 读取真源后确认上一轮全部执行步骤已完成，将 task-status 从 review_pending 同步为 done
- 收口状态：done
- 收口结论：运行态真源已同步、decision-log.md 已建立、next-task-draft 判断结论已落盘

---

## TASK-20260423-003 启动记录

- 启动时间：2026-04-23
- 启动人：Claude
- 启动方式：读取真源后识别阶段2核心缺口，收敛为 TASK-003
- 任务目标：修复3处代码-契约枚举/命名偏差，完成阶段2"统一模型对齐"

### 偏差清单（启动时已确认）

1. **RequestStatus 缺少 `rejected`**
   - 契约：7个状态（含 rejected）
   - 代码：6个状态（无 rejected）
   - 影响：后端3个文件 + 前端2个文件

2. **ConfirmationStatus 用 `approved` 而非 `confirmed`**
   - 契约：4个状态 `pending | confirmed | rejected | expired`，明确声明"不再使用 approved"
   - 代码：5个状态，含 `approved` 和 `cancelled`，不含 `confirmed`
   - 影响：后端3个文件 + 前端2个文件

3. **StreamEventType 事件族命名完全不同**
   - 契约：`request.accepted / response.delta / response.completed / confirmation.required / request.status.changed / request.terminal`
   - 代码：`message.delta / message.completed / confirmation.created / request.completed / request.failed / trace.notice`
   - 影响：后端1个文件 + 前端1个文件

### 待执行
- 等待人工确认后交 Codex 执行

---

## TASK-20260423-003 Codex 执行记录

- 执行时间：2026-04-23
- 执行人：Codex
- 执行状态：review_pending
- 执行结论：已按契约真源完成后端/前端枚举与事件命名对齐，未引入真实 provider / runtime / workflow / HTTP / SSE / tool 调用链实现。

### 本次改动摘要

1. RequestStatus 对齐：
   - 后端 entity / schema / dto 均补齐 `rejected`
   - 前端 `frontend/src/types/gateway.ts` 补齐 `rejected`

2. ConfirmationStatus 对齐：
   - 后端 entity / schema / dto 均改为 `pending | confirmed | rejected | expired`
   - 前端 `frontend/src/types/gateway.ts` 同步改为 `pending | confirmed | rejected | expired`
   - 已移除 Confirmation 上下文中的旧 `approved` 和 `cancelled`

3. StreamEventType 对齐：
   - 后端 `backend/app/api/http/schemas/stream_event.py` 改为契约事件族
   - 前端 `frontend/src/types/gateway.ts` 同步改为契约事件族

### 受影响文件

- `backend/app/core/entities/request.py`
- `backend/app/api/http/schemas/request.py`
- `backend/app/application/dto/request_dto.py`
- `backend/app/core/entities/confirmation.py`
- `backend/app/api/http/schemas/confirmation.py`
- `backend/app/application/dto/confirmation_dto.py`
- `backend/app/api/http/schemas/stream_event.py`
- `frontend/src/types/gateway.ts`
- `docs/decisions/current-task.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/task-status.md`

### 下游引用检查

- `frontend/src/types/confirmation.ts`：仅透传 `ConfirmationStatus` 类型，未发现旧状态字面量分支，无需改动。
- `frontend/src/types/chat.ts`：仅透传 `RequestStatus` 类型，未发现旧状态字面量分支，无需改动。
- `ApproveConfirmationSchema` / `ApproveConfirmationPayload`：保留动作命名不变。原因是契约仍保留 `POST /confirmations/{id}/approve` 路径，本轮只调整状态值，不反向改接口动作名。

### 验证结果

- `backend/frontend` 旧命名搜索：0 个代码匹配。
- Confirmation 相关文件旧状态搜索：0 个代码匹配。
- `python` AST 解析：通过，已解析 21 个后端 Python 文件。
- `git diff --check`：通过；仅输出 Git 对 LF/CRLF 的换行提示，无 whitespace error。
- 项目根目录未发现 `package.json`、`pyproject.toml`、`requirements*.txt`，因此未运行前端 typecheck、后端 test/lint 等项目级命令。

### 残留说明

全仓排除 `docs/contracts/` 后，仍可在 `docs/decisions/*`、`docs/agents/*`、`docs/templates/*` 中搜索到旧词或 `approved_for_execution` 这类任务状态名。经核对，这些属于运行态任务描述、方案历史、模板或协作状态名，不是后端/前端代码枚举残留。

### 当前判断

- 当前阶段真源仍一致。
- 未发现阶段越界。
- 未发现需要阻塞执行的新增冲突。
- 建议进入 Claude 或人工复核；复核通过后可将 TASK-20260423-003 收口为 done。

---

## TASK-20260423-003 Claude 复核记录

- 复核时间：2026-04-23
- 复核人：Claude
- 复核结果：**通过**，收口为 done

### 逐项验证

| 偏差 | 验证方式 | 结果 |
|------|---------|------|
| RequestStatus +rejected | 读 entity/schema/dto/gateway.ts | 后端三层 + 前端均为 7 个状态 |
| ConfirmationStatus confirmed | 读 entity/schema/dto/gateway.ts | 后端三层 + 前端均为 4 个状态，无 approved/cancelled |
| StreamEventType 事件族 | 读 stream_event.py + gateway.ts | 后端 schema + 前端均为 6 个契约事件族命名 |

### 全局残留搜索（代码层）

| 搜索词 | 后端匹配数 | 前端匹配数 |
|--------|-----------|-----------|
| approved | 0 | 0 |
| message.delta / message.completed | 0 | 0 |
| confirmation.created | 0 | 0 |
| trace.notice | 0 | 0 |

### 下游引用检查
- confirmation.ts：仅透传类型，无旧值分支 ✅
- chat.ts：仅透传类型，无旧值分支 ✅
- ApproveConfirmationSchema：保留动作名，契约仍保留 /approve 路径 ✅

### 边界检查
- 未越过阶段2边界 ✅
- 未引入真实集成 ✅
- 未修改业务逻辑 ✅

---

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Claude
- 更新说明：TASK-002 收口 + TASK-003 执行记录 + Claude 复核通过
