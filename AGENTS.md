# 资金AI聊天助手 v0 - AGENTS.md

## 1. 项目定位

本项目用于实现“资金AI聊天助手 v0”的可演进骨架。  
重点不是快速堆功能，而是先搭对边界、抽象、契约和治理结构。

本仓库的核心目标：

- 建立稳定的 Frontend / Gateway 边界
- 建立可替换的 Runtime Adapter
- 建立独立的 Decision Service
- 建立统一的 Workflow Adapter 抽象
- 建立统一的 Tool Gateway
- 预留日志、trace、人工确认等治理位

详细项目背景、目标、非目标、成功标准，见：

- `docs/project/project-brief.md`

当前阶段边界与交付物，见：

- `docs/phases/stage-1-deliverables.md`

---

## 2. 阅读顺序

进入任何实现前，必须优先阅读：

1. `docs/project/project-brief.md`
2. `docs/phases/stage-1-deliverables.md`
3. `docs/frontend/vue3-ruler-skills-compact.md`（涉及前端任务时必读）
4. 当前阶段涉及的 contracts 文档
5. 当前阶段涉及的 architecture / integration 文档

如果未阅读上述文件，不应直接进入编码。

---

## 3. 长期设计原则

### 3.1 稳定边界

- Frontend 与 Assistant Gateway 是稳定边界
- Frontend 不允许直接耦合任何具体 Runtime
- Gateway 不允许暴露 Runtime 私有协议给 Frontend

### 3.2 决策分层

必须严格区分：

- 会话决策
- 业务决策

业务决策不得散落在前端、Gateway、RuntimeAdapter 中。  
是否允许执行、是否需要人工确认、是否进入长流程，应由 Decision Service / Tool Gateway / WorkflowAdapter 承担。

### 3.3 可替换运行时

- 上层不得依赖具体 Runtime 私有字段与私有接口
- RuntimeAdapter 只负责模型/运行时交互，不承载最终业务决策主权
- 当前以 QwenPawAdapter 为目标适配对象
- 必须预留 HermesAdapter 与 MockRuntimeAdapter 扩展点

### 3.4 工具统一治理

- RuntimeAdapter 不允许直接 import 具体工具实现
- 所有工具调用必须统一经过 Tool Gateway
- Tool Gateway 负责参数校验、鉴权、审计、超时、重试、限流与统一返回结构

### 3.5 工作流先抽象后接引擎

- 本期不实现复杂 Workflow 引擎
- 但必须先定义统一 WorkflowAdapter 契约
- 后续需可平滑接入自研 Workflow / LangGraph / Temporal

### 3.6 安全边界

- 不直接写生产接口
- 不做高风险自动执行
- 写操作默认需要人工确认
- 未确认协议前，不抢跑真实集成

---

## 4. 前端硬性约束

前端开发必须严格继承公司已有前端规范，不允许另起一套栈或风格。

优先阅读仓库内规范：

`docs/frontend/vue3-ruler-skills-compact.md`

如需追溯来源或补充细节，再参考原始目录：

`D:\svndata\nomal_C_code\AI\trade_AI\文档\需求文档\前端框架`

## 5. 技术与工程要求

- 后端使用 Python 3.13
- 后端优先 FastAPI
- 前端技术选型必须优先继承公司现有标准
- 所有主链路必须有结构化日志
- 模块职责必须清晰
- 代码中不要把业务规则写死在 prompt / skill 中
- 每个模块要有 README 或必要注释
- 要给出最小可运行 demo
- 要保留后续接 Hermes 与自研 Workflow Engine 的扩展点

---

## 6. 推荐架构

Frontend  
-> Assistant Gateway  
-> Runtime Adapter  
-> Decision Service  
-> Workflow Adapter  
-> Tool Gateway  
-> Tool Implementations  
-> Internal Systems（本期 mock / stub）

---

## 7. 开发规则

### 7.1 先研究再编码

对于复杂任务，先输出：

1. 架构理解
2. 目录结构建议
3. 模块职责划分
4. 契约草案
5. 风险与演进建议
6. 分阶段实施计划

未经确认，不进入大规模编码。

### 7.2 小步交付

优先顺序：

1. 文档与契约
2. 目录骨架
3. 抽象层
4. Stub / Mock
5. 最小 Demo
6. 前端接入
7. 示例工具

### 7.3 变更要求

每完成一个阶段，必须输出：

- 本阶段改动摘要
- 改动涉及目录 / 文件
- 当前可运行方式
- 已知限制
- 下一阶段建议

不要只给代码，不要省略说明。

---

## 8. 不允许的实现方式

以下做法视为不符合要求：

- 前端直接耦合 QwenPaw 或 Hermes
- Gateway 直接暴露 Runtime 私有协议
- RuntimeAdapter 内写死业务决策
- RuntimeAdapter 直接调用具体工具实现
- 工具调用绕过 Tool Gateway
- Workflow 没有统一抽象，后续接入需要硬拆
- 结构化日志缺失
- 写操作无人工确认边界
- 未确认协议前直接实现真实 provider 集成
- 阶段 1 提前写入未来阶段真实逻辑

---

## 9. 验收标准

v0 验收重点不是功能多少，而是：

- 边界是否清晰
- 抽象是否可演进
- Frontend 是否真正继承公司规范
- Runtime 是否可替换
- Workflow 是否可扩展
- Tool 调用是否统一治理
- 日志 / trace / 人工确认位是否已预留
- 是否可跑通最小 Demo