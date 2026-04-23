# 当前任务

## 任务ID
TASK-20260423-002

## 任务名称
工作模式优化第一轮 - 同步收口版

## 任务状态
done

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
已完成一轮规则文件瘦身，但运行态真源未完全同步：

- `docs/decisions/current-task.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`

仍停留在“初始化运行态决策文件与协作闭环”，而 `task-status.md`、`review-notes.md` 已开始记录后续工作，导致当前任务、方案、清单、状态之间出现分叉。

同时：

- `docs/decisions/decision-log.md` 尚未建立
- `docs/decisions/next-task-draft.md` 是否应启用尚未裁决

在继续推进 contracts / skeleton 之前，需要先把工作模式相关文档同步收口，避免当前任务、长期决策、执行记录和下一轮候选事项互相污染。

## 任务目标
在不触碰实现代码的前提下，同步当前运行态真源、初始化 `decision-log.md`、裁决 `next-task-draft.md` 是否立即启用，并对规则文件做最小必要微调。

## 当前阶段
阶段 2：统一模型、契约对齐、最小联调准备

## 阶段边界摘要
当前阶段允许：

- 文档、契约、状态、协作方式的对齐与收口
- 运行态文件、长期决策记录、执行清单、状态记录的同步
- 规则文件的必要微调，但不扩编规则层

当前阶段不允许：

- 真实 `provider / runtime / workflow / tool / HTTP / SSE` 集成
- backend / frontend / docs/contracts 实现推进
- 大规模重构或借机推进业务功能

## 本轮只做
- 同步 `current-task.md`、`solution-proposal.md`、`execution-checklist.md` 到当前真实任务
- 更新 `task-status.md`、`review-notes.md`，使当前任务、方案、清单、状态四者一致
- 新增 `docs/decisions/decision-log.md` 并初始化当前有效硬决策
- 判断 `next-task-draft.md` 是否应立即启用，并明确结论、启用时机与条件
- 对 `AGENTS.md`、`CLAUDE.md`、`README.md`、`docs/agents/*.md` 做必要微调

## 本轮不做
- 不改 backend / frontend / docs/contracts 实现
- 不接真实 `provider / runtime / workflow / tool / HTTP / SSE`
- 不再次大幅瘦身规则层
- 不为了凑齐优化件而强行启用 `next-task-draft.md`

## 本轮已完成的优化件
- 运行态真源同步
- `decision-log.md` 初始化
- 规则文件必要微调

## 本轮未完成 / 延后项
- `next-task-draft.md` 暂不启用；本轮只完成启用判断、启用时机和启用条件定义，未创建该文件

## 第一优先级真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`

## 本轮依赖真源
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/agents/claude-solution-reviewer.md`
- `docs/agents/codex-executor.md`
- `docs/templates/current-task.template.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`
- `docs/phases/stage-2-deliverables.md`

## 可选参考文档
- `docs/project/program-overview.md`
- `docs/project/current-state-and-constraints.md`
- `docs/project/implementation-roadmap.md`

## 允许修改文件
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

## 禁止修改文件
- `backend/**`
- `frontend/**`
- `docs/contracts/**`
- `docs/project/**`
- `docs/phases/**`
- `docs/templates/current-task.template.md`
- `docs/decisions/next-task-draft.md`
- 其他与本轮无关文件

## 前置条件
- 第一轮规则文件瘦身已完成
- 当前阶段边界明确
- 运行态文件已存在，但存在不同步问题
- 本轮任务仅限文档层优化

## 执行方式
文档同步、最小修改、允许执行。

## 完成判定
- `current-task.md`、`solution-proposal.md`、`execution-checklist.md` 已同步到当前真实任务
- `task-status.md` 与 `review-notes.md` 已与当前任务口径一致
- `docs/decisions/decision-log.md` 已建立并至少记录 5 条当前有效硬决策
- `next-task-draft.md` 是否启用已得到明确结论，且已写明原因、时机与条件
- 未越过阶段 2 边界，未把规则层写得更厚更杂
- `review-notes.md` 已回写
- `task-status.md` 已更新

## 输出物要求
- 方案：`docs/decisions/solution-proposal.md`
- 执行清单：`docs/decisions/execution-checklist.md`
- 执行结果：`docs/decisions/review-notes.md`
- 进度更新：`docs/decisions/task-status.md`
- 长期决策：`docs/decisions/decision-log.md`

## 风险提示
- 如果当前任务与下一轮草案再次混写，运行态真源会继续漂移
- 如果把执行细节写入 `decision-log.md`，会模糊它与 `review-notes.md` 的职责边界
- 如果过早启用 `next-task-draft.md`，可能在当前任务刚稳定前再引入一个新的维护面

## 验收关注点
- 是否先修正了运行态真源不同步
- `decision-log.md` 与 `review-notes.md` 是否职责分离
- `next-task-draft.md` 是否基于判断结论处理，而不是被硬加
- 是否只做了规则文件必要微调
- 是否未越过阶段 2 边界

## 交接说明
- 本轮直接由 Codex 在允许范围内完成文档同步与回写
- 人工复核通过后，可将当前任务状态收口为 `done` 或切换到下一轮正式任务
- 下一轮若进入 contracts / skeleton 推进，应先由 Claude 更新新的 `current-task.md / solution-proposal.md / execution-checklist.md`

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：Codex
- 更新说明：将当前任务同步为“工作模式优化第一轮 - 同步收口版”，并补记本轮完成项与延后项
