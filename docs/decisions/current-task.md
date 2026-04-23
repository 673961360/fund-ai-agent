# 当前任务

## 任务ID
TASK-20260423-004

## 任务名称
阶段2骨架补齐 - HTTP路由骨架 + Mock适配器骨架 + Port字段对齐

## 任务状态
review_pending

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
TASK-20260423-003（阶段2核心对齐）已完成，代码枚举/命名已与契约一致。但经缺口分析，阶段2代码层仍有3处骨架缺失：

1. **HTTP 路由骨架缺失**：契约 Section 5 定义了 10 个端点（sessions ×3 / requests ×3 / confirmations ×4），但 `backend/app/api/http/routes/` 目录为空，无任何路由骨架文件
2. **WorkflowAdapter Mock 骨架缺失**：port 已定义（ports/workflow_adapter.py），但 `backend/app/adapters/workflow/` 目录不存在
3. **ToolGateway Mock 骨架缺失**：port 已定义（ports/tool_gateway.py），但 `backend/app/adapters/tool/` 目录不存在
4. **ToolCallRequest 字段缺失**：契约定义 workflow_id / timeout_ms / idempotency_key，port 代码缺少这3个字段

## 任务目标
以契约文档为真源，补齐阶段2允许范围内的骨架文件，使阶段2"最小联调准备"可视为完成，具备进入阶段3 mock联调的条件。

## 当前阶段
阶段 2：统一模型、契约对齐、最小联调准备

## 阶段边界摘要
当前阶段允许：
- 统一模型定义、契约对齐
- 枚举值、命名、状态流转的代码层同步
- 骨架文件创建（空实现 + NotImplementedError）
- 不接真实 provider / runtime / workflow / HTTP / SSE

当前阶段不允许：
- 真实 provider / runtime / workflow / tool / HTTP / SSE 集成
- 业务逻辑实现
- 大规模重构

## 本轮只做
- 创建 HTTP 路由骨架文件（sessions.py / requests.py / confirmations.py），所有端点返回 501
- 更新 routes/__init__.py，导出路由模块并定义 mount_routes 函数
- 创建 WorkflowAdapter Mock 骨架（adapters/workflow/mock_adapter.py）
- 创建 ToolGateway Mock 骨架（adapters/tool/mock_gateway.py）
- 补齐 ToolCallRequest 契约缺失字段（workflow_id / timeout_ms / idempotency_key）

## 本轮不做
- 不改业务逻辑实现
- 不接真实 provider / runtime / workflow / HTTP / SSE
- 不改 docs/contracts/ 文档
- 不改 docs/project/、docs/phases/、docs/demo/
- 不改 AGENTS.md、CLAUDE.md、README.md 等规则层

## 第一优先级真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`

## 本轮依赖真源（契约作为骨架标准）
- `docs/contracts/gateway-http-and-sse.md`（Section 5 HTTP 路径定义）
- `docs/contracts/runtime-adapter.md`（Section 4 方法定义）
- `docs/contracts/workflow-adapter.md`（Section 3/4 对象与方法定义）
- `docs/contracts/tool-gateway.md`（Section 3/4 对象与方法定义）

## 允许修改文件

### 新增：HTTP 路由骨架
- `backend/app/api/http/routes/__init__.py`（更新，非覆盖）
- `backend/app/api/http/routes/sessions.py`
- `backend/app/api/http/routes/requests.py`
- `backend/app/api/http/routes/confirmations.py`

### 新增：WorkflowAdapter Mock 骨架
- `backend/app/adapters/workflow/__init__.py`
- `backend/app/adapters/workflow/mock_adapter.py`

### 新增：ToolGateway Mock 骨架
- `backend/app/adapters/tool/__init__.py`
- `backend/app/adapters/tool/mock_gateway.py`

### 修改：Port 字段对齐
- `backend/app/ports/tool_gateway.py`（ToolCallRequest 加3个字段）

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
- `AGENTS.md`、`CLAUDE.md`、README.md`
- `docs/agents/*.md`
- `backend/app/adapters/runtime/**`（已有 MockRuntimeAdapter，不改动）
- `backend/app/core/**`（entity/dto/policy 不在本轮范围）
- `backend/app/application/**`（dto 不在本轮范围）

## 前置条件
- TASK-20260423-003 已完成，枚举/命名已与契约一致
- 契约文档已详细定义所有 HTTP 路径、方法签名、数据模型
- Port 层已定义 Protocol 接口，仅缺 adapter 骨架

## 执行方式
Codex 按真源执行允许范围内的骨架创建。

## 完成判定
- HTTP 路由骨架文件已创建（3个文件），所有端点返回 501
- routes/__init__.py 已更新，导出路由模块并定义 mount_routes
- WorkflowAdapter Mock 骨架已创建，所有方法抛 NotImplementedError
- ToolGateway Mock 骨架已创建，所有方法抛 NotImplementedError
- ToolCallRequest 已补齐 workflow_id / timeout_ms / idempotency_key
- Python AST 解析通过（所有新增/修改的 .py 文件）
- 未越过阶段2边界
- 运行态文件已回写

## 输出物要求
- 执行结果：`docs/decisions/review-notes.md`
- 进度更新：`docs/decisions/task-status.md`

## 风险提示
- 路由骨架文件创建后，如果后续阶段3需要挂载真实逻辑，需要替换 501 占位
- 适配器骨架的方法签名必须与 port Protocol 完全一致，否则会导致类型检查失败
- ToolCallRequest 加字段后，如果有现有代码引用了该类，新增字段为 Optional 且带默认值，不会破坏现有调用

## 验收关注点
- 骨架文件是否存在且可被 Python 解析
- 所有新增方法是否均抛 NotImplementedError
- HTTP 路由路径是否与契约 Section 5 完全一致
- ToolCallRequest 字段是否与契约 Section 3.1 完全一致
- 是否未越过阶段2边界

## 交接说明
- 本轮由 Codex 按真源执行骨架创建
- 执行完成后由 Claude 或人工复核
- 复核通过后，阶段2"骨架补齐"可视为完成，具备进入阶段3 mock联调条件

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Codex
- 更新说明：已完成 TASK-004 允许范围内的骨架创建与字段对齐，进入复核状态
