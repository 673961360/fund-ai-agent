# 资金AI聊天助手 v0

资金AI聊天助手 v0 是“资金AI 3.0”方向下的基础骨架项目，当前目标是先搭出可演进、可治理、可替换运行时的聊天助手基础层，而不是先堆功能。

## 当前状态

当前仍处于骨架与契约准备阶段。  
默认阶段为 **阶段 2：统一模型、契约对齐、最小联调准备**。  
本阶段只做模型、状态、契约与最小闭环定义，不做真实集成。

## 文档入口

- 执行真源：`AGENTS.md`、`docs/project/project-brief.md`、`docs/phases/stage-2-deliverables.md`、`docs/decisions/current-task.md`、`docs/decisions/task-status.md`
- 运行态、执行记录与长期决策：`docs/decisions/solution-proposal.md`、`docs/decisions/execution-checklist.md`、`docs/decisions/review-notes.md`、`docs/decisions/decision-log.md`
- 代理入口：`CLAUDE.md`、`docs/agents/claude-solution-reviewer.md`、`docs/agents/codex-executor.md`
- 全局背景与阶段基线：`docs/project/*.md`、`docs/demo/*.md`、`docs/phases/stage-1-deliverables.md`
- 里程碑与发布计划：`docs/project/milestones.md`、`docs/project/release-plan.md`

## 协作方式

人主要与 Claude 讨论，Claude 负责方案收敛与运行态文档维护，Codex 按真源执行允许范围内的修改并回写结果。
