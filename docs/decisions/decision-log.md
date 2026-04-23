# 决策日志

## 使用规则
- 只记录已形成、会影响后续轮次的长期有效硬决策
- 不记录单轮执行细节；执行结果与过程说明写入 `docs/decisions/review-notes.md`
- 如旧决策失效，不直接覆写旧条目；应新增新条目并标记旧条目状态

## 当前有效决策

### DEC-20260423-001 当前默认阶段边界
- 状态：active
- 决策：当前默认阶段为“阶段 2：统一模型、契约对齐、最小联调准备”，阶段边界以 `docs/phases/stage-2-deliverables.md` 为准
- 影响：所有当前任务都不得越过真实集成边界，不得把下一阶段内容写成本阶段现状
- 来源：`AGENTS.md`、`docs/phases/stage-2-deliverables.md`

### DEC-20260423-002 Claude / Codex 职责分工
- 状态：active
- 决策：Claude 负责方案收敛与运行态文档维护；Codex 负责按真源执行允许范围内的修改，并回写执行结果
- 影响：方案收敛、执行落地、回写责任需要保持分工清晰，避免角色越位
- 来源：`AGENTS.md`、`CLAUDE.md`、`docs/agents/claude-solution-reviewer.md`、`docs/agents/codex-executor.md`

### DEC-20260423-003 current-task.md 是当前任务真源
- 状态：active
- 决策：`docs/decisions/current-task.md` 是当前任务边界、允许修改文件与完成判定的直接真源；`docs/templates/current-task.template.md` 只是模板
- 影响：未同步到 `current-task.md` 的任务，不应被视为稳定当前任务
- 来源：`docs/agents/claude-solution-reviewer.md`、`docs/agents/codex-executor.md`

### DEC-20260423-004 当前阶段禁止真实集成
- 状态：active
- 决策：当前阶段不接真实 `provider / runtime / workflow / tool / HTTP / SSE`，不接生产接口，不做真实执行链
- 影响：所有当前轮次只能推进文档、契约、模型、状态和最小闭环定义，不得抢跑真实实现
- 来源：`AGENTS.md`、`docs/phases/stage-2-deliverables.md`

### DEC-20260423-005 运行态文件的更新责任
- 状态：active
- 决策：形成新任务、新边界、新执行顺序、新验收共识时，需同步更新 `current-task.md`、`solution-proposal.md`、`execution-checklist.md`，必要时更新 `task-status.md`
- 影响：会话历史不能替代运行态文件；运行态文件不同步时，应先修正真源再继续推进
- 来源：`AGENTS.md`、`CLAUDE.md`、`docs/agents/claude-solution-reviewer.md`

### DEC-20260423-006 review-notes.md 与 decision-log.md 职责分离
- 状态：active
- 决策：`review-notes.md` 记录单轮执行结果、风险、残留问题；`decision-log.md` 只记录跨轮长期有效的硬决策
- 影响：后续轮次查长期口径时优先看 `decision-log.md`，查单轮执行细节时看 `review-notes.md`
- 来源：`docs/decisions/review-notes.md`、`docs/decisions/decision-log.md`

### DEC-20260423-007 代码-契约对齐标准
- 状态：active
- 决策：后端三层（entity → dto → schema）和前端 types 的枚举值、事件命名必须与契约文档（docs/contracts/*.md）完全一致，以契约为真源不反向修改契约
- 影响：后续阶段3/4的代码实现必须沿用当前已对齐的枚举和命名，不得自行引入新状态值或新事件类型
- 来源：TASK-20260423-003 执行结果

### DEC-20260423-008 阶段2骨架补齐标准
- 状态：active
- 决策：阶段2"最小联调准备"要求 HTTP 路由骨架（10个端点）、WorkflowAdapter Mock 骨架、ToolGateway Mock 骨架、Port 模型字段全部补齐，全部为空实现 + NotImplementedError，不接真实集成
- 影响：骨架补齐后阶段2可视为完成，具备进入阶段3 mock联调条件
- 来源：TASK-20260423-004 方案
