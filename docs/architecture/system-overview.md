# 系统总览（Stage 1）

## 1. 文档定位

本文档是阶段 1 的架构真源之一，用于固化“资金AI聊天助手 v0”的核心分层、责任边界与后续演进方向。

阶段 1 只允许落盘边界、命名、职责与待定项，不代表任何真实链路已经实现。

---

## 2. 分层结构

推荐分层如下：

`Frontend -> Assistant Gateway -> Runtime Adapter -> Decision Service -> Workflow Adapter -> Tool Gateway -> Tool Implementations -> Internal Systems`

其中本期仅要求搭好稳定边界与占位骨架。

---

## 3. 核心职责

### 3.1 Frontend

- 只面向 Gateway 统一协议
- 负责聊天页面骨架、会话列表骨架、消息输入骨架、人工确认入口骨架
- 不感知任何 Runtime 私有协议

### 3.2 Assistant Gateway

- 作为前后端稳定边界
- 负责统一接收请求、分配 `request_id` 与 `trace_id`
- 负责会话映射、基础审计位、确认对象创建占位
- 负责把请求转发给 Runtime / Decision / Workflow / Tool Gateway
- 生产访问必须经独立 API Gateway，不允许绕过网关直连生产执行系统

### 3.3 Runtime Adapter

- 负责与具体运行时交互
- 只承载运行时协议适配，不承载业务决策主权
- 当前目标适配对象为 `QwenPawAdapter`
- 必须预留 `HermesAdapter` 与 `MockRuntimeAdapter`

### 3.4 Decision Service

- 负责业务决策占位
- 后续用于判断是否允许执行、是否需要人工确认、是否转入工作流
- 阶段 1 只固化接口位置与职责，不实现规则

### 3.5 Workflow Adapter

- 提供统一工作流编排抽象
- 负责长流程的状态查询、恢复、取消等契约占位
- 阶段 1 不接任何真实工作流引擎

### 3.6 Tool Gateway

- 作为所有工具调用的唯一入口
- 负责参数校验、鉴权、审计、超时、重试、限流与统一错误模型
- Runtime 不允许绕过该层直接调用工具实现

---

## 4. 稳定边界

阶段 1 需要明确以下稳定边界：

1. Frontend 只认识 Gateway 契约，不认识 Provider 私有字段
2. Gateway 不向 Frontend 暴露 Runtime 私有协议
3. Runtime Adapter 不直接 import 工具实现
4. Tool Gateway 不内嵌业务页面逻辑
5. 写操作默认需要人工确认边界
6. 前端可通过 nginx 代理访问资金 AI 模块服务，但这不等于前端直连生产机器猫
7. 任何生产访问路径都应先经过独立 API Gateway，再进入后续执行与数据接入层

---

## 5. 关键资源

阶段 1 固化以下资源模型命名：

- `Session`
- `Message`
- `Request`
- `StreamEvent`
- `Confirmation`

字段与接口定义以 [docs/contracts/gateway-http-and-sse.md](/D:/个人本地知识库/yfbcode/fund-ai/fund_ai_agent/docs/contracts/gateway-http-and-sse.md) 为准。

---

## 6. 默认假设

- Session 持久化方式：待定，阶段 1 先按“内存占位”描述
- Confirmation 审批人模型：默认假设为当前会话用户
- 附件能力：仅保留入口占位，不定义真实上传协议
- QwenPaw 本地服务协议：待确认，不视为既定事实

---

## 7. 阶段 1 禁止项

- 不实现真实 HTTP / SSE handler
- 不实现真实 QwenPaw / Hermes 调用
- 不实现真实 Tool Gateway 调用链
- 不实现真实工作流引擎
- 不实现真实业务规则
- 不连接任何生产接口或外部系统

---

## 8. 待定项与 TODO

- TODO：补充 Gateway 内部 session 映射与 trace 留痕策略
- TODO：补充 Confirmation 生命周期与超时策略
- TODO：补充 Workflow 与 Confirmation 的衔接约束
- TODO：在阶段 2 对齐 backend schema / dto / entity 与 frontend types
