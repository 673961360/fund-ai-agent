# Runtime Adapter 契约（Stage 2）

## 1. 文档定位

本文档定义统一 Runtime Adapter 抽象的职责边界与占位接口，为后续接入 `QwenPawAdapter`、`HermesAdapter` 与 `MockRuntimeAdapter` 做准备。

阶段 2 只细化模型、事件与方法语义，不实现任何真实 Runtime 逻辑。

---

## 2. 设计原则

- Runtime Adapter 只负责运行时协议适配
- 不承载业务决策逻辑
- 不暴露 Provider 私有字段给 Frontend
- 不直接 import 具体工具实现
- 运行时事件应先归一为统一事件语义，再交由 Gateway 向上暴露

---

## 3. 占位对象

### 3.1 RuntimeRequest

建议字段：

- `request_id`
- `session_id`
- `trace_id`
- `messages`
- `attachments`
- `runtime_hints`

字段约束：

- `request_id`：关联请求主键
- `session_id`：关联会话主键
- `trace_id`：统一追踪标识
- `messages`：已被上层归一的消息输入数组，不允许为 provider 私有结构
- `attachments`：附件占位数组，阶段 2 不固化真实传输协议
- `runtime_hints`：运行时提示占位，不允许写入业务决策主权

### 3.2 RuntimeAccepted

建议字段：

- `request_id`
- `trace_id`
- `accepted_at`
- `adapter_name`

语义约束：

- `RuntimeAccepted` 表示运行时已接受请求，不代表请求已完成
- `accepted_at` 为运行时受理时间，占位时间字段
- `adapter_name` 为统一适配器名，而不是 provider 原始品牌字符串

### 3.3 RuntimeStreamEvent

建议字段：

- `request_id`
- `event_type`
- `payload`
- `timestamp`
- `trace_id`

阶段 2 事件语义要求：

- `RuntimeStreamEvent.event_type` 应与 Gateway 事件族保持兼容
- 当前兼容的事件族：
  - `request.accepted`
  - `response.delta`
  - `response.completed`
  - `confirmation.required`
  - `request.status.changed`
  - `request.terminal`

补充约束：

- Runtime Adapter 不向上暴露 provider 原始帧结构
- `response.completed` 仅表示响应内容完成，不等于 `Request` 终态
- `request.terminal` 仅表示上层链路已写定请求终态，`terminal_status` 只允许为 `completed | failed | cancelled | rejected`
- `expired` 只属于 `ConfirmationStatus`，不属于 `Request` 终态
- RuntimeAdapter 不拥有 `Request terminal status` 主权
- 阶段 2 不标准化工具调用事件族，避免提前把工具执行职责塞回 RuntimeAdapter

### 3.4 RuntimeCapability

建议字段：

- `adapter_name`
- `supports_streaming`
- `supports_interrupt`
- `supports_tools`
- `notes`

语义约束：

- `supports_streaming`：是否支持流式返回
- `supports_interrupt`：是否支持中断
- `supports_tools`：是否支持表达工具调用意图，不代表可直接执行工具
- `notes`：兼容性或限制说明占位

---

## 4. 统一接口草案

建议保留以下抽象方法：

- `submit(request)`
- `stream(request)`
- `cancel(request_id)`
- `describe_capabilities()`

说明：

- `submit(request)`：用于接收请求并返回受理结果占位
- `stream(request)`：用于返回异步流事件占位
- `cancel(request_id)`：用于中断占位
- `describe_capabilities()`：用于暴露标准化能力说明

阶段 2 方法边界：

- `submit(request)`：只负责受理归一后的 `RuntimeRequest`
- `stream(request)`：只负责产生归一后的 `RuntimeStreamEvent`
- `cancel(request_id)`：只定义中断请求的占位语义，不定义真实中断协议
- `describe_capabilities()`：只暴露标准化能力位，不暴露 provider 私有字段

---

## 5. 适配器规划

### 5.1 MockRuntimeAdapter

- 阶段 2 仍只允许空骨架
- 不允许实现最小假流式逻辑

### 5.2 QwenPawAdapter

- 当前为目标 Provider
- 阶段 2 仍只允许 README 与空目录
- 在以下信息未确认前不得实现：
  - 本地服务地址与端口
  - 认证方式
  - 会话语义
  - 流式协议
  - interrupt 语义
  - 错误码与超时语义
  - 工具调用相关语义
  - 版本兼容边界

### 5.3 HermesAdapter

- 阶段 2 仍只预留扩展点
- 不实现真实协议适配

---

## 6. 与其他层的关系

- Gateway 面向 Runtime Adapter 抽象，不面向 Provider 私有实现
- Decision Service 决定是否允许执行，不由 Runtime Adapter 决策
- Tool Gateway 负责工具治理，不由 Runtime Adapter 直接调工具
- Workflow Adapter 负责等待与恢复语义，不由 Runtime Adapter 承担长流程状态主权
- `Request` 是否进入 `completed | failed | cancelled | rejected` 由上层统一契约决定，不由 Runtime Adapter 决定

---

## 7. TODO

- TODO：明确 runtime 请求对象与 Gateway Request 资源的映射关系
- TODO：明确 interrupt 与 cancel 的统一语义
- TODO：明确 runtime 级错误模型
- TODO：明确 runtime 事件 `payload` 的最小公共字段
