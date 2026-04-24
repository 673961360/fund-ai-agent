# 资金AI聊天助手 v0 - 项目简报（Project Brief）

## 1. 项目背景

“资金AI聊天助手 v0”是面向资金AI体系建设的基础能力项目。  
本项目不是直接去做一个功能堆砌型聊天机器人，而是先建设一个**可演进、可治理、可替换运行时**的聊天助手骨架，为后续资金AI相关能力接入提供统一入口与稳定边界。

当前本机已经安装并可使用 QwenPaw。  
本期不实现 runtime 本体，而是围绕本机 QwenPaw 建设统一适配层，同时预留 Hermes 运行时适配能力，并为未来接入自研工作流编排能力打基础。

本项目与更大范围的“资金AI 3.0”目标保持一致：  
先把接入层、抽象层、契约层、治理位和人工确认边界搭好，再逐步挂载具体能力，而不是让单一 runtime、单一 prompt 或单一工具实现绑架整体架构。

---

## 2. 项目定位

本项目的定位是：

**资金AI聊天入口与中间骨架层**

它位于：

- 前端聊天界面
- Assistant Gateway（统一接入层）
- Runtime Adapter（统一运行时适配层）
- Decision Service（独立决策层）
- Workflow Adapter（统一编排适配层）
- Tool Gateway（统一工具契约层）

之间，负责把这些层次的边界先搭稳。

本项目不是：

- 一个直接耦合 QwenPaw 私有接口的本地聊天壳
- 一个把业务规则全塞进 prompt 的临时脚手架
- 一个先做复杂业务逻辑、后补治理边界的原型
- 一个直接操作生产系统的自动执行机器人

---

## 3. 本期目标（v0）

本期目标是实现“资金AI聊天助手 v0”的最小可演进骨架，包括：

1. Frontend  
   - 聊天界面基础骨架
   - 会话列表骨架
   - 文件入口占位
   - 人工确认弹窗占位

2. Assistant Gateway  
   - 统一消息协议
   - 基础 session 映射
   - 基础 trace / 审计位
   - 统一转发到 Runtime / Decision / Workflow / Tool Gateway

3. Runtime Adapter  
   - 定义统一接口
   - 本期实现 QwenPawAdapter
   - 预留 HermesAdapter / MockRuntimeAdapter

4. Decision Service v0  
   - 先做独立层
   - 初期以透传和简单规则为主
   - 保证业务决策不散落在 Gateway / Runtime / 前端中

5. Workflow Adapter  
   - 本期只做统一抽象与透传/占位实现
   - 为未来接入自研 Workflow Engine / LangGraph / Temporal 预留稳定契约

6. Tool Gateway  
   - 定义统一工具调用入口
   - 承接参数校验、审计、超时、重试、限流等治理能力
   - 屏蔽 runtime 对具体工具实现的直接依赖

7. 示例工具  
   - 2-4 个示例工具
   - 用于验证 Tool Gateway 与决策/确认边界

8. 基础日志、trace、人工确认接口预留  
   - 所有主链路必须可追踪
   - 写操作必须具备人工确认边界

---

## 4. 明确非目标（Non-Goals）

本期不追求以下内容：

1. 不实现复杂业务决策系统  
   - 不在本期做深度策略编排、复杂规则引擎或完整业务自治

2. 不直接实现 runtime 本体  
   - 不改造 QwenPaw 本身
   - 不实现 Hermes 本体

3. 不直接接入生产写操作  
   - 不做高风险自动执行
   - 不直接写生产接口

4. 不在本期完成完整工作流引擎  
   - Workflow 只做抽象与占位
   - 不提前接重型编排能力

5. 不追求前端完整产品化  
   - 本期重点是继承规范、立住结构，不是做精细化交互打磨

6. 不把业务规则写进 prompt/skill  
   - 业务规则应逐步沉淀到独立代码层与契约层中

---

## 5. 当前已知前提

### 5.1 运行时前提

- 当前本机已安装并可使用 QwenPaw
- 本期不实现 runtime 本体
- 本期围绕 QwenPaw 做统一适配层
- 后续需要支持 Hermes 适配
- 后续需要预留自研工作流编排适配能力

### 5.2 前端前提

为便于开发代理稳定读取，已从原始目录抽取仓库内精简规范文件：
`docs/frontend/vue3-ruler-skills-compact.md`

涉及前端实现时，应优先以该文件为直接规范来源；原始目录作为补充溯源材料。

### 5.3 工程前提

- 后端使用 Python 3.13
- 后端优先 FastAPI
- 所有主链路必须有结构化日志
- 模块职责必须清晰
- 要给出最小可运行 demo
- 要保留后续接 Hermes / 自研 Workflow Engine 的扩展点

---

## 6. 总体架构意图

本项目的核心意图不是“把聊天跑起来”，而是把以下几个边界先立住：

### 6.1 前端与运行时解耦

Frontend 只能面向 Assistant Gateway 和统一协议。  
前端不能知道底层到底是 QwenPaw、Hermes，还是未来其他 runtime。

### 6.2 Runtime 与业务决策分离

RuntimeAdapter 只负责模型/运行时交互。  
它不应该承载最终业务决策主权。

业务是否允许执行、是否需要人工确认、是否进入长流程，应由 Decision Service / Tool Gateway / WorkflowAdapter 共同承担。

### 6.3 工具调用统一治理

Runtime 不允许直接 import 或直接调用具体工具实现。  
所有工具调用都必须经过 Tool Gateway。

这样后续才有可能统一：

- 参数校验
- 审计
- 鉴权
- 限流
- 重试
- 超时
- 错误模型
- 调用留痕

### 6.4 工作流先抽象后接引擎

本期不实现复杂工作流编排，但必须提前定义统一 WorkflowAdapter。  
否则将来接入自研编排 / LangGraph / Temporal 时会发生硬拆。

### 6.5 人工确认边界先于自动执行

本项目必须优先保留人工确认与中断能力。  
任何涉及写操作、高风险执行、长流程推进的能力，都不允许在没有人工确认边界的情况下直接穿透。

---

## 7. 为什么这样设计

本项目之所以采用“Frontend -> Gateway -> RuntimeAdapter / Decision / Workflow / Tool Gateway”的分层，不是为了形式上的架构漂亮，而是为了避免以下问题：

1. 避免前端直接绑定某个 runtime 的私有协议  
2. 避免业务规则随着 prompt 和 provider 切换而漂移  
3. 避免工具调用没有统一治理、后续无法审计  
4. 避免未来工作流编排接入时需要推倒重来  
5. 避免写操作缺少人工确认，导致安全边界薄弱  
6. 避免“先做出功能，再补结构”导致技术债堆积

---

## 8. v0 成功标准

v0 的成功不以“功能数量”作为第一标准，而以“边界与可演进性”作为第一标准。

以下条件满足时，可认为 v0 达成目标：

1. Frontend 未直接耦合 QwenPaw 私有接口  
2. Assistant Gateway 已成为统一接入边界  
3. RuntimeAdapter 已有统一抽象，并能承接 QwenPaw，预留 Hermes  
4. Decision Service 已独立存在，而不是被写散到各层  
5. WorkflowAdapter 已有统一契约，后续可扩展  
6. Tool Gateway 已成为统一工具入口  
7. 基础日志、trace、人工确认位已预留  
8. 至少存在一个最小闭环 demo  
9. 代码结构与文档结构足够支撑下一阶段继续演进

---

## 9. 当前阶段说明

当前处于：

**阶段 3：最小闭环跑通（Mock-Only）**

> 阶段 2 已完成（M2 已退出），历史阶段说明见下文。

阶段 3 的重点是在不依赖真实 QwenPaw 的前提下，使用 MockRuntimeAdapter 打通最小可演示链路：

- MockRuntimeAdapter 可接收请求并返回占位流事件
- 前端可发起请求并接收 SSE 占位响应
- `Request` 状态可从 `accepted` 流转至 `terminal`
- 仍不接真实 `QwenPaw` / 真实工具 / 真实外部系统

> 以下为阶段 2 的历史说明，仅供参考。
>
> 阶段 2 的重点是：
>
> - 对齐统一模型
> - 对齐契约定义
> - 补齐状态枚举与状态流转
> - 细化 Tool Gateway / Workflow Adapter 契约
> - 为最小闭环联调做好文档与契约准备
>
> 阶段 2 的详细边界与交付物历史基线见 `docs/phases/stage-2-deliverables.md`。

当前阶段的详细边界与交付物以以下文件为准：

- `AGENTS.md`
- `docs/demo/stage-2-minimal-loop-definition.md`
- `docs/project/milestones.md`
- `docs/decisions/current-task.md`

---

## 10. 后续阶段关系

### 阶段 1
已完成：文档真源 + 骨架

### 阶段 2
已完成：统一模型、契约对齐、最小联调准备（M2 已退出）

### 阶段 3
当前进行中：在不接 QwenPaw 真集成前提下，使用 MockRuntimeAdapter 做最小闭环联调

### 阶段 4
在 QwenPaw 协议确认后，再接入 QwenPawAdapter 真实实现

### 阶段 5
补示例工具、完善确认链路、推进最小可运行 demo

### 总体推进节奏与版本发布口径
项目里程碑定义与发布口径以 `docs/project/milestones.md` 和 `docs/project/release-plan.md` 为准。

---

## 11. 当前最重要的执行原则

1. 不为了”快跑起来”破坏边界  
2. 不为了”先看到效果”把 provider 私有协议暴露到上层  
3. 不为了”方便”把业务规则写死在 prompt / runtime / 前端里  
4. 不在未确认协议前抢跑真实集成  
5. 不在阶段 1 提前实现未来阶段逻辑  
6. 始终把”可演进、可治理、可替换”放在本期功能速度之前

---

## 12. Codex / 开发代理阅读顺序建议

进入实现前，建议优先阅读以下文件：

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/demo/stage-2-minimal-loop-definition.md`
4. `docs/project/milestones.md`
5. `docs/decisions/current-task.md`
6. `docs/frontend/vue3-ruler-skills-compact.md`（涉及前端任务时必读）
7. 当前阶段涉及的 contracts 文档
8. 当前阶段涉及的 architecture / integration 文档

---

## 13. 一句话总结

“资金AI聊天助手 v0”不是要先做一个功能完整的聊天机器人，而是要先搭出一个**前端稳定、运行时可替换、决策独立、工具统一治理、工作流可扩展、带人工确认边界**的基础骨架。
