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

**阶段 3：最小闭环跑通（Mock-Only）**

> 阶段 2 已完成（TASK-20260423-003 + TASK-20260423-004 均已完成，M2 已退出），详见 `docs/project/milestones.md`。

当前阶段重点：

- 使用 `MockRuntimeAdapter` 打通最小可演示链路
- 前端可发起请求并接收 SSE 占位响应
- `Request` 状态可从 `accepted` 流转至 `terminal`
- 仍不依赖真实 `QwenPaw` / 真实工具 / 真实外部系统

**原型旁路（Prototype Side-Track）**：

- `runtime-prototypes/` 目录为授权的原型实验场，允许在其中直连真实 QwenPaw API 做轻量验证
- 原型目录与主线架构物理隔离，私有协议不得写入主线 `docs/contracts/`、`frontend/`、`backend/`
- 原型验证通过后可反哺主线，但代码不直接进入主线
- 原型旁路不改变阶段 3 的 Mock-Only 边界，主线任务仍以 Mock-Only 推进

当前阶段详细边界以以下文件为准：

- `docs/phases/stage-2-deliverables.md`（阶段 2 已完成的历史基线）
- `docs/demo/stage-2-minimal-loop-definition.md`（最小闭环路径定义）
- `docs/project/milestones.md`（里程碑状态，M2 已退出，M3 进行中）

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
3. `docs/phases/stage-2-deliverables.md`（阶段 2 历史基线）
4. `docs/demo/stage-2-minimal-loop-definition.md`（最小闭环路径）
5. `docs/project/milestones.md`（里程碑状态）
6. `docs/decisions/task-board.md`（任务状态与进度唯一真源）
7. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

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
- 如果 `task-board.md` 中的任务描述与阶段真源冲突，应先标记”阶段越界”，不要继续执行

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

- `docs/decisions/task-board.md`（任务状态与进度唯一真源）
- `docs/decisions/decision-log.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`

原则：

- 稳定规则层不要跟着每轮任务频繁改
- 运行态层应随着每轮推进持续回写
- 不要让会话历史替代运行态文件

---

## 5. Claude / Codex 协作模式

本项目采用共享任务看板模式，Claude 与 Codex 共同维护 `task-board.md` 作为任务状态唯一真源。

**双方均可读取和更新运行态文件，按 task-board.md 中的任务分工推进工作。**

标准闭环如下：

1. 人或 Claude 讨论，推进方案、边界和任务定义
2. Claude 回写 `task-board.md` 中的任务描述、进度和阻塞项，必要时更新 `decision-log.md`、`solution-proposal.md`、`execution-checklist.md`
3. Codex 读取真源与 task-board.md，执行允许范围内的修改
4. Codex 完成后自行更新 `task-board.md` 进度和 `review-notes.md`，也可补充 `decision-log.md` 中的执行决策
5. 任一方可判断完成并更新任务状态，进入下一轮

### 5.1 运行态文件更新规则

- `task-board.md` 是任务状态、进度和阻塞项的唯一真源，双方均可直接更新
- `current-task.md` 和 `task-status.md` 已废弃，不再更新，保留作为历史参考
- 运行态文件（task-board、review-notes、decision-log、solution-proposal、execution-checklist）由推进工作的任一方负责更新
- 代码修改仍受阶段边界约束
- 任务文件瘦身约定见 §5.2

### 5.2 任务文件瘦身约定

`task-board.md` 中的每个任务条目应聚焦于"做什么"，不再重复以下内容：
- 禁止修改文件列表（已在阶段边界和 AGENTS.md §5.1 中声明）
- 运行态文件回写责任（双方均可更新，见 §5.1）
- 真源优先级清单（已在 AGENTS.md §3 固化）
- 会话中的讨论过程、风险提示（由双方在会话中掌握或写入 review-notes.md）

保留项：任务 ID/名称/状态、目标描述、文件清单（本轮只做）、技术要点、完成判定（1-2 条 outcome）

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
- `docs/demo/stage-2-minimal-loop-definition.md`
- `docs/project/milestones.md`
- `docs/decisions/task-board.md`
- 本轮所需的其他真源文件

---

## 7. 通用禁止项

- 不越过当前阶段边界推进实现
- 不在未确认协议前抢跑真实 `provider / workflow / tool / HTTP / SSE`
- 不让会话历史替代真源和运行态文件
- 不借第二优先级文档擅自扩大本轮范围
- 不绕过已明确的协作闭环和允许修改范围
