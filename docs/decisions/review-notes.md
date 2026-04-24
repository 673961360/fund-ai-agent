# 评审记录

## 当前任务
- 任务ID：TASK-20260424-007
- 任务名称：Runtime Prototypes: QwenPaw 直连聊天页最小闭环

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

---

## TASK-20260423-004 启动记录

- 启动时间：2026-04-23
- 启动人：Claude
- 启动方式：读取真源后识别阶段2代码层骨架缺口，收敛为 TASK-004
- 任务目标：补齐 HTTP 路由骨架（10个端点）、WorkflowAdapter Mock 骨架、ToolGateway Mock 骨架、对齐 ToolCallRequest 字段

### 缺口清单（启动时已确认）

1. **HTTP 路由骨架缺失**
   - 契约：10个端点（sessions×3 / requests×3 / confirmations×4）
   - 代码：routes/ 目录为空
   - 影响：需新增 3 个路由文件 + 更新 __init__.py

2. **WorkflowAdapter Mock 骨架缺失**
   - 契约：4个方法（start / resume / cancel / get_status）
   - 代码：port 已定义，adapters/workflow/ 目录不存在
   - 影响：需新增 2 个文件（__init__.py + mock_adapter.py）

3. **ToolGateway Mock 骨架缺失**
   - 契约：4个方法（validate / authorize / execute / describe_tool）
   - 代码：port 已定义，adapters/tool/ 目录不存在
   - 影响：需新增 2 个文件（__init__.py + mock_gateway.py）

4. **ToolCallRequest 字段缺失**
   - 契约：10个字段（含 workflow_id / timeout_ms / idempotency_key）
   - 代码：ports/tool_gateway.py 仅7个字段
   - 影响：需修改 1 个文件

### 待执行
- 等待人工确认后交 Codex 执行

---

## TASK-20260423-004 Codex 执行记录

- 执行时间：2026-04-23
- 执行人：Codex
- 执行状态：review_pending
- 执行结论：已按契约真源完成阶段2骨架补齐，所有新增路由仅返回 501，占位适配器仅抛 `NotImplementedError`，未引入真实 provider / runtime / workflow / HTTP / SSE / tool 调用链实现。

### 本次改动摘要

1. HTTP 路由骨架：
   - 新增 sessions / requests / confirmations 3 个路由文件
   - 覆盖契约 Section 5 的 10 个端点
   - 所有端点均抛 501，占位说明留待阶段3或后续允许时实现

2. Mock 适配器骨架：
   - 新增 `MockWorkflowAdapter`，方法签名对齐 `WorkflowAdapter`
   - 新增 `MockToolGateway`，方法签名对齐 `ToolGateway`
   - 所有方法均抛 `NotImplementedError`

3. Port 字段对齐：
   - `ToolCallRequest` 补齐 `workflow_id / timeout_ms / idempotency_key`
   - 新字段均为可空默认值，不破坏现有构造方式

### 受影响文件

- `backend/app/api/http/routes/__init__.py`
- `backend/app/api/http/routes/sessions.py`
- `backend/app/api/http/routes/requests.py`
- `backend/app/api/http/routes/confirmations.py`
- `backend/app/adapters/workflow/__init__.py`
- `backend/app/adapters/workflow/mock_adapter.py`
- `backend/app/adapters/tool/__init__.py`
- `backend/app/adapters/tool/mock_gateway.py`
- `backend/app/ports/tool_gateway.py`
- `docs/decisions/current-task.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/task-status.md`

### 验证结果

- 任务相关 Python 文件 AST 解析：通过，已解析 9 个文件。
- 任务相关模块导入探测：通过，已导入 5 个新增/更新模块。
- HTTP 路由路径检查：10 个端点均已落到对应路由文件。
- Mock 方法检查：WorkflowAdapter 4 个方法、ToolGateway 4 个方法均抛 `NotImplementedError`。
- ToolCallRequest 字段检查：已包含契约要求的 `workflow_id / timeout_ms / idempotency_key`。
- 尾随空白检查：13 个任务相关文件通过。
- 阶段边界检查：未接真实 provider / runtime / workflow / HTTP / SSE / tool 调用链。

### 残留说明

- 本轮创建的是 FastAPI 路由骨架，但所有端点均为 501 占位，不承载业务逻辑；按 TASK-004 边界判断，不属于阶段2禁止的真实 HTTP handler。
- 项目根目录仍未发现 `package.json`、`pyproject.toml` 或 requirements 入口，因此未运行项目级 test/lint。

### 当前判断

- 当前阶段真源仍一致。
- 未发现阶段越界。
- 未发现需要阻塞执行的新增冲突。
- 建议进入 Claude 或人工复核；复核通过后可将 TASK-20260423-004 收口为 done。

---

## TASK-20260423-004 Claude 复核记录

- 复核时间：2026-04-23
- 复核人：Claude
- 复核结果：**通过**，收口为 done

### 逐项验证

| 验收项 | 验证方式 | 结果 |
|--------|---------|------|
| HTTP 路由 10 端点 | 读 sessions.py / requests.py / confirmations.py | sessions×3 / requests×3 / confirmations×4 全部覆盖 |
| routes/__init__.py | 读文件 | 已导出 3 模块 + mount_routes(app) |
| WorkflowAdapter Mock | 读 mock_adapter.py | 4 方法均抛 NotImplementedError，签名一致 |
| ToolGateway Mock | 读 mock_gateway.py | 4 方法均抛 NotImplementedError，签名一致 |
| 适配器 __init__.py | Glob 检查 | workflow/ 和 tool/ 均存在 |
| ToolCallRequest 字段 | 读 tool_gateway.py | workflow_id / timeout_ms / idempotency_key 已补齐 |

### 边界检查
- 未越过阶段2边界 ✅
- 未引入真实集成 ✅
- 未修改业务逻辑 ✅

---

## TASK-20260423-004 收口记录

- 收口时间：2026-04-23
- 收口操作：Claude 读取真源后确认 TASK-004 全部执行步骤已完成，将 task-status 从 review_pending 同步为 done
- 收口状态：done
- 收口结论：HTTP 路由骨架 10 端点覆盖、MockWorkflowAdapter / MockToolGateway 骨架已创建、ToolCallRequest 字段对齐、Python AST 解析通过

---

## TASK-20260423-005 启动记录

- 启动时间：2026-04-23
- 启动人：Claude
- 启动方式：TASK-004 收口后判断 M2 已全部退出，启动 M3 进入评估
- 任务目标：M2 收口确认 + M3 进入评估结论落盘 + 如需进入发布 M3 首个任务方案

### M2 退出条件核对

| # | 退出条件 | 状态 |
|---|---------|------|
| 1 | 五类核心资源统一模型代码与契约对齐 | ✅ TASK-003 |
| 2 | 状态枚举与流转文档已补齐 | ✅ 契约文档 |
| 3 | Tool Gateway 契约已细化 | ✅ tool-gateway.md |
| 4 | Workflow Adapter 契约已细化 | ✅ workflow-adapter.md |
| 5 | 最小闭环联调路径已定义清楚 | ✅ stage-2-minimal-loop-definition.md |
| 6 | HTTP 路由骨架 10 端点已创建 | ✅ TASK-004 |
| 7 | MockRuntimeAdapter / MockWorkflowAdapter / MockToolGateway 骨架已创建 | ✅ TASK-003/004 |
| 8 | 未引入真实集成 | ✅ 代码审查确认 |

M2 **全部满足**，可视为退出。

### M3 进入条件评估

| 条件 | 当前状态 | 缺口 |
|------|---------|------|
| M2 已全部退出 | ✅ | 无 |
| MockRuntimeAdapter 可接收请求并返回占位流事件 | 仅抛 NotImplementedError | 需实现最小 mock 逻辑 |
| 前端可发起请求并收到 SSE 占位响应 | HTTP 路由为 501 | 需实现 mock SSE handler |
| Request 状态可从 accepted 流转至 terminal | 无状态机 | 需最小状态推进逻辑 |
| Confirmation 占位链路可工作 | 仅 schema | 需最小 mock 逻辑 |
| 端到端演示可在本机完成 | 无 | 需全链路 mock 串联 |

### 待执行
- 收敛 M3 首个任务方案（MockRuntimeAdapter 最小 mock 逻辑 + SSE handler + 状态推进）

---

## TASK-20260423-006 启动记录

- 启动时间：2026-04-23
- 启动人：Claude
- 启动方式：TASK-005 收口后探查项目状态，识别基础设施缺口，收敛为 TASK-006
- 任务目标：补齐依赖管理与应用入口，实现 MockRuntimeAdapter 最小 mock 逻辑，打通无确认路径

### 缺口清单（启动时已确认）

1. **后端依赖与入口缺失**
   - 无 pyproject.toml / requirements.txt / main.py
   - 无法启动服务
   - 影响：需新增 3 个文件（pyproject.toml + main.py + README.md）

2. **MockRuntimeAdapter 仅为 NotImplementedError**
   - submit / stream / cancel / describe_capabilities 全部抛错
   - 无法产生任何事件流
   - 影响：需实现最小 mock 逻辑（submit 返回受理结果，stream 产生 4 类事件）

3. **HTTP 路由全部返回 501**
   - POST /requests 无实际处理逻辑
   - GET /requests/{id}/events 无法返回 SSE
   - 影响：需实现 requests.py 的 2 个核心端点

4. **前端 API 客户端抛错误**
   - GatewayHttpClient.get()/post() 直接抛 TODO(stage-2)
   - 前端无法发出任何真实请求
   - 影响：需改为真实 fetch 请求

### 待执行
- 等待人工确认后交 Codex 执行

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Codex
- 更新说明：完成 TASK-004 骨架补齐执行记录与验证回写

---

## TASK-20260424-007 Phase 1 评审记录

- 评审时间：2026-04-24
- 评审人：Claude
- 评审结果：**通过**，Phase 1 搭建完成，待人工配置 `.env.local` 后手动测试流式通路

### 逐项验证

| 验收项 | 验证方式 | 结果 |
|--------|---------|------|
| 目录骨架 | README.md + shared/ 存在 | ✅ |
| 项目配置 | package.json / vite.config.ts / tsconfig / index.html / .env.example / .gitignore | ✅ |
| Vue 组件 | ChatView / ChatInput / MessageList / MessageBubble / use-chat-stream / chat.css | ✅ |
| Shared 层 | types / qwenpaw-client / sse-handler | ✅ |
| Typecheck | vue-tsc --noEmit | ✅ 0 错误 |
| Build | vite build | ✅ 22 modules, 72.68 kB (gzipped 28.61 kB) |
| .gitignore | node_modules / dist / .env 排除 | ✅ |
| Vite proxy | fs.allow + proxy rewrite | ✅ |
| 流式解析 | SSE / JSON / NDJSON 3 格式 + 回退 | ✅ |
| 状态管理 | loading / error / empty | ✅ |
| AbortController | 取消 + 组件卸载清理 | ✅ |

### 边界检查
- 未触碰主线 frontend/ 或 backend/ ✅
- 原型代码隔离在 runtime-prototypes/ 内 ✅
- 未引入主线依赖 ✅
