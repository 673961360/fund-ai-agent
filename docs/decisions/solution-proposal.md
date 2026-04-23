# 方案提议

## 任务ID
TASK-20260423-002

## 任务名称
工作模式优化第一轮 - 同步收口版

## 本次任务理解
当前项目已完成：

- `AGENTS.md`、`CLAUDE.md`、`README.md` 第一轮瘦身
- 运行态决策文件的最小初始化

当前仍未完成：

- `current-task.md`、`solution-proposal.md`、`execution-checklist.md` 未同步到本轮真实任务
- `decision-log.md` 尚未建立
- `next-task-draft.md` 是否应启用尚未裁决

因此，本轮重点不是继续扩展规则层，而是先把“当前任务真源、长期决策记录、执行记录”同步收口。

## 当前真源是否足够
足够支撑本轮工作模式优化。

原因：

- 阶段边界已由 `AGENTS.md` 与 `docs/phases/stage-2-deliverables.md` 明确
- 当前任务模板与现有运行态文件已足够支撑同步修正
- 本轮只做文档层优化，不依赖 backend / frontend / contracts 实现推进

## 冲突点 / 缺失点 / 风险点

### 本轮启动时的同步缺口
- `current-task.md` 仍描述上一轮“初始化运行态决策文件与协作闭环”
- `solution-proposal.md` 与 `execution-checklist.md` 仍围绕旧任务展开
- `task-status.md` 与 `review-notes.md` 已提前记录后续优化，导致运行态真源分叉

### 本轮启动时的缺失点
- `docs/decisions/decision-log.md` 不存在
- `next-task-draft.md` 是否启用没有结论，当前任务与下一轮候选事项缺少明确边界

### 本轮要规避的风险
- 若继续沿用旧的 current-task，会让后续轮次误读当前任务边界
- 若把执行细节写入 `decision-log.md`，会破坏它与 `review-notes.md` 的职责分工
- 若现在硬启用 `next-task-draft.md`，会在当前真源刚修正时再增加一个维护面

## 推荐方案
采用“同步收口 + 最小增量”的方案：

1. 先把 `current-task.md`、`solution-proposal.md`、`execution-checklist.md` 同步到本轮真实任务
2. 再把 `task-status.md` 与 `review-notes.md` 同步为同一口径，消除运行态分叉
3. 新建 `docs/decisions/decision-log.md`，只记录跨轮长期有效的硬决策，不复制执行细节
4. 本轮结论为：`next-task-draft.md` 暂不启用

暂不启用原因：

- 当前最紧迫的问题是修正已有真源不同步，而不是继续新增运行态文件
- 当前项目尚未出现稳定、持续的“当前任务未结束但下一轮草案必须独立存放”的高频场景
- 在 current-task / solution-proposal / execution-checklist 刚恢复同步时，立即再引入一个草案文件，复杂度增益不划算

建议启用时机：

- 当前任务真源已连续多轮保持同步
- 当前轮和下一轮任务讨论开始频繁并行
- 需要在不改写 `current-task.md` 的前提下，先沉淀可评审的下一轮任务草案

建议启用条件：

- `current-task.md`、`solution-proposal.md`、`execution-checklist.md` 已连续 2 轮以上保持同步
- 同时存在两个以上待选择的下一轮任务候选，或“当前任务/下一轮草案”混写问题再次出现

5. 对规则文件只做必要微调：登记 `decision-log.md` 的存在，以及它的维护责任，不再做第二轮大瘦身

## 精确执行步骤
1. 重写 `current-task.md`，使其反映本轮真实任务边界
2. 重写 `solution-proposal.md`，明确本轮方案与 `next-task-draft.md` 的判断结论
3. 重写 `execution-checklist.md`，确保执行步骤和完成判定与当前任务一致
4. 更新 `task-status.md` 与 `review-notes.md`，同步当前状态、执行结果和残留项
5. 新增 `docs/decisions/decision-log.md`，初始化当前有效硬决策
6. 对 `AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/agents/*.md` 做必要微调
7. 自检当前任务、方案、清单、状态四者是否一致，并确认 `next-task-draft.md` 未被硬启用

## 需要 Codex 修改的文件清单
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/agents/claude-solution-reviewer.md`
- `docs/agents/codex-executor.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/decisions/decision-log.md`

## 不该做的事情
- 不改 backend / frontend / docs/contracts 实现
- 不接真实 `provider / runtime / workflow / tool / HTTP / SSE`
- 不把 `review-notes.md` 的执行细节复制进 `decision-log.md`
- 不为了“看起来完整”而强行新增 `next-task-draft.md`
- 不再次大幅瘦身 `AGENTS.md`、`CLAUDE.md`、`README.md`

## 验收标准
- 当前任务、方案、执行清单、任务状态四者已同步
- `decision-log.md` 已建立，并至少记录 5 条当前有效硬决策
- 已明确写出：哪些优化已立即落地，哪些被延后，以及延后原因
- 已明确写出：`next-task-draft.md` 暂不启用、何时启用、启用条件是什么
- `decision-log.md` 与 `review-notes.md` 的职责边界清晰
- 未越过阶段 2 边界，未把规则文件写得更厚更杂
