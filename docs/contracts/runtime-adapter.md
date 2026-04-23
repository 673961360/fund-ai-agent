# Runtime Adapter 契约（Stage 1）

## 1. 文档定位

本文档定义统一 Runtime Adapter 抽象的职责边界与占位接口，为后续接入 `QwenPawAdapter`、`HermesAdapter` 与 `MockRuntimeAdapter` 做准备。

阶段 1 不实现任何真实 Runtime 逻辑。

---

## 2. 设计原则

- Runtime Adapter 只负责运行时协议适配
- 不承载业务决策逻辑
- 不暴露 Provider 私有字段给 Frontend
- 不直接 import 具体工具实现

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

### 3.2 RuntimeAccepted

建议字段：

- `request_id`
- `trace_id`
- `accepted_at`
- `adapter_name`

### 3.3 RuntimeStreamEvent

建议字段：

- `request_id`
- `event_type`
- `payload`
- `timestamp`
- `trace_id`

### 3.4 RuntimeCapability

建议字段：

- `adapter_name`
- `supports_streaming`
- `supports_interrupt`
- `supports_tools`
- `notes`

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

---

## 5. 适配器规划

### 5.1 MockRuntimeAdapter

- 阶段 1 只允许空骨架
- 不允许实现最小假流式逻辑

### 5.2 QwenPawAdapter

- 当前为目标 Provider
- 阶段 1 只允许 README 与空目录
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

- 阶段 1 只预留扩展点
- 不实现真实协议适配

---

## 6. 与其他层的关系

- Gateway 面向 Runtime Adapter 抽象，不面向 Provider 私有实现
- Decision Service 决定是否允许执行，不由 Runtime Adapter 决策
- Tool Gateway 负责工具治理，不由 Runtime Adapter 直接调工具

---

## 7. TODO

- TODO：阶段 2 对齐 runtime 请求对象与 Gateway Request 资源的映射关系
- TODO：阶段 2 明确 interrupt 与 cancel 的统一语义
- TODO：阶段 2 明确 runtime 级错误模型

