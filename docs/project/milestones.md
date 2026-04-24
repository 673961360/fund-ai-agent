# 资金AI聊天助手 v0 - 里程碑（Milestones）

## 1. 文档目的

本文档定义 v0 项目的工程里程碑（Milestones），用于回答以下问题：

- 项目总目标与当前阶段之间有哪些中间节点
- 当前处于哪个里程碑
- 离下一个里程碑还有多远
- 每个里程碑的退出条件是什么

本文档不替代阶段交付物定义，也不定义发布条件。发布口径以 `docs/project/release-plan.md` 为准。

---

## 2. 里程碑总览

v0 总体推进拆分为 4 个里程碑：

| 里程碑 | 名称 | 对应阶段 | 状态 |
|--------|------|----------|------|
| M1 | 真源与骨架稳定 | Stage 1 | 已完成 |
| M2 | 统一模型与契约稳定 | Stage 2 | 已完成 |
| M3 | 最小闭环跑通 | Stage 3 | 进行中 |
| M4 | v0 可演示发布 | Stage 4-5 | 未进入 |

---

## 3. M1：真源与骨架稳定

### 对应阶段
Stage 1（已完成）

### 目标
建立文档真源体系，完成前后端空骨架，确立项目阅读链路。

### 范围
- 项目目标层文档建立（project-brief.md）
- 阶段交付物文档建立（stage-1-deliverables.md、stage-2-deliverables.md）
- 运行态决策文件建立（current-task.md、task-status.md、decision-log.md 等）
- 后端空骨架建立（app/ 目录结构、ports 层 Protocol 定义）
- 前端空骨架建立
- 前端规范纳入主阅读链路（vue3-ruler-skills-compact.md）
- AGENTS.md / CLAUDE.md / README.md 规则层就位

### 与阶段的关系
完全对应 Stage 1 交付物。

### 退出条件
- [x] project-brief.md 已就位，v0 目标与非目标明确
- [x] stage-1-deliverables.md 已就位
- [x] stage-2-deliverables.md 已就位，阶段 2 边界清晰
- [x] 运行态决策文件已初始化（current-task / task-status / decision-log / solution-proposal / execution-checklist / review-notes）
- [x] backend/app/ 空骨架已建立，ports 层 Protocol 已定义
- [x] 前端空骨架已建立
- [x] AGENTS.md 已就位，真源优先级与冲突处理规则明确
- [x] 前端规范已抽取至 docs/frontend/

### 完成时间
2026-04-23（Stage 1 完成）

---

## 4. M2：统一模型与契约稳定

### 对应阶段
Stage 2（已完成）

### 目标
在不接真实集成的前提下，完成五类核心资源的模型对齐、状态枚举补齐、契约细化、骨架补齐，使最小闭环联调路径定义清楚。

### 范围
- Session / Message / Request / StreamEvent / Confirmation 五类模型统一
- Session / Request / Confirmation / Workflow 状态枚举与流转约束
- Tool Gateway 契约细化（请求/响应/错误对象、治理位）
- Workflow Adapter 契约细化（start/resume/cancel/get_status）
- HTTP 路由骨架（10 个端点）
- MockRuntimeAdapter / MockWorkflowAdapter / MockToolGateway 骨架
- 最小闭环联调路径定义

### 与阶段的关系
完全对应 Stage 2 交付物。

### 退出条件
以下全部满足时，M2 视为退出：

- [ ] 五类核心资源（Session / Message / Request / StreamEvent / Confirmation）的统一模型已完成代码与契约对齐
- [ ] Session / Request / Confirmation / Workflow 的状态枚举与状态流转文档已补齐
- [ ] Tool Gateway 契约已细化到可指导后续实现（请求/响应/错误对象、校验/鉴权/审计/超时/重试/限流治理位）
- [ ] Workflow Adapter 契约已细化到可指导后续实现（start/resume/cancel/get_status 方法签名与状态迁移语义）
- [ ] 最小闭环联调路径（create request → request accepted → stream event placeholder → optional confirmation placeholder → terminal request status）已定义清楚
- [ ] HTTP 路由骨架（10 个端点）已创建，返回 501 占位
- [ ] MockRuntimeAdapter / MockWorkflowAdapter / MockToolGateway 骨架已创建
- [ ] 未引入任何真实 provider / workflow / HTTP / SSE / tool 调用链实现

### 当前进度
- 模型对齐：TASK-003 已完成
- 骨架补齐：TASK-004 已完成（Claude 复核通过）
- M2 退出条件已逐项核对，见下文退出条件 checklist

### M2 退出条件核对

| # | 退出条件 | 判定依据 | 状态 |
|---|---------|---------|------|
| 1 | 五类核心资源统一模型代码与契约对齐 | TASK-003 已完成，枚举/命名与契约一致 | ✅ |
| 2 | Session/Request/Confirmation/Workflow 状态枚举与流转文档已补齐 | 契约文档 + stage-2-deliverables.md 已定义 | ✅ |
| 3 | Tool Gateway 契约已细化 | docs/contracts/tool-gateway.md 已定义请求/响应/错误/治理位 | ✅ |
| 4 | Workflow Adapter 契约已细化 | docs/contracts/workflow-adapter.md 已定义方法签名与状态迁移 | ✅ |
| 5 | 最小闭环联调路径已定义清楚 | docs/demo/stage-2-minimal-loop-definition.md 已固化两条路径 | ✅ |
| 6 | HTTP 路由骨架（10 个端点）已创建 | TASK-004 已完成，3 个路由文件覆盖 10 端点 | ✅ |
| 7 | MockRuntimeAdapter / MockWorkflowAdapter / MockToolGateway 骨架已创建 | TASK-003/004 已完成 | ✅ |
| 8 | 未引入真实集成 | 代码审查确认全部为 501 / NotImplementedError | ✅ |

M2 退出条件 **全部满足**，可视为退出。

---

## 5. M3：最小闭环跑通

### 对应阶段
Stage 3（当前进行中）

### 目标
在不依赖真实 QwenPaw 的前提下，使用 MockRuntimeAdapter 打通最小可演示链路。

### 范围
- MockRuntimeAdapter 实现最小可工作链路
- 会话 / 消息 / 请求 / 流事件 / 确认链路可端到端演示
- 前端聊天界面可发起请求并接收流式响应占位
- Decision Service 占位实现可工作
- 仍不依赖真实 QwenPaw / 真实工具 / 真实外部系统

### 与阶段的关系
对应 Stage 3（使用 MockRuntimeAdapter 做最小闭环联调）。

### 退出条件
- [ ] MockRuntimeAdapter 可接收请求并返回占位流事件
- [ ] 前端可发起聊天请求并收到 SSE 占位响应
- [ ] Request 状态可从 accepted 流转至 terminal
- [ ] Confirmation 占位链路可工作
- [ ] 端到端演示可在本机完成，不依赖任何外部服务
- [ ] 未接入真实 QwenPaw / 真实工具 / 真实外部系统

---

## 6. M4：v0 可演示发布

### 对应阶段
Stage 4-5（未进入）

### 目标
接入真实 QwenPawAdapter，形成最小可演示发布版本。

### 范围
- QwenPawAdapter 真实接入
- 至少 2 个示例工具可用
- Decision Service / Confirmation 边界可工作
- 最小可演示版本打包

### 与阶段的关系
对应 Stage 4（接入 QwenPawAdapter 真实实现）和 Stage 5（补示例工具、完善确认链路、推进最小可运行 demo）。

### 退出条件
- [ ] QwenPawAdapter 可真实调用 QwenPaw
- [ ] 至少 2 个示例工具通过 Tool Gateway 可被调用
- [ ] Decision / Confirmation 边界在真实场景下可工作
- [ ] 最小可演示版本可独立部署并在目标机运行
- [ ] release-plan.md 中 Go-NoGo 条件全部满足

---

## 7. 当前所处里程碑

**M3：最小闭环跑通**

TASK-20260423-006（M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联）已批准，暂缓执行。
TASK-20260424-007（原型旁路：QwenPaw 直连轻量验证）已批准，待执行。

M2 已全部退出（TASK-003 + TASK-004 均已完成）。原型验证通过后可评估恢复 TASK-006 或直接推进 M4。

---

## 8. 与发布计划的关系

里程碑完成不等于版本可发布。版本是否可发布，以 `docs/project/release-plan.md` 中的 Go / No-Go 条件为准。

每个里程碑退出仅代表该阶段工程目标达成，不代表已形成可发布版本。
