# 评审记录

## 当前任务
- 任务ID：TASK-20260424-007
- 任务名称：Runtime Prototypes: QwenPaw 直连聊天页界面能力补齐

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

---

## TASK-20260424-007 Chat-First 重构执行记录

- 执行时间：2026-04-24
- 执行人：Codex
- 执行状态：阶段内子项完成
- 执行结论：已将 QwenPaw 原型页重构为“聊天主区优先 + 右侧弱化侧栏”的 chat-first 主界面，未改动 shared 类型、SSE、认证和聊天流底层语义。

### 本次改动摘要

1. 聊天主区重构：
   - 新增 `ChatHeader` 与 `StatusSummary`
   - 原顶部大卡片压缩为 header 内轻量 summary
   - 错误提示合并进聊天头部，不再单独占整行空间

2. 消息流与输入区重构：
   - `MessageList` 去掉面板头部，只保留消息流与空状态
   - `ChatInput` 改为 chat composer，默认 3 行，自适应高度上限调整为 180px
   - 发送按钮升级为页面唯一高权重主按钮

3. 侧栏弱化与分组：
   - 新增 `RuntimeSidebar` / `SessionControls`
   - 登录区、会话控制、运行时配置分组清晰
   - 运行时配置默认折叠，保存/重置只在展开后出现

4. 全局样式重写：
   - `chat.css` 改为两栏 chat-first 布局
   - 背景、阴影、边框和颜色层级整体收敛
   - 增补桌面与窄屏断点，保证聊天区始终是主区域

### 受影响文件

- `runtime-prototypes/qwenpaw-chat/src/views/ChatView.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatHeader.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/StatusSummary.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/RuntimeSidebar.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/SessionControls.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/MessageList.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatInput.vue`
- `runtime-prototypes/qwenpaw-chat/src/styles/chat.css`
- `runtime-prototypes/qwenpaw-chat/src/types/chat-ui.ts`
- `docs/decisions/task-board.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/review-notes.md`

### 验证结果

- `npm.cmd run typecheck`：通过
- `npm.cmd run build`：通过
- `vite build` 产物：32 modules，`index-CBDQHk-G.css` 10.29 kB，`index-DXOhqnIP.js` 92.77 kB
- `git diff --check -- runtime-prototypes/qwenpaw-chat`：无 whitespace error，仅有 LF/CRLF 提示

### 残留说明

- `runtime-prototypes/qwenpaw-chat/src/composables/use-qwenpaw-chat-session.ts` 在执行前已存在未提交修改，本轮未改动其逻辑。
- `.env.local` 与真实 QwenPaw 服务的手工联调仍未执行，本轮验证范围仅覆盖类型检查与生产构建。

---

## TASK-20260424-007 QwenPaw Chat 行为对齐执行记录

- 执行时间：2026-04-24
- 执行人：Codex
- 执行状态：review_pending
- 执行结论：已按“行为对齐”口径完成 `runtime-prototypes/qwenpaw-chat` 的请求契约、会话状态、SSE 归并与消息渲染分层修正；原型页现已具备 `正式应答 / 思考过程 / 工具调用 / 工具结果` 的结构化展示基础。

### 本次改动摘要

1. 请求契约与会话语义对齐：
   - `runtime-prototypes/shared/qwenpaw-client.ts` 的 `sendQwenPawChat` 改为只发送当前最新一条 `user message`
   - 新增 per-conversation `session_id` 生成逻辑，不再默认复用静态 session
   - `clearConversation`、切换 agent、后端 `clear_history` 后均会切到新的 conversation session

2. 消息模型与流式归并重写：
   - `runtime-prototypes/shared/types.ts` 为 `ChatMessage` 增加 `sections`
   - `QwenPawStreamEvent` 增补 `content` / `data` / tool payload 类型
   - `use-qwenpaw-chat-session.ts` 以 runtime `msg_id` 为主键，分别归并 `reasoning`、`message`、`plugin_call`、`plugin_call_output` 及同类 function/mcp tool 事件
   - assistant 的 `content` 仅保留为“正式应答”镜像，不再承载全部流式真相

3. assistant 气泡渲染升级：
   - `MessageBubble.vue` 改为 assistant 分段渲染
   - `正式应答` 作为主回复直接展示，`思考过程 / 工具调用 / 工具结果` 通过折叠块展示
   - `ChatMessageList.vue` 的滚动跟踪改为覆盖 section 内容变化，避免只有 thinking/tool 更新时不自动滚动

### 受影响文件

- `runtime-prototypes/shared/types.ts`
- `runtime-prototypes/shared/qwenpaw-client.ts`
- `runtime-prototypes/qwenpaw-chat/src/composables/use-qwenpaw-chat-session.ts`
- `runtime-prototypes/qwenpaw-chat/src/components/MessageBubble.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatMessageList.vue`
- `runtime-prototypes/qwenpaw-chat/src/styles/chat.css`
- `docs/decisions/task-board.md`
- `docs/decisions/review-notes.md`

### 验证结果

- `npm.cmd run typecheck`：通过
- `npm.cmd run build`：通过
- 127.0.0.1:8088 latest-only 烟测：同一 `session_id` 连续发送 `Reply with APPLE only.` / `Reply with BANANA only.`，返回结果分别为 `APPLE` / `BANANA`
- 127.0.0.1:8088 tool/reasoning 烟测：可观测到 `reasoning`、`plugin_call`、`plugin_call_output` 与 `data` block；最终返回当前工作目录 `C:\\Users\\mowenbo\\.qwenpaw\\workspaces\\default`

### 残留说明

- 本轮未做浏览器内的人工点击验证，当前 UI 验证口径为 typecheck/build + 本地 API 烟测
- 远端 stop 仍保持 best-effort；未扩展到 `chat_id` 级别的完整停止契约

---

## TASK-20260424-007 聊天工作区界面能力补齐执行记录

- 执行时间：2026-04-27
- 执行人：Codex
- 执行状态：review_pending
- 执行结论：已将 `runtime-prototypes/qwenpaw-chat` 从“单会话文本聊天原型”扩展为接近控制台语义的聊天工作区，补齐了历史聊天、刷新恢复、Markdown 正式应答、附件上传、语音录制发送，以及“发送即停止”的主按钮交互。

### 本次改动摘要

1. 聊天工作区与历史恢复：
   - `runtime-prototypes/shared/types.ts` 补齐 `ChatSpec / ChatHistory / UploadedConsoleFile / RecordingState` 与富媒体消息块类型
   - `runtime-prototypes/shared/qwenpaw-client.ts` 新增 `listChats / getChatHistory / createChat / deleteChat / uploadConsoleFile / reconnectQwenPawChat`
   - `use-qwenpaw-chat-session.ts` 重构为工作区级状态管理，统一处理聊天列表、当前聊天、刷新恢复、删除切换和 running reconnect

2. Markdown 与富媒体消息渲染：
   - 新增 `runtime-prototypes/qwenpaw-chat/src/utils/render-markdown.ts`，用 `markdown-it` 处理正式应答 Markdown，并强制链接新开页签
   - `MessageBubble.vue` 改为统一渲染 `text / image / file / audio`，assistant 分段继续保留 `正式应答 / 思考过程 / 工具调用 / 工具结果`
   - `ChatMessageList.vue` 增加 skeleton、滚动跟随暂停与“回到底部”入口

3. Composer 与多模态输入：
   - `ChatInputBar.vue` 重构为真正的 composer，包含附件选择、上传队列、失败重试、删除、录音控制、录音预览与单一主按钮
   - 上传前端限制为 10MB，并兼容上传结果中的 `filename / file_name`
   - `MediaRecorder` 录音结果转为 `audio` 内容块，发送前可本地试听与移除

4. 发送/停止与侧栏管理：
   - `sendQwenPawChat` 从“文本单块请求”扩展为“多内容块单条 message 请求”，仍保持 latest-message-only 语义
   - `stopQwenPawChat` 改为携带真实 `chat_id`，发送中主按钮直接切换为停止
   - `ChatSidebar.vue` 改为“当前 Agent + 新建聊天 + 历史列表 + 登录 + 运行时配置”的工作区侧栏

### 受影响文件

- `runtime-prototypes/shared/types.ts`
- `runtime-prototypes/shared/qwenpaw-client.ts`
- `runtime-prototypes/shared/sse-handler.ts`
- `runtime-prototypes/qwenpaw-chat/package.json`
- `runtime-prototypes/qwenpaw-chat/package-lock.json`
- `runtime-prototypes/qwenpaw-chat/src/composables/use-qwenpaw-chat-session.ts`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatInputBar.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatMessageList.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/ChatSidebar.vue`
- `runtime-prototypes/qwenpaw-chat/src/components/MessageBubble.vue`
- `runtime-prototypes/qwenpaw-chat/src/views/ChatView.vue`
- `runtime-prototypes/qwenpaw-chat/src/styles/chat.css`
- `runtime-prototypes/qwenpaw-chat/src/utils/render-markdown.ts`
- `docs/decisions/task-board.md`
- `docs/decisions/review-notes.md`

### 验证结果

- `npm.cmd run typecheck`：通过
- `npm.cmd run build`：通过
- 127.0.0.1:8088 聊天管理烟测：创建聊天 -> 列表可见 -> 历史可读（空会话 0 条）-> 删除后列表消失
- 127.0.0.1:8088 上传烟测：`/console/upload` 返回工作区媒体路径与上传文件名
- 127.0.0.1:8088 历史结构核对：现有聊天历史可读出 `user / reasoning / assistant` 消息，并包含 Markdown 表格与长文本内容
- 127.0.0.1:8088 fresh stream 烟测：一次新建聊天后的即时发送命中 `response.failed (MODEL_EXECUTION_FAILED)`；该情况下历史仅落盘已提交的 `user` 消息，前端需依赖流式错误态而非历史回放

### 残留说明

- 本轮未做浏览器内人工点击验证，尤其未实测 `MediaRecorder`、Markdown 增量渲染体验、移动端布局与“发送即停止”的整套交互
- 远端 stop 已切到 `chat_id` 契约，但尚未针对一个稳定的长耗时 running chat 做端到端停止烟测

---

## 2026-04-27 QwenPaw chat bugfix: skill completion and upload removal
- executor: Codex
- status: review_pending
- scope:
  - `runtime-prototypes/shared/types.ts`
  - `runtime-prototypes/shared/qwenpaw-client.ts`
  - `runtime-prototypes/shared/sse-handler.ts`
  - `runtime-prototypes/qwenpaw-chat/src/composables/use-qwenpaw-chat-session.ts`
  - `runtime-prototypes/qwenpaw-chat/src/components/ChatInputBar.vue`
  - `docs/decisions/task-board.md`
  - `docs/decisions/review-notes.md`
- summary:
  - Added `response.output` typing and stream backfill so skill/tool replies can populate the assistant bubble even when the final answer is only present on the response envelope.
  - Added a local early-exit path for SSE consumption. The UI now keeps server terminal statuses as the primary completion signal, but if a renderable formal answer is already present and the stream stays silent for 1 second, the frontend closes the stream locally instead of staying in `streaming`.
  - History normalization now merges tool-result messages by message type, even when QwenPaw persists them with `role=system`.
  - Pending uploads can now be removed before send at any time. Each upload has its own `AbortController`, removal aborts the request immediately, and aborted uploads do not write an error state back into the composer.
  - Follow-up fix: pending upload status updates are now applied through the reactive object stored in `state.pendingUploads`, which fixes the case where the UI showed an attachment as ready but `canSubmit` still stayed stuck in the old `uploading` state.
  - Follow-up fix: file attachments in chat bubbles are now rendered as explicit attachment cards with filename fallback parsing, so uploaded files like `SKILL.md` remain readable inside the dark user bubble instead of blending into the old link color.
  - Follow-up fix: user chat bubbles now use a light gray surface with dark text, and the runtime config panel now shows the currently effective request entry plus proxy target so proxy-vs-direct routing is visible in the UI.
- validation:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
- residual risks:
  - No browser-side click-through verification was run in this turn, so `人员交接` still needs an end-to-end UI check against a live QwenPaw console session.
  - Multi-file selection plus rapid conversation reset was not stress-tested; the current fix covers direct removal and in-flight cancelation, which was the reported bug.

---

## 2026-04-27 QwenPaw chat bugfix: tool reply visibility
- executor: Codex
- status: review_pending
- scope:
  - `runtime-prototypes/shared/types.ts`
  - `runtime-prototypes/qwenpaw-chat/src/composables/use-qwenpaw-chat-session.ts`
  - `docs/decisions/task-board.md`
  - `docs/decisions/review-notes.md`
- summary:
  - Confirmed the live `127.0.0.1:8088` tool stream shape is `reasoning -> plugin_call -> plugin_call_output -> reasoning -> answer -> response.completed`, so the regression is on the frontend side rather than a protocol mismatch.
  - Narrowed the 1-second local completion fallback to cases where a formal answer is already renderable, preventing skill/tool turns from being closed early during the silence between tool output and final answer.
  - Stream callbacks now resolve and mutate the tracked reactive assistant message instance after `messages.push(...)` / reconnect recovery, so `thinking / tool / answer` sections reliably trigger Vue updates instead of only mutating the raw object reference.
  - Added compatibility for QwenPaw’s documented nested tool payload fields (`function_call`, `function_call_output`, `plugin_call`, `plugin_call_output`, `mcp_tool_call`, `mcp_tool_call_output`) and treat `message.type=assistant` as an answer section fallback.
- validation:
  - `Invoke-WebRequest` smoke against `http://127.0.0.1:8088/api/agents/default/console/chat` with `What time is it now in Shanghai?`; observed `plugin_call` / `plugin_call_output` plus final answer and `response.completed`
  - `node --max-old-space-size=4096 .\\node_modules\\vue-tsc\\bin\\vue-tsc.js --noEmit`
  - `node --max-old-space-size=4096 .\\node_modules\\vite\\bin\\vite.js build`
- residual risks:
  - No browser-side click-through verification was run in this turn, so the reported “tool call UI 不展示” case still needs a manual in-browser retest.
  - On this machine, `npm.cmd run typecheck` / `npm.cmd run build` still hit a Node wrapper OOM; direct `node --max-old-space-size=4096` invocations are currently the reliable verification path.

---

## 2026-04-27 QwenPaw integration guide sync
- executor: Codex
- status: review_pending
- scope:
  - `runtime-prototypes/Python接入QwenPaw聊天接口指南.md`
  - `docs/decisions/review-notes.md`
- summary:
  - Updated the integration guide’s SSE section to distinguish the official `function_call` example from the live local-console `plugin_call -> content.data -> plugin_call_output` stream shape observed on `127.0.0.1:8088`.
  - Expanded the event-handling example so future clients treat tool payload extraction and `response.output` backfill as first-class logic rather than incidental fallbacks.
  - Added explicit frontend/client constraints documenting the two regression-prone rules from this fix: do not locally complete on tool-only silence, and always mutate the tracked reactive assistant message instance instead of a detached object.
- validation:
  - Manual source inspection of `runtime-prototypes/Python接入QwenPaw聊天接口指南.md`
- residual risks:
  - The guide now reflects the currently observed local QwenPaw behavior, but other deployments may still emit `function_call`-style top-level payloads first; clients should keep both variants enabled.
