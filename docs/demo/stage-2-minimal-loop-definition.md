# 阶段 2 最小闭环联调定义（Mock-Only）

## 1. 文档定位

本文档用于定义阶段 2 的最小闭环联调准备范围。

当前只允许定义 mock-only 路径，不允许实现真实 provider、真实 HTTP / SSE、真实工具调用链或真实工作流执行链。

---

## 2. 对齐目标

本轮最小闭环定义重点对齐以下四类内容：

1. `Request` 主状态
2. `Confirmation` 子资源状态
3. `StreamEvent` 事件族
4. `terminal status` 的语义边界

本文档仅固化联调准备语义，不代表任何真实集成已经存在。

---

## 3. 统一状态与事件约定

### 3.1 Request 主状态

本最小闭环文档中，`Request` 主状态按以下集合定义：

- `accepted`
- `streaming`
- `waiting_confirmation`
- `completed`
- `failed`
- `cancelled`
- `rejected`

说明：

- `accepted`：请求已被受理，尚未进入正式流式响应或确认等待
- `streaming`：请求正在产出响应事件
- `waiting_confirmation`：请求已被确认边界挂起，等待 `Confirmation` 结果
- `completed`：请求完成并进入终态
- `failed`：请求失败并进入终态
- `cancelled`：请求被取消并进入终态
- `rejected`：请求因确认拒绝进入终态

### 3.2 Request terminal status 语义边界

`Request` 的 terminal status 只包含：

- `completed`
- `failed`
- `cancelled`
- `rejected`

边界约束：

- 只有进入上述四个状态之一，`Request` 才视为终态
- 终态一旦写定，不应再恢复到非终态
- `request.terminal` 事件只允许在进入终态时发出

### 3.3 ConfirmationStatus

本最小闭环文档中，`ConfirmationStatus` 固定为：

- `pending`
- `confirmed`
- `rejected`
- `expired`

默认语义：

- `pending`：等待人工确认
- `confirmed`：确认通过
- `rejected`：确认拒绝
- `expired`：确认超时未处理

默认映射：

- `confirmed`：允许关联 `Request` 从 `waiting_confirmation` 继续推进
- `rejected`：默认使关联 `Request` 进入 `rejected`
- `expired`：默认使关联 `Request` 进入 `cancelled`

### 3.4 StreamEvent 事件族

本最小闭环文档中，事件名统一使用以下集合：

- `request.accepted`
- `response.delta`
- `response.completed`
- `confirmation.required`
- `request.status.changed`
- `request.terminal`

事件语义：

- `request.accepted`：请求已被系统受理
- `response.delta`：响应增量事件
- `response.completed`：响应内容已完成
- `confirmation.required`：请求已进入确认等待，需要创建或关联 `Confirmation`
- `request.status.changed`：请求状态发生变化
- `request.terminal`：请求进入终态

---

## 4. 最小闭环 A：无确认路径

### 4.1 路径定义

`create request -> request.accepted -> response.delta* -> response.completed -> request.terminal`

### 4.2 状态推进

建议按以下状态推进理解：

1. 创建请求后，`Request.status = accepted`
2. 进入流式响应后，`Request.status = streaming`
3. 响应完成后，`Request.status = completed`

### 4.3 事件顺序

建议顺序如下：

1. `request.accepted`
2. `request.status.changed`
   - `from = null`
   - `to = accepted`
3. `request.status.changed`
   - `from = accepted`
   - `to = streaming`
4. `response.delta`（可出现 0 到多次）
5. `response.completed`
6. `request.status.changed`
   - `from = streaming`
   - `to = completed`
7. `request.terminal`
   - `terminal_status = completed`

### 4.4 路径边界

- 本路径不创建 `Confirmation`
- 本路径不进入 `waiting_confirmation`
- `response.completed` 不等于请求终态，真正进入终态以 `request.terminal` 为准

---

## 5. 最小闭环 B：有确认路径

### 5.1 路径定义

`create request -> request.accepted -> confirmation.required -> confirmation resolved -> request.terminal or resumed response path`

### 5.2 状态推进

建议按以下状态推进理解：

1. 创建请求后，`Request.status = accepted`
2. 触发确认边界后，`Request.status = waiting_confirmation`
3. 同时创建或关联一个 `Confirmation`，初始状态为 `pending`
4. 确认结果分支：
   - `confirmed`：`Request` 退出 `waiting_confirmation`，继续推进到 `accepted` 或 `streaming`
   - `rejected`：`Request.status = rejected`
   - `expired`：`Request.status = cancelled`

### 5.3 事件顺序

建议顺序如下：

1. `request.accepted`
2. `request.status.changed`
   - `from = null`
   - `to = accepted`
3. `confirmation.required`
4. `request.status.changed`
   - `from = accepted | streaming`
   - `to = waiting_confirmation`

确认结果分支 A：确认通过

5. `Confirmation.status = confirmed`
6. `request.status.changed`
   - `from = waiting_confirmation`
   - `to = accepted | streaming`
7. 若恢复到 `streaming`，继续走：
   - `response.delta*`
   - `response.completed`
   - `request.status.changed` 到 `completed`
   - `request.terminal`
     - `terminal_status = completed`

确认结果分支 B：确认拒绝

5. `Confirmation.status = rejected`
6. `request.status.changed`
   - `from = waiting_confirmation`
   - `to = rejected`
7. `request.terminal`
   - `terminal_status = rejected`

确认结果分支 C：确认超时

5. `Confirmation.status = expired`
6. `request.status.changed`
   - `from = waiting_confirmation`
   - `to = cancelled`
7. `request.terminal`
   - `terminal_status = cancelled`

### 5.4 路径边界

- `confirmation.required` 表示请求已进入确认等待，不表示确认已完成
- `confirmed` 不是 `Request` 终态，它只表示允许请求继续推进
- `rejected` 与 `expired` 不再回到非终态路径

---

## 6. 需要对齐的对象

联调路径至少要求以下对象在文档、backend 占位、frontend 占位中语义一致：

- `Session`
- `Message`
- `Request`
- `StreamEvent`
- `Confirmation`

---

## 7. 当前阶段禁止项

- 不接真实 `QwenPawAdapter`
- 不接真实 `HermesAdapter`
- 不接真实 HTTP handler
- 不接真实 SSE handler
- 不接真实 Tool Gateway 调用链
- 不接真实 Workflow 执行链
- 不接 LangGraph / Temporal 真实实现
- 不接生产接口或外部系统

---

## 8. 阶段 3 衔接条件

只有在以下条件满足后，才允许进入阶段 3 的最小 mock 联调：

1. 五类核心资源统一模型已对齐
2. 状态枚举与状态流转已补齐
3. `Tool Gateway / Workflow Adapter` 契约已细化
4. 最小闭环路径已被文档明确固化
