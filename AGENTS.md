# 资金AI聊天助手 v0 - AGENTS.md

## 1. 项目定位

本仓库用于实现“资金AI聊天助手 v0”的可演进骨架。  
当前重点不是快速堆功能，而是先搭稳边界、抽象、契约和治理结构。

本项目是“资金AI 3.0”总体方向下的基础骨架子项目，不等于 3.0 已整体落地。  
总体方向、当前现状与约束，见：

- `README.md`
- `docs/project/program-overview.md`
- `docs/project/current-state-and-constraints.md`

---

## 2. 文档优先级

### 2.1 第一优先级真源（直接驱动当前阶段执行）

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/phases/stage-2-deliverables.md`
4. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

### 2.2 阶段 1 历史基线（用于回溯上一阶段边界，不直接驱动当前阶段执行）

- `docs/phases/stage-1-deliverables.md`

### 2.3 第二优先级参考（帮助理解全局，不直接覆盖当前阶段执行边界）

5. `docs/project/program-overview.md`
6. `docs/project/current-state-and-constraints.md`
7. `docs/project/architecture-options.md`
8. `docs/project/implementation-roadmap.md`

### 2.4 文档导航

完整文档分类与入口，见：

- `README.md`

---

## 3. 冲突处理规则

- 当前阶段执行冲突：**以第一优先级真源为准**
- 第二优先级文档用于帮助理解全局方向，不得直接覆盖当前阶段边界
- 若第二优先级文档与第一优先级真源冲突，不得擅自按第二优先级修改代码或扩大范围
- 如发现命名、边界、阶段要求冲突，应先列出冲突点，再等待确认
- 不得把“目标态”写成“现状”，不得把“候选路线”写成“既定决策”

---

## 4. 当前阶段口径

当前默认阶段为：

**阶段 2：统一模型、契约对齐、最小联调准备**

当前阶段重点：

- 统一 Session / Message / Request / StreamEvent / Confirmation 模型
- 补齐状态枚举与状态流转约束
- 细化 Tool Gateway / Workflow Adapter 契约
- 定义最小闭环联调路径，但不落真实集成
- 禁止抢跑真实 provider / workflow / tool / HTTP / SSE 实现

当前阶段详细边界，以以下文件为准：

- `docs/phases/stage-2-deliverables.md`

上一阶段历史基线保留为：

- `docs/phases/stage-1-deliverables.md`

---

## 5. 阅读顺序

### 5.1 通用任务

进入任何实现前，必须优先阅读：

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/phases/stage-2-deliverables.md`

### 5.2 前端任务

在通用任务基础上，额外必读：

4. `docs/frontend/vue3-ruler-skills-compact.md`

### 5.3 架构 / 路线讨论任务

在通用任务基础上，可额外参考：

4. `docs/project/program-overview.md`
5. `docs/project/current-state-and-constraints.md`
6. `docs/project/architecture-options.md`
7. `docs/project/implementation-roadmap.md`

如果未阅读第一优先级真源，不应直接进入编码。

---

## 6. 长期设计原则

### 6.1 稳定边界

- Frontend 与 Assistant Gateway 是稳定边界
- Frontend 不允许直接耦合任何具体 Runtime
- Gateway 不允许暴露 Runtime 私有协议给 Frontend

### 6.2 决策分层

必须严格区分：

- 会话决策
- 业务决策

业务决策不得散落在前端、Gateway、RuntimeAdapter 中。  
是否允许执行、是否需要人工确认、是否进入长流程，应由 Decision Service / Tool Gateway / WorkflowAdapter 承担。

### 6.3 可替换运行时

- 上层不得依赖具体 Runtime 私有字段与私有接口
- RuntimeAdapter 只负责模型/运行时交互，不承载最终业务决策主权
- 必须预留 QwenPaw / Hermes / MockRuntimeAdapter 扩展点
- 未确认协议前，不抢跑真实 provider 集成

### 6.4 工具统一治理

- RuntimeAdapter 不允许直接 import 具体工具实现
- 所有工具调用必须统一经过 Tool Gateway
- Tool Gateway 负责参数校验、鉴权、审计、超时、重试、限流与统一返回结构

### 6.5 工作流先抽象后接引擎

- 当前阶段不实现复杂 Workflow 引擎
- 但必须先定义统一 WorkflowAdapter 契约
- 后续需可平滑接入自研 Workflow / LangGraph / Temporal

### 6.6 安全边界

- 不直接写生产接口
- 不做高风险自动执行
- 写操作默认需要人工确认
- 所有 AI 能力必须具备回退与留痕能力

---

## 7. 前端硬性约束

前端开发必须严格继承公司已有前端规范，不允许另起一套栈或风格。

优先阅读仓库内规范：

- `docs/frontend/vue3-ruler-skills-compact.md`

如需追溯来源或补充细节，再参考原始来源目录。

---

## 8. 技术与工程要求

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

## 9. 开发规则

### 9.1 先研究再编码

对于复杂任务，先输出：

1. 架构理解
2. 目录结构建议
3. 模块职责划分
4. 契约草案
5. 风险与演进建议
6. 分阶段实施计划

未经确认，不进入大规模编码。

### 9.2 小步交付

优先顺序：

1. 文档与契约
2. 目录骨架
3. 抽象层
4. Stub / Mock
5. 最小 Demo
6. 前端接入
7. 示例工具

### 9.3 变更要求

每完成一个阶段，必须输出：

- 本阶段改动摘要
- 改动涉及目录 / 文件
- 当前可运行方式
- 已知限制
- 下一阶段建议

不要只给代码，不要省略说明。

---

## 10. 当前阶段禁止项

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
- 阶段 2 提前写入真实 provider / workflow / HTTP / SSE / tool 调用链
- 把第二优先级候选方案直接当成本阶段实现要求
- 把 3.0 目标态表述成当前已落地事实

---

## 11. 验收重点

v0 验收重点不是功能多少，而是：

- 边界是否清晰
- 抽象是否可演进
- Frontend 是否真正继承公司规范
- Runtime 是否可替换
- Workflow 是否可扩展
- Tool 调用是否统一治理
- 日志 / trace / 人工确认位是否已预留
- 是否可跑通最小 Demo

---

## 12. 一句话总结

“资金AI聊天助手 v0”不是先做一个功能完整的聊天机器人，而是先搭出一个**前端稳定、运行时可替换、决策独立、工具统一治理、工作流可扩展、带人工确认边界**的基础骨架。
