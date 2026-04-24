# 决策日志

## 使用规则
- 只记录已形成、会影响后续轮次的长期有效硬决策
- 不记录单轮执行细节；执行结果与过程说明写入 `docs/decisions/review-notes.md`
- 如旧决策失效，不直接覆写旧条目；应新增新条目并标记旧条目状态

## 当前有效决策

### DEC-20260423-001 当前默认阶段边界
- 状态：archived
- 决策：当前默认阶段为”阶段 2：统一模型、契约对齐、最小联调准备”，阶段边界以 `docs/phases/stage-2-deliverables.md` 为准
- 影响：所有当前任务都不得越过真实集成边界，不得把下一阶段内容写成本阶段现状
- 来源：`AGENTS.md`、`docs/phases/stage-2-deliverables.md`
- 归档原因：2026-04-23 M2 已退出，阶段切换至阶段 3

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
- 状态：archived
- 决策：当前阶段不接真实 `provider / runtime / workflow / tool / HTTP / SSE`，不接生产接口，不做真实执行链
- 影响：所有当前轮次只能推进文档、契约、模型、状态和最小闭环定义，不得抢跑真实实现
- 来源：`AGENTS.md`、`docs/phases/stage-2-deliverables.md`
- 归档原因：2026-04-23 阶段切换至阶段 3，Mock-only HTTP/SSE handler 已允许

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

### DEC-20260423-009 里程碑与发布计划层建立
- 状态：active
- 决策：建立 `docs/project/milestones.md`（4个里程碑 M1-M4）和 `docs/project/release-plan.md`（v0-internal-demo 发布口径），作为项目目标层与阶段层之间的中间层
- 影响：后续推进需以 milestones.md 回答"当前在哪个里程碑、离可发还有多远"；发布判断以 release-plan.md 的 Go-NoGo 条件为准，里程碑完成不等于版本可发布
- 来源：本轮文档补强任务

### DEC-20260423-010 M2 已退出，下一方向为 M3 最小闭环跑通
- 状态：active
- 决策：M2 退出条件全部满足（8/8），可视为退出。下一方向为 M3（Stage 3），使用 MockRuntimeAdapter 打通最小可演示链路，不依赖任何外部服务
- 影响：后续任务以 M3 退出条件为准（MockRuntimeAdapter 可接收请求并返回占位流事件、前端可发起请求并收到 SSE 占位响应、Request 状态可从 accepted 流转至 terminal）
- 来源：TASK-20260423-005 M2 收口 + M3 进入评估

### DEC-20260423-011 M3 最小闭环执行策略
- 状态：active
- 决策：M3 首个任务需先补齐基础设施（pyproject.toml + main.py + CORS），再实现 MockRuntimeAdapter 最小 mock 逻辑（submit + stream），最后实现 SSE handler。前端 API 客户端从抛错误改为按 axios 单例规范实现。事件顺序严格按契约无确认路径：request.accepted → response.delta* → response.completed → request.terminal
- 影响：TASK-006 为 M3 首个执行任务，完成后 M3 方可视为启动
- 来源：TASK-20260423-006 方案（REVISE 反馈修正版）

### DEC-20260423-012 阶段 3 当前默认阶段边界
- 状态：active
- 决策：当前默认阶段为"阶段 3：最小闭环跑通（Mock-Only）"，使用 MockRuntimeAdapter 打通最小可演示链路，允许 Mock-only HTTP/SSE handler，仍不接真实集成
- 影响：M3 任务可实现 MockRuntimeAdapter 最小 mock 逻辑、SSE 事件流、前端 API 客户端激活，但不得接真实 QwenPaw / 真实工具 / 真实外部系统
- 来源：`AGENTS.md`（已更新）、`docs/project/milestones.md`

### DEC-20260423-013 M3 前端实现规范（REVISE 反馈修正）
- 状态：active
- 决策：M3 前端 API 客户端实现按 vue3-ruler-skills-compact.md 规范执行，使用 axios 单例 + 拦截器 + 分层封装，不使用原生 fetch
- 影响：TASK-006 前端实现必须遵循 axios 单例规范，axios 原生不支持 SSE 的部分需使用浏览器 EventSource API 补充
- 来源：TASK-20260423-006 REVISE 反馈

### DEC-20260423-014 M3 不创建 POST /sessions 端点（REVISE 反馈修正）
- 状态：active
- 决策：POST /sessions 不在 docs/contracts/gateway-http-and-sse.md Section 5 的 Session HTTP 路径定义中，M3 阶段不创建此端点。session_id=null 时在 POST /requests 内部创建 mock session
- 影响：TASK-006 不修改 sessions.py，不暴露 POST /sessions 端点
- 来源：TASK-20260423-006 REVISE 反馈

### DEC-20260423-015 M3 阶段口径全仓一致（REVISE 第二轮）
- 状态：active
- 决策：docs/project/project-brief.md 的阶段说明已从"阶段 2"更新为"阶段 3"，docs/project/milestones.md 总览表已更新 M2=已完成/M3=进行中。全仓不再有"当前阶段=阶段 2"的活跃声明
- 影响：后续任务以阶段 3 为准，不再产生阶段口径冲突
- 来源：TASK-20260423-006 REVISE 第二轮反馈

### DEC-20260423-016 M3 前端依赖入口补齐（REVISE 第二轮）
- 状态：active
- 决策：TASK-006 允许修改文件中补充 frontend/package.json，声明 axios 依赖，确保前端 API 客户端 import axios 有可验证的依赖落点
- 影响：Codex 执行时需创建 frontend/package.json 并声明 axios，后续可运行 `npm install` 或 `pnpm install` 验证
- 来源：TASK-20260423-006 REVISE 第二轮反馈

### DEC-20260423-017 真源文档阶段口径全仓收口（REVISE 第三轮）
- 状态：active
- 决策：docs/project/project-brief.md 第 9 节不再指向 stage-2-deliverables.md 为当前边界，改为指向 AGENTS.md + stage-2-minimal-loop-definition.md + milestones.md + current-task.md；第 10 节阶段关系已更新为阶段 2 已完成/阶段 3 进行中；docs/project/milestones.md M2/M3 小节标题与第 7 节当前里程碑已同步更新
- 影响：全仓不再有"阶段 2 当前进行中"的活跃声明，阶段 3 已成为唯一活跃阶段口径
- 来源：TASK-20260423-006 REVISE 第三轮反馈

### DEC-20260424-008 原型验证分两步走
- 状态：active
- 决策：TASK-007 原型验证拆分为两个阶段：Phase 1 = 前端直连 QwenPaw 聊天；Phase 2 = 聊天结果反向驱动工作台 UI 状态（原型内新建工作台页面，非主线）。工作台为分屏布局（可折叠左侧导航栏 + 右侧内容区），最小面板集为 DataPanel / ConfigPanel / LogPanel。指令解析机制（QwenPaw 结构化输出 vs 前端规则匹配）待定，通过 command-bus 实现指令来源无关层
- 影响：Phase 1 完成后才能确定 Phase 2 指令解析方案；工作台页面完全在原型目录内，不触碰主线 frontend/
- 来源：2026-04-24 用户决策

### DEC-20260424-007 M3 主线任务暂缓，优先推进原型验证
- 状态：active
- 决策：TASK-20260423-006（M3 最小闭环）暂缓执行，优先创建 `runtime-prototypes/qwenpaw-chat/` 独立原型，验证前端直连 QwenPaw 的最小聊天闭环。原型是实验场，不是主线正式产品，私有协议不得写入主线文档
- 影响：后续任务以原型验证为第一优先级；原型验证通过后再评估是否恢复 TASK-006 或调整主线方向
- 来源：2026-04-24 用户决策
