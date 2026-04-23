# Agents Usage

## 当前项目代理文件
- docs/agents/claude-solution-reviewer.md
- docs/agents/codex-executor.md

## 运行规则
- 这两个文件是长期角色规则，低频更新
- 当前任务与当前阶段推进，不写在这里，写到 docs/decisions/*.md
- docs/templates/current-task.template.md 只是模板，不是当前任务真源
- docs/decisions/current-task.md 才是当前任务真源

## 使用方式
### 新开 Claude 会话时
先让其阅读：
- docs/agents/claude-solution-reviewer.md
- docs/decisions/current-task.md
- docs/decisions/task-status.md

### 新开 Codex 会话时
先让其阅读：
- docs/agents/codex-executor.md
- docs/decisions/current-task.md
- docs/decisions/solution-proposal.md
- docs/decisions/execution-checklist.md
- docs/decisions/task-status.md

## 维护原则
- 代理规则文件尽量稳定，不跟着每轮任务频繁改
- 运行态文件由 Claude / Codex 按职责持续回写
- 若当前任务、阶段边界、执行清单发生变化，应先更新运行态文件，再继续执行