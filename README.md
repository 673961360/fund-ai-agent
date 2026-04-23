# 资金AI聊天助手 v0

## 项目说明

本项目属于更上位的“资金AI 3.0”方向下的子项目。

当前目标不是直接堆砌功能型聊天机器人，而是先搭一个可持续演进的基础骨架，重点关注：

- 前端稳定
- 运行时可替换
- 决策独立
- 工具统一治理
- 工作流可扩展
- 带人工确认边界

---

## 当前状态

当前项目仍处于骨架搭建阶段。

当前默认阶段为：

**阶段 2：统一模型、契约对齐、最小联调准备**

当前阶段重点是：

- 统一资源模型
- 对齐状态与状态流转
- 细化 Tool / Workflow / Runtime 契约
- 定义最小闭环联调路径

当前阶段明确不做真实集成。

---

## 文档入口

### 当前阶段执行真源
- `AGENTS.md`
- `docs/project/project-brief.md`
- `docs/phases/stage-2-deliverables.md`
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

### 上一阶段历史基线
- `docs/phases/stage-1-deliverables.md`

### 上位说明
- `docs/project/program-overview.md`
- `docs/project/current-state-and-constraints.md`

### 候选方案
- `docs/project/architecture-options.md`

### 推进计划
- `docs/project/implementation-roadmap.md`

### 最小闭环定义
- `docs/demo/stage-2-minimal-loop-definition.md`

### 方案与执行清单
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`

### 执行结果与评审记录
- `docs/decisions/review-notes.md`

### 代理规则
- `docs/agents/claude-solution-reviewer.md`
- `docs/agents/codex-executor.md`

---

## 协作方式

本项目采用文档驱动协作方式：

- 人主要与 Claude 讨论
- Claude 负责方案收敛与运行态文档更新
- Codex 负责按真源执行允许范围内的修改
- 执行结果回写文档，再进入下一轮循环

---

## 注意事项

- 不要把目标态写成现状
- 不要把候选路线写成既定决策
- 不要在真源冲突时继续推进实现
- 不要越过当前阶段边界抢跑真实集成