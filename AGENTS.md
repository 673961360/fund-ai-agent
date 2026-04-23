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
4. `docs/decisions/current-task.md`
5. `docs/decisions/task-status.md`
6. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

### 2.2 阶段 1 历史基线（用于回溯上一阶段边界，不直接驱动当前阶段执行）

- `docs/phases/stage-1-deliverables.md`

### 2.3 第二优先级参考（帮助理解全局，不直接覆盖当前阶段执行边界）

7. `docs/project/program-overview.md`
8. `docs/project/current-state-and-constraints.md`
9. `docs/project/architecture-options.md`
10. `docs/project/implementation-roadmap.md`
11. `docs/demo/stage-2-minimal-loop-definition.md`
12. `docs/decisions/solution-proposal.md`
13. `docs/decisions/execution-checklist.md`
14. `docs/decisions/review-notes.md`

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
- 如果 `current-task.md` 与阶段真源冲突，应先标记“阶段越界”，不要继续执行

---

## 4. 当前阶段口径

当前默认阶段为：

**阶段 2：统一模型、契约对齐、最小联调准备**

当前阶段重点：

- 统一 Session / Message / Request / StreamEvent / Confirmation 模型
- 补齐状态枚举与状态流转约束
- 细化 Tool Gateway / Workflow Adapter / Runtime Adapter 契约
- 定义最小闭环联调路径，但不落真实集成
- 禁止抢跑真实 provider / workflow / tool / HTTP / SSE 实现

当前阶段详细边界，以以下文件为准：

- `docs/phases/stage-2-deliverables.md`

上一阶段历史基线保留为：

- `docs/phases/stage-1-deliverables.md`

---

## 5. 文件分层原则

### 5.1 稳定规则层（低频更新）

用于定义长期角色、协作方式和模板结构：

- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/claude-solution-reviewer.md`
- `docs/agents/codex-executor.md`
- `docs/templates/current-task.template.md`

### 5.2 项目真源层（中频更新）

用于定义项目现状、阶段边界、总体设计和长期路线：

- `docs/project/*.md`
- `docs/phases/*.md`
- `docs/demo/*.md`

### 5.3 运行态层（高频更新）

用于承载当前任务、方案、执行清单、执行结果和当前状态：

- `docs/decisions/current-task.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/task-status.md`

**原则：**
- 稳定规则层不要跟着每轮任务频繁改
- 运行态层应随着每轮推进持续回写
- 不要让会话历史替代运行态文件

---

## 6. 协作工作模式

本项目采用：

**Claude 负责方案收敛与运行态文档维护，Codex 负责按真源执行允许范围内的修改。**

标准闭环如下：

1. 人与 Claude 讨论，推进方案、契约、结构和边界
2. Claude 判断本轮是否形成新任务或新收敛
3. 如形成新收敛，Claude 更新：
   - `docs/decisions/current-task.md`
   - `docs/decisions/solution-proposal.md`
   - `docs/decisions/execution-checklist.md`
   - 必要时 `docs/decisions/task-status.md`
4. Codex 读取运行态文件并执行允许范围内的修改
5. Codex 回写：
   - `docs/decisions/review-notes.md`
   - `docs/decisions/task-status.md`
6. Claude 再基于最新运行态进入下一轮方案推进

---

## 7. 阅读顺序

### 7.1 通用任务

进入任何分析、设计或实现前，必须优先阅读：

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/phases/stage-2-deliverables.md`
4. `docs/decisions/current-task.md`
5. `docs/decisions/task-status.md`

### 7.2 前端任务

在通用任务基础上，额外必读：

6. `docs/frontend/vue3-ruler-skills-compact.md`

### 7.3 执行任务

进入执行前，额外必读：

6. `docs/decisions/solution-proposal.md`
7. `docs/decisions/execution-checklist.md`

### 7.4 架构 / 路线讨论任务

在通用任务基础上，可额外参考：

6. `docs/project/program-overview.md`
7. `docs/project/current-state-and-constraints.md`
8. `docs/project/architecture-options.md`
9. `docs/project/implementation-roadmap.md`
10. `docs/demo/stage-2-minimal-loop-definition.md`

如果未阅读第一优先级真源，不应直接进入编码。

---

## 8. 新开会话规则

出现以下任一情况，建议新开 Claude / Codex 会话，并从真源重新装载：

- 当前任务目标发生变化
- 当前阶段发生变化
- 第一优先级真源有实质更新
- 连续两轮以上都在修补同一问题
- 开始引用旧口径、旧状态、旧结论
- 任务从“方案”切到“执行”，或从“执行”切到“评审”

新会话启动时，必须重新读取：

- `AGENTS.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- 本轮所需的其他真源文件

---

## 9. 长期设计原则

### 9.1 稳定边界

- Frontend 与 Assistant Gateway 是稳定边界
- Frontend 不允许直接耦合任何具体 Runtime
- Gateway 不允许暴露 Runtime 私有协议给 Frontend

### 9.2 决策分层

必须严格区分：

- 会话决策
- 业务决策

业务决策不得散落在前端、Gateway、RuntimeAdapter 中。  
是否允许执行、是否需要人工确认、是否进入长流程，应由 Decision Service / Tool Gateway / WorkflowAdapter 承担。

### 9.3 可替换运行时

- 上层不得依赖具体 Runtime 私有字段与私有接口
- RuntimeAdapter 只负责模型/运行时交互，不承载最终业务决策主权
- 必须预留 QwenPaw / Hermes / MockRuntimeAdapter 扩展点
- 未确认协议前，不抢跑真实 provider 集成

### 9.4 工具统一治理

- RuntimeAdapter 不允许直接 import 具体工具实现
- 所有工具调用必须统一经过 Tool Gateway
- Tool Gateway 负责参数校验、鉴权、审计、超时、重试、限流与统一返回结构

### 9.5 工作流先抽象后接引擎

- 当前阶段不实现复杂 Workflow 引擎
- 但必须先定义统一 WorkflowAdapter 契约
- 后续需可平滑接入自研 Workflow / LangGraph / Temporal

### 9.6 安全边界

- 不直接写生产接口
- 不做高风险自动执行
- 写操作默认需要人工确认
- 所有 AI 能力必须具备回退与留痕能力

---

## 10. 前端硬性约束

前端开发必须严格继承公司已有前端规范，不允许另起一套栈或风格。

优先阅读仓库内规范：

- `docs/frontend/vue3-ruler-skills-compact.md`

如需追溯来源或补充细节，再参考原始来源目录。

---

## 11. 技术与工程要求

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

## 12. 开发规则

### 12.1 先研究再编码

对于复杂任务，先输出：

1. 架构理解
2. 目录结构建议
3. 模块职责划分
4. 契约草案
5. 风险与演进建议
6. 分阶段实施计划

未经确认，不进入大规模编码。

### 12.2 小步交付

优先顺序：

1. 文档与契约
2. 目录骨架
3. 抽象层
4. Stub / Mock
5. 最小 Demo
6. 前端接入
7. 示例工具

### 12.3 变更要求

每完成一个阶段，必须输出：

- 本阶段改动摘要
- 改动涉及目录 / 文件
- 当前可运行方式
- 已知限制
- 下一阶段建议

不要只给代码，不要省略说明。

---

## 13. 当前阶段禁止项

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

## 14. 验收重点

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

## 15. 一句话总结

“资金AI聊天助手 v0”不是先做一个功能完整的聊天机器人，而是先搭出一个**前端稳定、运行时可替换、决策独立、工具统一治理、工作流可扩展、带人工确认边界**的基础骨架，并通过**Claude 方案收敛 + Codex 执行 + 决策文件回写**的方式持续推进。