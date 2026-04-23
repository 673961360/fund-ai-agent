# 当前任务

## 任务ID
TASK-20260423-001

## 任务名称
初始化运行态决策文件与协作闭环

## 任务状态
proposal_ready

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
当前项目已经补齐了 AGENTS.md、CLAUDE.md、README.md 以及代理规则文件，但 `docs/decisions/*.md` 仍为空，导致 Claude / Codex 的协作闭环还没有真正运行起来。

在继续推进 contracts、骨架设计和最小联调准备之前，需要先把运行态决策文件初始化完成，使“Claude 收敛方案并回写运行态文件，Codex 读取运行态文件执行”的模式可真正落地。

## 任务目标
初始化并填充最小可运行的运行态决策文件，使项目进入“文档驱动协作可运行”状态。

## 当前阶段
阶段 2：统一模型、契约对齐、最小联调准备

## 阶段边界摘要
当前阶段允许：
- 统一模型、状态、契约、最小闭环定义
- 方案文档、决策文档、执行清单、状态记录
- 最小范围内的骨架和占位准备

当前阶段不允许：
- 真实 provider 集成
- 真实 QwenPaw / Hermes 接入
- 真实 HTTP / SSE handler
- 真实 Tool / Workflow 执行链
- 生产接口
- 大规模重构

## 本轮只做
- 初始化 `docs/decisions/current-task.md`
- 初始化 `docs/decisions/task-status.md`
- 初始化 `docs/decisions/solution-proposal.md`
- 初始化 `docs/decisions/execution-checklist.md`
- 初始化 `docs/decisions/review-notes.md`
- 明确当前协作闭环与下一步推进顺序

## 本轮不做
- 不改 backend / frontend 代码
- 不改真实 contracts 内容
- 不接真实 provider / runtime / workflow / tool
- 不推进真实联调
- 不做大规模目录重构

## 第一优先级真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`

## 本轮依赖真源
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/agents/claude-solution-reviewer.md`
- `docs/agents/codex-executor.md`

## 可选参考文档
- `docs/project/program-overview.md`
- `docs/project/current-state-and-constraints.md`
- `docs/project/architecture-options.md`
- `docs/project/implementation-roadmap.md`
- `docs/demo/stage-2-minimal-loop-definition.md`

## 允许修改文件
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`

## 禁止修改文件
- `backend/**`
- `frontend/**`
- `docs/contracts/**`
- `docs/project/**`
- `docs/phases/**`
- `docs/templates/current-task.template.md`
- 其他与本轮无关文件

## 前置条件
- 已完成 AGENTS / CLAUDE / README / agents 文件的基础搭建
- 当前任务边界明确
- 当前阶段真源已存在

## 执行方式
方案优先，文档初始化，不进入实现。

## 完成判定
- 5 个 `docs/decisions/*.md` 文件已填充最小可运行内容
- 当前任务、任务状态、方案、执行清单、评审记录之间无明显冲突
- 当前协作闭环可被 Claude / Codex 正常读取
- `review-notes.md` 已记录本轮初始化结果
- `task-status.md` 已更新

## 输出物要求
- 方案：`docs/decisions/solution-proposal.md`
- 执行清单：`docs/decisions/execution-checklist.md`
- 执行结果：`docs/decisions/review-notes.md`
- 进度更新：`docs/decisions/task-status.md`

## 风险提示
- 如果运行态文件彼此不一致，后续 Claude / Codex 会读错上下文
- 如果当前任务定义过大，容易把“初始化决策文件”与“推进 contracts”混在一起
- 如果本轮状态误写成已执行完成，可能导致 Codex 直接跳过方案阶段

## 验收关注点
- 是否把“初始化协作系统”与“推进业务设计”分开
- 是否明确当前任务只做决策文件初始化
- 是否为下一轮真正的 contracts 任务留出清晰入口
- 是否没有越过阶段 2 边界

## 交接说明
- 本轮由 Claude 产出初始化方案与清单
- 经人工确认后，可将任务状态切到 `approved_for_execution`
- 再由 Codex 执行允许范围内的文档初始化与回写
- 初始化完成后，下一轮任务再切换到具体的 contracts / skeleton 推进

## 最近一次更新
- 更新时间：2026-04-23
- 更新人：mowenbo
- 更新说明：初始化当前任务定义，启动运行态决策文件体系