# 阶段 1 交付物定义（Stage 1 Deliverables）

## 1. 阶段目标

阶段 1 的目标不是实现业务能力，而是完成“资金AI聊天助手 v0”的**文档真源落盘**与**项目空骨架搭建**，确保后续阶段可以在稳定边界上继续演进。

本阶段重点：

- 固化架构与协议真源
- 创建 backend / frontend 基础目录结构
- 创建核心契约与类型占位
- 明确禁止项，避免提前写入真实逻辑
- 为阶段 2 的抽象接口与统一模型补齐做好准备

---

## 2. 当前已知前提

- 仓库中已存在 `AGENTS.md`
- `docs/`、`backend/`、`frontend/` 在阶段 1 开始前可能尚不存在
- 本阶段不允许实现真实运行逻辑
- `docs/contracts/gateway-http-and-sse.md` 是阶段 1 的**协议真源**

---

## 3. 阶段 1 的边界

### 3.1 本阶段必须完成

1. 创建文档目录与核心文档
2. 创建 backend 空骨架
3. 创建 frontend 空骨架
4. 固化命名、资源模型、接口草案、状态模型、字段占位
5. 将关键未决问题以 `TODO / 待定 / 默认假设` 的方式显式写入文档

### 3.2 本阶段明确不做

1. 不实现真实 QwenPaw 调用
2. 不实现真实 Hermes 调用
3. 不实现 `MockRuntimeAdapter` 的假流式逻辑
4. 不实现真实 HTTP handler / SSE handler
5. 不实现真实 Tool Gateway 调用链
6. 不实现真实业务规则
7. 不实现真实前端请求 / store / 流式展示逻辑
8. 不实现真实附件上传协议
9. 不连接任何生产接口或外部系统

---

## 4. 协议真源要求

### 4.1 真源文件

以下文件是阶段 1 的关键协议真源：

- `docs/contracts/gateway-http-and-sse.md`
- `docs/contracts/runtime-adapter.md`
- `docs/contracts/workflow-adapter.md`
- `docs/contracts/tool-gateway.md`

其中：

- `docs/contracts/gateway-http-and-sse.md` 为前后端接口与流事件的首要真源
- backend / frontend 中的 schema、dto、entity、types、占位接口命名必须与该文档对齐

### 4.2 真源优先级

如文档与代码占位不一致，以文档为准。  
阶段 1 中如发现字段、命名、资源模型冲突，应先修改文档，再修改空骨架。

---

## 5. 阶段 1 应创建的文档

### 5.1 架构文档

- `docs/architecture/system-overview.md`
- `docs/architecture/frontend-inheritance-v2.md`

### 5.2 契约文档

- `docs/contracts/gateway-http-and-sse.md`
- `docs/contracts/runtime-adapter.md`
- `docs/contracts/workflow-adapter.md`
- `docs/contracts/tool-gateway.md`

### 5.3 集成与检查文档

- `docs/integrations/qwenpaw-readiness-checklist.md`

### 5.4 Demo 与阶段文档

- `docs/demo/v0-demo-definition.md`
- `docs/phases/stage-1-deliverables.md`

---

## 6. 文档内容要求

阶段 1 的文档只允许包含以下内容：

- 模块职责说明
- 边界说明
- 资源模型
- 字段定义
- 状态枚举
- 默认假设
- 待定项
- TODO
- 限制说明
- 后续阶段扩展说明

阶段 1 文档中禁止：

- 真实接口调用示例代码
- 真实业务实现代码
- 未确认前提下的硬编码方案
- 将未来阶段内容伪装成当前已实现能力

---

## 7. Gateway 协议约束

### 7.1 资源模型

阶段 1 中至少要明确以下资源模型：

- Session
- Message
- Request
- StreamEvent
- Confirmation

### 7.2 确认接口约束

`POST /confirmations` 的定位如下：

- 用于 `internal/admin/test use`
- 默认不属于前端直接调用路径
- 正常链路中应由 Gateway 在请求处理中自动创建 confirmation
- 前端主流程只使用：
  - `GET /confirmations/{id}`
  - `POST /confirmations/{id}/approve`
  - `POST /confirmations/{id}/reject`

### 7.3 流式接口约束

阶段 1 只固化：

- request_id
- event_id
- event_type
- timestamp
- payload
- trace_id

阶段 1 不实现真实 SSE 行为，仅定义事件模型与字段。

---

## 8. RuntimeAdapter 约束

### 8.1 本阶段允许

- 定义统一 RuntimeAdapter 抽象
- 定义请求、响应、流事件相关占位类型
- 定义 `MockRuntimeAdapter` 空骨架
- 为 `QwenPawAdapter` 和 `HermesAdapter` 创建说明文件或空目录

### 8.2 本阶段禁止

- 不允许真实 `QwenPawAdapter` 实现
- 不允许真实 `HermesAdapter` 实现
- 不允许 `MockRuntimeAdapter` 生成最小假流式逻辑
- 不允许 RuntimeAdapter 内包含业务决策逻辑

### 8.3 QwenPawAdapter 硬门槛

在以下信息未确认前，不允许实现 `QwenPawAdapter`：

- 本地服务地址与端口
- 认证方式
- 会话语义
- 流式协议
- interrupt 语义
- 错误码 / 超时语义
- 工具调用相关语义
- 版本兼容边界

---

## 9. WorkflowAdapter 约束

### 9.1 本阶段允许

- 定义统一 WorkflowAdapter 抽象
- 定义 workflow 状态对象
- 定义 resume / cancel / status 的占位契约

### 9.2 本阶段禁止

- 不实现真实工作流引擎
- 不接入 LangGraph
- 不接入 Temporal
- 不实现真实透传逻辑

---

## 10. Tool Gateway 约束

### 10.1 本阶段允许

- 定义 Tool Gateway 的统一入口抽象
- 定义工具请求 / 响应 / 错误模型占位
- 定义 schema 校验、鉴权、审计、重试、限流等能力点说明

### 10.2 本阶段禁止

- 不实现真实工具调用
- 不允许 Runtime 直接 import 工具实现
- 不允许真实工具执行链路存在于阶段 1 代码中

---

## 11. backend 应创建的空骨架

### 11.1 目录

- `backend/app/api/http/routes/`
- `backend/app/api/http/schemas/`
- `backend/app/application/dto/`
- `backend/app/core/entities/`
- `backend/app/core/policies/`
- `backend/app/ports/`
- `backend/app/adapters/runtime/mock/`
- `backend/app/adapters/runtime/qwenpaw/`
- `backend/app/adapters/runtime/hermes/`
- `backend/app/infra/`

### 11.2 建议文件

- `backend/app/api/http/routes/__init__.py`
- `backend/app/api/http/schemas/common.py`
- `backend/app/api/http/schemas/session.py`
- `backend/app/api/http/schemas/message.py`
- `backend/app/api/http/schemas/request.py`
- `backend/app/api/http/schemas/confirmation.py`
- `backend/app/api/http/schemas/stream_event.py`
- `backend/app/application/dto/session_dto.py`
- `backend/app/application/dto/message_dto.py`
- `backend/app/application/dto/request_dto.py`
- `backend/app/application/dto/confirmation_dto.py`
- `backend/app/core/entities/session.py`
- `backend/app/core/entities/message.py`
- `backend/app/core/entities/request.py`
- `backend/app/core/entities/confirmation.py`
- `backend/app/core/policies/decision_policy.py`
- `backend/app/core/policies/confirmation_policy.py`
- `backend/app/ports/runtime_adapter.py`
- `backend/app/ports/workflow_adapter.py`
- `backend/app/ports/tool_gateway.py`
- `backend/app/adapters/runtime/mock/adapter.py`
- `backend/app/adapters/runtime/qwenpaw/README.md`
- `backend/app/adapters/runtime/hermes/README.md`
- `backend/app/infra/README.md`

### 11.3 backend 文件允许内容

- docstring
- dataclass / Protocol / ABC / Pydantic schema 占位
- 字段名
- 方法签名
- TODO
- 注释
- `raise NotImplementedError`

### 11.4 backend 文件禁止内容

- 真实 QwenPaw 调用
- 真实 Hermes 调用
- Mock 假流式
- FastAPI 业务 handler
- 真实依赖注入
- 真实业务编排
- 真实工具调用链

---

## 12. frontend 应创建的空骨架

### 12.1 目录

- `frontend/src/router/modules/`
- `frontend/src/api/modules/`
- `frontend/src/services/`
- `frontend/src/composables/`
- `frontend/src/stores/`
- `frontend/src/types/`
- `frontend/src/utils/`
- `frontend/src/views/assistant/chat/`
- `frontend/src/views/assistant/chat/components/`
- `frontend/src/components/chat/`

### 12.2 建议文件

- `frontend/src/router/modules/assistant-chat.ts`
- `frontend/src/api/http.ts`
- `frontend/src/api/modules/sessions.ts`
- `frontend/src/api/modules/messages.ts`
- `frontend/src/api/modules/requests.ts`
- `frontend/src/api/modules/confirmations.ts`
- `frontend/src/services/chat-service.ts`
- `frontend/src/services/confirmation-service.ts`
- `frontend/src/composables/use-chat-session-list.ts`
- `frontend/src/composables/use-chat-stream.ts`
- `frontend/src/composables/use-message-input.ts`
- `frontend/src/composables/use-confirmation-actions.ts`
- `frontend/src/stores/chat-session.ts`
- `frontend/src/stores/chat-message.ts`
- `frontend/src/stores/chat-confirmation.ts`
- `frontend/src/types/common.ts`
- `frontend/src/types/gateway.ts`
- `frontend/src/types/chat.ts`
- `frontend/src/types/confirmation.ts`
- `frontend/src/utils/message-normalizer.ts`
- `frontend/src/utils/stream-event.ts`
- `frontend/src/utils/time.ts`
- `frontend/src/utils/attachment.ts`
- `frontend/src/views/assistant/chat/index.vue`
- `frontend/src/views/assistant/chat/components/session-list-panel.vue`
- `frontend/src/views/assistant/chat/components/message-list-panel.vue`
- `frontend/src/views/assistant/chat/components/message-input-box.vue`
- `frontend/src/views/assistant/chat/components/confirmation-dialog.vue`
- `frontend/src/components/chat/message-bubble.vue`
- `frontend/src/components/chat/message-renderer.vue`
- `frontend/src/components/chat/empty-state.vue`

### 12.3 frontend 文件允许内容

- 文件注释
- type/interface 占位
- composable/store/service/router 签名
- TODO
- 未接线组件占位模板
- 注释说明

### 12.4 frontend 文件禁止内容

- 真实 axios 请求逻辑
- 真实 SSE 处理逻辑
- 真实 store action 逻辑
- 真实聊天 UI 交互逻辑
- provider 私有字段或 provider 分支逻辑
- 真实上传逻辑

---

## 13. 默认假设

阶段 1 文档中可使用以下默认假设，但必须显式标注：

1. session 持久化方式：待定，阶段 1 可先按“内存占位”描述
2. confirmation 审批人模型：默认按“当前会话用户”假设
3. 附件能力：阶段 1 仅为入口占位，不定义真实上传协议
4. QwenPaw 本地服务协议：待确认，不得推断为既定事实

---

## 14. 阶段 1 完成标准

阶段 1 视为完成，至少要满足：

1. 所有约定文档已落盘
2. docs / backend / frontend 骨架已创建
3. 核心 schema / dto / entity / types / ports / composables / stores / views 文件已占位
4. 所有命名与协议真源保持一致
5. 禁止项未被破坏
6. 产出清单完整可核对

---

## 15. 阶段 1 输出要求

阶段 1 执行完成后，必须输出：

### 15.1 已创建文档清单
只统计以下目录中的实际文件：

- `docs/architecture/`
- `docs/contracts/`
- `docs/integrations/`
- `docs/demo/`
- `docs/phases/`

### 15.2 已创建骨架文件清单
分两组列出：

- backend
- frontend

### 15.3 仍未实现的内容清单

至少包括：

- `QwenPawAdapter` 真实实现
- `HermesAdapter` 真实实现
- `MockRuntimeAdapter` 最小假流式
- Gateway 的真实 HTTP / SSE handler
- Tool Gateway 的真实调用链
- Decision Service 的真实规则实现
- WorkflowAdapter 的真实透传实现
- 前端真实页面、请求、流式展示、确认动作
- 真实附件上传协议
- 任何生产接口接入

### 15.4 下一阶段建议

建议默认输出为：

- 阶段 2：补统一模型、抽象接口、schema / DTO / types 对齐检查
- 阶段 3：在不接 QwenPaw 真集成前提下，允许 `MockRuntimeAdapter` 做最小闭环联调

---

## 16. 给执行代理的最终要求

执行阶段 1 时：

- 不要补充真实逻辑
- 不要自作主张扩展范围
- 不要跳过文档先写代码
- 不要引入未确认协议
- 不要暴露 provider 私有字段
- 不要把未来阶段内容提前实现

阶段 1 的核心不是“尽快跑起来”，而是“先把边界、真源、骨架和禁止项立住”。

前端实现相关任务开始前，必须确保以下文件已存在并已阅读：
- `docs/frontend/vue3-ruler-skills-compact.md`（前端规范真源）