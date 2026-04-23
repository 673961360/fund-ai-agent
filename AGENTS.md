# 资金AI聊天助手 v0 - AGENTS.md

## 1. 项目定位

本仓库用于实现“资金AI聊天助手 v0”的可演进骨架。  
当前重点不是快速堆功能，而是先搭稳边界、抽象、契约和治理结构。

本项目是“资金AI 3.0”总体方向下的基础骨架子项目，不等于 3.0 已整体落地。  
全局背景与现状说明见：

- `README.md`
- `docs/project/program-overview.md`
- `docs/project/current-state-and-constraints.md`

---

## 2. 当前阶段口径

当前默认阶段为：

**阶段 2：统一模型、契约对齐、最小联调准备**

当前阶段重点：

- 统一 `Session / Message / Request / StreamEvent / Confirmation` 模型
- 补齐状态枚举与状态流转约束
- 细化 `Tool Gateway / Workflow Adapter / Runtime Adapter` 契约
- 定义最小闭环联调路径，但不落真实集成

当前阶段详细边界以以下文件为准：

- `docs/phases/stage-2-deliverables.md`

项目总体推进节奏与版本发布口径以以下文件为准：

- `docs/project/milestones.md`
- `docs/project/release-plan.md`

阶段 1 仅保留为历史基线：

- `docs/phases/stage-1-deliverables.md`

---

## 3. 真源优先级与冲突处理

### 3.1 第一优先级真源

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/phases/stage-2-deliverables.md`
4. `docs/decisions/current-task.md`
5. `docs/decisions/task-status.md`
6. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

### 3.2 第二优先级参考

- `README.md`
- `docs/project/*.md`
- `docs/demo/*.md`
- `docs/decisions/decision-log.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`

### 3.3 冲突处理规则

- 当前阶段执行冲突：以第一优先级真源为准
- 第二优先级文档只用于补充理解，不得覆盖当前阶段边界
- 若发现命名、边界、阶段要求冲突，应先列出冲突点，再等待确认
- 不得把“目标态”写成“现状”，不得把“候选路线”写成“既定决策”
- 如果 `current-task.md` 与阶段真源冲突，应先标记“阶段越界”，不要继续执行

---

## 4. 文件分层原则

### 4.1 稳定规则层（低频更新）

- `AGENTS.md`
- `CLAUDE.md`
- `docs/agents/*.md`

### 4.2 项目真源层（中频更新）

- `docs/project/*.md`
- `docs/phases/*.md`
- `docs/demo/*.md`

### 4.3 运行态层（高频更新）

- `docs/decisions/current-task.md`
- `docs/decisions/decision-log.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/task-status.md`

原则：

- 稳定规则层不要跟着每轮任务频繁改
- 运行态层应随着每轮推进持续回写
- 不要让会话历史替代运行态文件

---

## 5. Claude / Codex 协作模式

本项目采用：

**Claude 负责方案收敛与运行态文档维护，Codex 负责按真源执行允许范围内的修改。**

标准闭环如下：

1. 人与 Claude 讨论，推进方案、边界和任务定义
2. Claude 回写 `current-task.md / solution-proposal.md / execution-checklist.md`，必要时更新 `task-status.md`
3. Codex 读取真源与运行态文件，执行允许范围内的修改
4. Codex 回写 `review-notes.md` 与 `task-status.md`
5. 再进入下一轮方案收敛或执行

---

## 6. 新开会话规则

出现以下任一情况，建议新开 Claude / Codex 会话，并从真源重新装载：

- 当前任务目标发生变化
- 当前阶段发生变化
- 第一优先级真源有实质更新
- 连续两轮以上都在修补同一问题
- 开始引用旧口径、旧状态、旧结论
- 任务从“方案”切到“执行”，或从“执行”切到“评审”

新会话启动时，至少重新读取：

- `AGENTS.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- 本轮所需的其他真源文件

---

## 7. 通用禁止项

- 不越过当前阶段边界推进实现
- 不在未确认协议前抢跑真实 `provider / workflow / tool / HTTP / SSE`
- 不让会话历史替代真源和运行态文件
- 不借第二优先级文档擅自扩大本轮范围
- 不绕过已明确的协作闭环和允许修改范围
