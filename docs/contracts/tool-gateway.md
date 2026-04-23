# Tool Gateway 契约（Stage 2）

## 1. 文档定位

本文档定义 Tool Gateway 的统一入口抽象与治理责任，确保所有工具调用都经过同一层，而不是由 Runtime 直接触达具体工具实现。

阶段 2 只细化对象、治理位与语义，不实现真实工具执行链。

---

## 2. 目标

- 统一工具调用入口
- 屏蔽 Runtime 对具体工具实现的直接依赖
- 预留参数校验、鉴权、审计、超时、重试、限流、错误模型
- 为确认边界、工作流编排和调用留痕提供统一契约基础

---

## 3. 占位对象

### 3.1 ToolCallRequest

建议字段：

- `tool_call_id`
- `tool_name`
- `arguments`
- `caller`
- `request_id`
- `trace_id`
- `confirmation_id`
- `workflow_id`
- `timeout_ms`
- `idempotency_key`

字段约束：

- `tool_call_id`：工具调用主键
- `tool_name`：标准化工具名
- `arguments`：结构化参数对象
- `caller`：调用来源，占位字符串，默认由上层统一约束
- `request_id`：关联请求主键
- `trace_id`：统一追踪标识
- `confirmation_id`：如该工具执行被确认边界拦截，则可非空
- `workflow_id`：如工具调用处于工作流上下文内，则可非空
- `timeout_ms`：超时占位参数，不在阶段 2 固化默认值
- `idempotency_key`：幂等键占位，不在阶段 2 固化生成策略

### 3.2 ToolCallResult

建议字段：

- `tool_call_id`
- `tool_name`
- `success`
- `output`
- `error`
- `trace_id`
- `finished_at`
- `confirmation_id`

字段约束：

- `success=true` 时，`error` 应为空
- `success=false` 时，`error` 应非空
- `confirmation_id` 可用于保留工具执行前确认边界的关联留痕

### 3.3 ToolError

建议字段：

- `code`
- `message`
- `retryable`
- `details`

阶段 2 建议保留的 `code` 语义族：

- `validation_error`
- `authorization_denied`
- `confirmation_required`
- `timeout`
- `rate_limited`
- `tool_failed`
- `upstream_unavailable`

### 3.4 Confirmation Boundary Semantics

当工具调用被确认边界拦截时，阶段 2 统一采用以下语义：

- `ConfirmationStatus` 只允许：
  - `pending`
  - `confirmed`
  - `rejected`
  - `expired`
- 不再使用 `approved`，统一改为 `confirmed`
- 当确认仍未完成时，上层 `Request.status` 可进入 `waiting_confirmation`
- 不再使用 `awaiting_confirmation`
- `expired` 只属于 `ConfirmationStatus`，不属于 `Request` 终态

默认映射边界：

- `Confirmation.pending`：表示工具执行被确认边界拦截，等待上层恢复
- `Confirmation.confirmed`：表示确认已通过，允许上层继续后续链路
- `Confirmation.rejected`：表示确认被拒绝，上层可将 `Request` 写定为 `rejected`
- `Confirmation.expired`：表示确认已过期，上层可将 `Request` 写定为 `cancelled`

补充说明：

- Tool Gateway 只负责表达确认边界结果，不拥有 `Request terminal status` 主权
- 是否把 `Request` 写定为 `completed | failed | cancelled | rejected`，由上层统一契约决定
- 阶段 2 不引入 `resumed` 等额外状态名

---

## 4. 统一接口草案

建议保留以下方法：

- `validate(request)`
- `authorize(request)`
- `execute(request)`
- `describe_tool(tool_name)`

说明：

- 阶段 2 只建立占位方法与语义
- `execute(request)` 不允许落真实调用逻辑
- Runtime 必须通过 Tool Gateway，而不能直接 import 工具实现

阶段 2 治理顺序约束：

1. `validate`
2. `authorize`
3. 确认边界检查
4. `execute`
5. 结果归一
6. 审计留痕

补充语义：

- 当调用被确认边界拦截时，不应直接进入真实执行
- 当调用处于确认等待中时，Tool Gateway 只返回确认边界结果，不直接推进 `Request` 到终态
- `describe_tool(tool_name)` 只返回工具描述元数据，不触发工具执行

---

## 5. 治理责任

Tool Gateway 后续需要统一承接：

- 参数 schema 校验
- 鉴权
- 审计
- 超时
- 重试
- 限流
- 错误归一
- 调用留痕

阶段 2 额外要求：

- 不在本层暴露具体 provider 私有字段
- 不在本层固化具体工具实现注册方式
- 不在本层提前实现真实调用重试策略

---

## 6. 与其他层的关系

- Runtime Adapter 可发起工具调用意图，但不执行具体工具
- Decision Service 可决定某类工具是否需要确认
- Workflow Adapter 可承接长流程工具编排，但不替代 Tool Gateway
- 当工具调用受确认边界约束时，`confirmation_id` 语义应与 Gateway / Workflow 保持一致
- 当 `ConfirmationStatus=pending` 时，上层 `Request.status` 可为 `waiting_confirmation`，但该状态不由 Tool Gateway 主写
- `Tool Gateway` 不拥有 `Request terminal status` 主权，不负责判定 `completed | failed | cancelled | rejected`
- `Runtime Adapter` 同样不拥有 `Request terminal status` 主权，工具治理结果应由上层统一吸收后再决定请求终态

---

## 7. TODO

- TODO：明确工具注册模型
- TODO：明确工具描述元数据的最小公共字段
- TODO：明确工具输出标准化结构
- TODO：明确工具超时与重试默认策略
- TODO：明确确认边界结果与上层 `request.status.changed` / `request.terminal` 的衔接规则
