# Workflow Adapter 契约（Stage 2）

## 1. 文档定位

本文档用于定义统一 Workflow Adapter 抽象，确保后续可平滑接入自研 Workflow、LangGraph 或 Temporal，而不需要回拆上层接口。

阶段 2 只细化抽象、状态与方法语义，不接任何真实工作流引擎。

---

## 2. 职责边界

- 接收由 Gateway / Decision Service 发起的工作流请求
- 提供统一的工作流状态查询接口
- 提供统一的恢复、取消能力占位
- 为人工确认等待、恢复执行与长流程终态留出统一语义
- 不承载前端页面逻辑
- 不承载 Provider 私有协议

---

## 3. 占位对象

### 3.1 WorkflowTicket

建议字段：

- `workflow_id`
- `request_id`
- `session_id`
- `workflow_type`
- `status`
- `trace_id`
- `created_at`
- `updated_at`
- `confirmation_id`
- `context`

字段约束：

- `workflow_id`：工作流主键
- `request_id`：关联请求主键
- `session_id`：关联会话主键
- `workflow_type`：工作流类型，占位字符串
- `status`：当前工作流状态
- `trace_id`：统一追踪标识
- `confirmation_id`：当工作流进入确认等待时可非空
- `context`：工作流上下文占位对象，不在阶段 2 固化内部结构

### 3.2 WorkflowState

建议状态枚举：

- `pending`
- `running`
- `waiting_input`
- `waiting_confirmation`
- `completed`
- `failed`
- `cancelled`

阶段 2 状态流转：

- `pending -> running | cancelled`
- `running -> waiting_input | waiting_confirmation | completed | failed | cancelled`
- `waiting_input -> running | failed | cancelled`
- `waiting_confirmation -> running | failed | cancelled`
- `completed | failed | cancelled` 为终态

状态语义：

- `pending`：工作流已创建但尚未开始推进
- `running`：工作流正在推进
- `waiting_input`：等待外部补充输入
- `waiting_confirmation`：等待人工确认结果
- `completed`：工作流完成并进入终态
- `failed`：工作流失败并进入终态
- `cancelled`：工作流被取消并进入终态

补充边界：

- `waiting_confirmation` 为唯一确认等待状态，不使用 `awaiting_confirmation`
- Workflow 状态机不直接拥有 `Request` 终态主权
- `Request.rejected` 可由确认拒绝触发，但不要求 `WorkflowState` 额外引入 `rejected`

### 3.3 WorkflowCommand

建议支持的命令占位：

- `resume`
- `cancel`
- `get_status`

命令语义约束：

- `resume`：仅允许用于 `waiting_input` 或 `waiting_confirmation`
- `cancel`：仅允许用于非终态工作流
- `get_status`：纯查询，不改变工作流状态

---

## 4. 统一接口草案

建议保留以下方法：

- `start(ticket)`
- `resume(workflow_id, payload=None)`
- `cancel(workflow_id, reason=None)`
- `get_status(workflow_id)`

阶段 2 方法语义：

- `start(ticket)`：创建或启动工作流，返回当前状态快照
- `resume(workflow_id, payload=None)`：恢复等待中的工作流，返回更新后的状态快照
- `cancel(workflow_id, reason=None)`：取消工作流，返回更新后的状态快照
- `get_status(workflow_id)`：查询当前工作流状态快照

阶段 2 仍不实现真实透传逻辑。

---

## 5. 与确认边界的关系

- 高风险工作流可进入 `waiting_confirmation`
- `Workflow.waiting_confirmation` 应与 `Confirmation.pending` 保持一致
- 确认通过后，工作流可从 `waiting_confirmation` 返回 `running`
- `Confirmation.confirmed` 只表示允许工作流继续推进，不等于请求终态
- `Confirmation.rejected` 默认中断当前工作流推进
- `Confirmation.expired` 默认中断当前工作流推进
- Workflow Adapter 不直接决策是否需要确认

与 Gateway 请求状态的默认映射：

- `Workflow.waiting_confirmation` 对应 `Request.waiting_confirmation`
- `Workflow.completed` 可对应 `Request.completed`
- `Workflow.failed` 可对应 `Request.failed`
- `Workflow.cancelled` 可对应 `Request.cancelled`

与确认结果相关的补充映射：

- 当 `Confirmation.status = confirmed` 时，关联 `Request` 可从 `waiting_confirmation` 返回 `accepted` 或 `streaming`
- 当 `Confirmation.status = rejected` 时，关联 `Request` 默认进入 `rejected`
- 当 `Confirmation.status = expired` 时，关联 `Request` 默认进入 `cancelled`

边界约束：

- `WorkflowAdapter` 不拥有 `Request terminal status` 主权
- `Request` 是否最终进入 `completed | failed | cancelled | rejected`，应由上层链路按统一契约写定

---

## 6. TODO

- TODO：明确工作流类型命名规范
- TODO：明确工作流上下文对象的最小公共字段
- TODO：明确与 Tool Gateway 的编排边界
