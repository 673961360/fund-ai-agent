# Tool Gateway 契约（Stage 1）

## 1. 文档定位

本文档定义 Tool Gateway 的统一入口抽象与治理责任，确保所有工具调用都经过同一层，而不是由 Runtime 直接触达具体工具实现。

阶段 1 不实现真实工具执行链。

---

## 2. 目标

- 统一工具调用入口
- 屏蔽 Runtime 对具体工具实现的直接依赖
- 预留参数校验、鉴权、审计、超时、重试、限流、错误模型

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

### 3.2 ToolCallResult

建议字段：

- `tool_call_id`
- `tool_name`
- `success`
- `output`
- `error`
- `trace_id`
- `finished_at`

### 3.3 ToolError

建议字段：

- `code`
- `message`
- `retryable`
- `details`

---

## 4. 统一接口草案

建议保留以下方法：

- `validate(request)`
- `authorize(request)`
- `execute(request)`
- `describe_tool(tool_name)`

说明：

- 阶段 1 只建立占位方法
- `execute(request)` 不允许落真实调用逻辑
- Runtime 必须通过 Tool Gateway，而不能直接 import 工具实现

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

---

## 6. 与其他层的关系

- Runtime Adapter 可发起工具调用意图，但不执行具体工具
- Decision Service 可决定某类工具是否需要确认
- Workflow Adapter 可承接长流程工具编排，但不替代 Tool Gateway

---

## 7. TODO

- TODO：明确工具注册模型
- TODO：明确工具描述元数据格式
- TODO：明确工具输出标准化结构
- TODO：明确工具超时与重试默认策略

