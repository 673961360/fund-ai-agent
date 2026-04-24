# 当前任务

## 任务ID
TASK-20260423-006

## 任务名称
M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联

## 任务状态
approved_for_execution

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
TASK-20260423-003（核心对齐）和 TASK-20260423-004（骨架补齐）均已完成，M2 已全部退出。但当前项目处于"纯骨架"状态：无依赖管理、无应用入口、无法启动。所有路由返回 501，所有适配器抛 NotImplementedError。要进入 M3（最小闭环跑通），必须先补齐基础设施，再实现 MockRuntimeAdapter 最小 mock 逻辑，打通无确认路径。

**阶段切换确认**：AGENTS.md 已从"阶段 2"更新为"阶段 3"，第一优先级真源已补充 `docs/demo/stage-2-minimal-loop-definition.md` 和 `docs/project/milestones.md`。

## 任务目标
打通最小可演示路径：`POST /requests → request.accepted → response.delta* → response.completed → request.terminal`

前端可发起请求并接收 SSE 流式响应占位，不依赖任何外部服务。

## 当前阶段
阶段 3：最小闭环跑通（Mock-Only）

## 阶段边界摘要
当前阶段允许：
- MockRuntimeAdapter 实现最小可工作链路
- 前端可发起请求并接收 SSE 占位响应
- Decision Service 占位实现
- 依赖管理与应用入口补齐
- 仍不依赖真实 QwenPaw / 真实工具 / 真实外部系统

当前阶段不允许：
- 接入真实 QwenPaw / 真实工具 / 真实外部系统
- 生产写操作

## 修订记录（REVISE 反馈处理）

| # | 冲突点 | 处理方式 |
|---|--------|---------|
| 1 | 阶段边界冲突：AGENTS.md 仍声明阶段 2 | AGENTS.md 已更新为阶段 3，补充 M3 真源 |
| 2 | 任务状态 proposal_ready 未批准 | 本任务状态已推进至 approved_for_execution |
| 3 | 前端要求 fetch 但规范强制 axios 单例 | 修订为按 axios 单例 + 拦截器实现 |
| 4 | POST /sessions 不在契约 HTTP 路径中 | 删除此端点，改为 POST /requests 内部处理 session_id=null 时创建 mock session |
| 5 | 前端 axios 实现缺少依赖落点 | 允许修改文件中补充 `frontend/package.json`（声明 axios 依赖） |
| 6 | project-brief.md 仍写阶段 2 | 已更新为阶段 3 |
| 7 | milestones.md 总览表仍写 M2 进行中/M3 未进入 | 已更新为 M2 已完成/M3 进行中 |
| 8 | project-brief.md 第 9 节仍指向 stage-2-deliverables.md 为当前边界，第 10 节仍写阶段 2 当前进行中 | 已改为指向阶段 3，当前边界改为 AGENTS.md + stage-2-minimal-loop-definition.md + milestones.md + current-task.md |
| 9 | milestones.md M2/M3 小节标题与第 7 节仍写"当前进行中"/"未进入"/"评估进入" | 已同步更新为 M2 已完成/M3 进行中，第 7 节更新为 TASK-006 已批准 |

## 本轮只做

### 第一部分：后端依赖与入口补齐
- 创建 `backend/pyproject.toml`（fastapi + uvicorn[standard] + pydantic）
- 创建 `backend/main.py`（FastAPI 应用入口，调用 mount_routes，配置 CORS）
- 创建 `backend/README.md`（启动说明）

### 第二部分：MockRuntimeAdapter 最小 mock 逻辑
- 修改 `backend/app/adapters/runtime/mock/adapter.py`：
  - `submit()`：返回 RuntimeAccepted，内存记录状态
  - `stream()`：异步生成器 yield 4 类事件（request.accepted → response.delta×N → response.completed → request.terminal）
  - `describe_capabilities()`：返回 mock 能力说明
  - `cancel()` 暂保持 NotImplementedError（无确认路径暂不需要）

### 第三部分：SSE Handler 实现
- 修改 `backend/app/api/http/routes/requests.py`：
  - `POST /requests`：调用 MockRuntimeAdapter.submit()，返回 Request 快照（status=accepted）
  - 当 session_id 为 null 时，内部创建 mock session UUID，不暴露独立端点
  - `GET /requests/{request_id}/events`：调用 MockRuntimeAdapter.stream()，返回 SSE 事件流

### 第四部分：前端 API 客户端激活（按 axios 单例规范）
- 修改 `frontend/src/api/http.ts`：按规范实现 axios 单例（baseURL、timeout、拦截器）
- 修改 `frontend/src/api/modules/requests.ts`：使用 axios 单例调用 /requests 和 /requests/{id}/events
- 修改 `frontend/src/composables/use-chat-stream.ts`：激活 SSE 连接逻辑

### 第五部分：运行态文件回写
- 更新 current-task.md / task-status.md / solution-proposal.md / execution-checklist.md / review-notes.md

## 本轮不做
- 不改业务逻辑（Decision Service / Confirmation Policy 保持 NotImplementedError）
- 不接真实 QwenPaw / 真实工具 / 真实外部系统
- 不改 docs/contracts/
- 不改规则层文件（CLAUDE.md、README.md）
- 不改 WorkflowAdapter / ToolGateway（M3 无确认路径暂不需要）
- 不做前端产品化打磨
- 不创建 POST /sessions 端点（不在契约中）

## 第一优先级真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`（阶段 2 历史基线）
- `docs/demo/stage-2-minimal-loop-definition.md`（无确认路径定义）
- `docs/project/milestones.md`（里程碑状态）
- `docs/contracts/gateway-http-and-sse.md`（HTTP 路径 + 事件族）
- `docs/contracts/runtime-adapter.md`（RuntimeAdapter 方法定义）
- `docs/frontend/vue3-ruler-skills-compact.md`（前端规范，axios 单例）

## 本轮依赖真源（契约作为实现标准）
- `docs/contracts/gateway-http-and-sse.md`（Section 5 HTTP 路径、Section 3.5 StreamEvent 事件族）
- `docs/contracts/runtime-adapter.md`（Section 3 RuntimeStreamEvent 字段、Section 4 方法定义）
- `docs/demo/stage-2-minimal-loop-definition.md`（Section 4 最小闭环 A：无确认路径）
- `docs/frontend/vue3-ruler-skills-compact.md`（axios 单例 + 拦截器规范）

## 允许修改文件

### 新增：后端依赖与入口
- `backend/pyproject.toml`
- `backend/main.py`
- `backend/README.md`

### 修改：MockRuntimeAdapter
- `backend/app/adapters/runtime/mock/adapter.py`

### 修改：SSE Handler
- `backend/app/api/http/routes/requests.py`

### 修改：前端 API 客户端
- `frontend/package.json`（新增，声明 axios 依赖）
- `frontend/src/api/http.ts`
- `frontend/src/api/modules/requests.ts`
- `frontend/src/composables/use-chat-stream.ts`

### 运行态文件
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/decision-log.md`

## 禁止修改文件
- `docs/contracts/**`
- `docs/project/**`
- `docs/phases/**`
- `docs/demo/**`
- `CLAUDE.md`、`README.md`（根目录）
- `docs/agents/*.md`
- `backend/app/adapters/workflow/**`
- `backend/app/adapters/tool/**`
- `backend/app/core/policies/**`
- `backend/app/ports/**`
- `backend/app/api/http/routes/sessions.py`（本轮不修改 session 路由）

## 前置条件
- M2 已全部退出（TASK-003 + TASK-20260423-004 均已完成）
- Python 3.13 可用，uv 已安装
- 阶段已切换至阶段 3（AGENTS.md 已更新）
- 前端实现按 axios 单例规范（vue3-ruler-skills-compact.md）

## 执行方式
Codex 按真源执行允许范围内的实现。

## 完成判定
- 后端可独立启动（uvicorn main:app）
- POST /requests 可返回 Request 快照（status=accepted）
- GET /requests/{id}/events 可返回 SSE 事件流
- 事件流包含契约定义的 4 类事件（request.accepted / response.delta / response.completed / request.terminal）
- 前端 API 客户端可发出真实请求（按 axios 单例规范）
- Python AST 解析通过
- 未越过阶段 3 边界（仍为 mock-only）
- 运行态文件已回写

## 输出物要求
- 执行结果：`docs/decisions/review-notes.md`
- 进度更新：`docs/decisions/task-status.md`

## 风险提示
- 项目首次引入依赖管理，需确认 Python 3.13 可用性
- SSE 实现方式需确认 FastAPI 版本兼容性（Starlette 原生支持）
- 前端 SSE 在开发模式下可能有 CORS 问题，需在 main.py 配置 CORS
- axios + SSE 兼容性：axios 原生不支持 SSE，EventSource 需用原生浏览器 API 或专用库

## 验收关注点
- 后端是否可独立启动
- SSE 事件流是否包含契约定义的 4 类事件
- 事件顺序是否符合最小闭环 A 定义（request.accepted → response.delta* → response.completed → request.terminal）
- 前端 API 客户端是否按 axios 单例规范实现
- 是否未越过阶段 3 边界
- 是否未引入真实 provider/runtime/tool/外部系统
- 是否未创建 POST /sessions 端点

## 交接说明
- 本轮由 Codex 按真源执行
- 执行完成后由 Claude 或人工复核
- 复核通过后，M3"最小闭环跑通"可视为启动，进入后续轮次完善

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Claude
- 更新说明：处理 REVISE 反馈后重新批准，状态推进至 approved_for_execution
