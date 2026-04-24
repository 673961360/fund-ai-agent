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
6. `docs/decisions/current-task.md`
7. `docs/decisions/task-status.md`
8. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

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
2.5 Claude 执行 `docs/decisions/publish-checklist.md` 自检，确认全仓真源一致、无残留冲突后，方可将任务状态设为 approved_for_execution
3. Codex 读取真源与运行态文件，执行允许范围内的修改
4. Codex 仅产出代码与配置，不回写任何运行态文件
5. Claude 判断完成，自行更新 `task-status.md` 与 `review-notes.md`
6. 再进入下一轮方案收敛或执行

### 5.1 Codex 默认执行规则（固化）

以下规则已在 AGENTS.md 层面固化，任务文件无需重复声明：

- **Codex 只能创建或修改 `runtime-prototypes/**` 下的文件** — 该目录外的任何文件都是只读的
- **Codex 不修改任何 `docs/` 目录下的文件** — 运行态文件（task-status、review-notes、decision-log 等）由 Claude 负责更新
- **Codex 不修改任何根目录文件**（CLAUDE.md、README.md、AGENTS.md 等）
- Codex 完成执行后，由 Claude 根据实际产出自行判定是否完成、是否需要修订
- 如需在任务中额外约束（例如允许修改某个特定文档），由 `current-task.md` 显式声明覆盖上述默认规则

### 5.2 任务文件瘦身约定

`current-task.md` 应聚焦于"做什么"，不再重复以下内容：
- 禁止修改文件列表（已在 AGENTS.md §5.1 固化）
- Codex 运行态回写责任（已由 Claude 承担）
- 真源优先级清单（已在 AGENTS.md §3 固化）
- 本轮不做 / 风险提示 / 验收关注点 / 交接说明（由 Claude 在会话中掌握，不写入任务文件）

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
