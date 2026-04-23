# Workflow Adapter 契约（Stage 1）

## 1. 文档定位

本文档用于定义统一 Workflow Adapter 抽象，确保后续可平滑接入自研 Workflow、LangGraph 或 Temporal，而不需要回拆上层接口。

阶段 1 只建立抽象，不接任何真实工作流引擎。

---

## 2. 职责边界

- 接收由 Gateway / Decision Service 发起的工作流请求
- 提供统一的工作流状态查询接口
- 提供统一的恢复、取消能力占位
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

### 3.2 WorkflowState

建议状态枚举：

- `pending`
- `running`
- `waiting_input`
- `waiting_confirmation`
- `completed`
- `failed`
- `cancelled`

### 3.3 WorkflowCommand

建议支持的命令占位：

- `resume`
- `cancel`
- `get_status`

---

## 4. 统一接口草案

建议保留以下方法：

- `start(ticket)`
- `resume(workflow_id, payload=None)`
- `cancel(workflow_id, reason=None)`
- `get_status(workflow_id)`

阶段 1 只定义方法签名与状态对象，不实现真实透传逻辑。

---

## 5. 与确认边界的关系

- 高风险工作流可进入 `waiting_confirmation`
- Confirmation 资源与 Workflow 状态映射在阶段 2 明确
- Workflow Adapter 不直接决策是否需要确认

---

## 6. TODO

- TODO：明确工作流类型命名规范
- TODO：明确工作流上下文对象结构
- TODO：明确与 Confirmation、Tool Gateway 的联动顺序

