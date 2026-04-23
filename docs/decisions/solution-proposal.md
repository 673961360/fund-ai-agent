# 方案提议

## 任务ID
TASK-20260423-001

## 任务名称
初始化运行态决策文件与协作闭环

## 本次任务理解
当前项目已经具备：
- 项目定位
- 阶段口径
- 代理角色规则
- 当前任务模板

但缺少真正承载“当前轮运行状态”的决策文件内容。  
因此后续 Claude / Codex 虽然有规则可读，但仍缺少当前任务真源与执行状态真源。

## 当前真源是否足够
足够支撑“初始化运行态决策文件”这项任务。

原因：
- 阶段边界已存在
- 项目定位已存在
- Claude / Codex 角色规则已存在
- 当前任务模板已存在

本轮不需要新增全局真源，只需要把运行态文件补齐。

## 冲突点 / 缺失点 / 风险点

### 当前缺失点
- `docs/decisions/current-task.md` 为空
- `docs/decisions/task-status.md` 为空
- `docs/decisions/solution-proposal.md` 为空
- `docs/decisions/execution-checklist.md` 为空
- `docs/decisions/review-notes.md` 为空

### 当前风险点
- 运行态文件为空会导致 Claude / Codex 只能依赖聊天历史
- 当前任务若定义过大，容易越过阶段边界
- 若状态直接写成 executing / done，会导致后续流程跳步

### 当前冲突点
本轮未发现必须阻塞的真源冲突。  
本轮重点不是裁决冲突，而是先把运行态文件体系点亮。

## 推荐方案
采用“最小初始化方案”：

1. 当前轮任务只聚焦“运行态决策文件初始化”
2. 本轮不进入实现、不进入 contracts 细化、不进入真实联调
3. 用一轮最小文档初始化，把协作闭环建立起来
4. 初始化完成后，下一轮再创建真正的业务/契约推进任务

## 精确执行步骤
1. 定义 `current-task.md` 的当前轮任务边界
2. 定义 `task-status.md` 的当前状态与待办
3. 定义 `solution-proposal.md` 的初始化方案
4. 定义 `execution-checklist.md` 的可执行清单
5. 在 `review-notes.md` 中记录本轮初始化动作与结果
6. 由人工决定是否将任务状态推进到 `approved_for_execution`
7. 若通过，再由 Codex 做本轮文档初始化的执行回写

## 需要 Codex 修改的文件清单
- `docs/decisions/current-task.md`
- `docs/decisions/task-status.md`
- `docs/decisions/solution-proposal.md`
- `docs/decisions/execution-checklist.md`
- `docs/decisions/review-notes.md`

## 不该做的事情
- 不改 backend / frontend
- 不改真实 contracts
- 不改 phases / project 级真源
- 不写真实 provider / workflow / runtime 接入
- 不把下一轮 contracts 任务并入本轮

## 验收标准
- 5 个 decisions 文件都已具备最小有效内容
- 当前任务与当前状态一致
- 方案与执行清单一致
- review-notes 能说明本轮干了什么
- 后续 Claude / Codex 可以基于这些文件继续推进下一轮