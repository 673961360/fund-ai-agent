# 阶段 2 交付物定义（Stage 2 Deliverables）

## 1. 阶段目标

阶段 2 的目标不是进入真实集成，而是在阶段 1 严格通过后的基础上，完成：

- 统一模型定义
- 契约对齐
- 状态枚举与状态流转补齐
- 最小闭环联调准备

本阶段的核心是把后续联调前必须稳定的模型、状态、契约和路径先说清楚，而不是提前落真实实现。

---

## 2. 当前阶段口径

当前默认阶段为：

**阶段 2：统一模型、契约对齐、最小联调准备**

阶段 1 已完成并保留为历史基线：

- `docs/phases/stage-1-deliverables.md`

当前阶段执行真源：

1. `AGENTS.md`
2. `docs/project/project-brief.md`
3. `docs/phases/stage-2-deliverables.md`
4. `docs/frontend/vue3-ruler-skills-compact.md`（仅前端任务强制）

---

## 3. 本阶段必须完成

### 3.1 统一模型对齐

围绕以下资源完成统一模型对齐：

- `Session`
- `Message`
- `Request`
- `StreamEvent`
- `Confirmation`

对齐范围包括：

- `docs/contracts/` 真源文档
- backend `schemas / dto / entities / ports`
- frontend `types / api` 占位接口面

### 3.2 状态枚举与状态流转补齐

至少补齐以下对象的状态定义与流转约束：

- `Session`
- `Request`
- `Confirmation`
- `Workflow`

需要明确：

- 状态枚举
- 合法流转
- 终态
- 失败态 / 取消态
- 等待确认态

### 3.3 Tool Gateway / Workflow Adapter 契约细化

`Tool Gateway` 需要补齐：

- 请求对象
- 响应对象
- 错误对象
- 校验 / 鉴权 / 审计 / 超时 / 重试 / 限流治理位

`Workflow Adapter` 需要补齐：

- `start`
- `resume`
- `cancel`
- `get_status`

以及对应状态对象和状态迁移语义。

### 3.4 最小闭环联调路径定义

本阶段必须定义最小闭环联调路径，但只允许落“定义”，不允许落真实实现。

最小闭环定义真源为：

- `docs/demo/stage-2-minimal-loop-definition.md`

---

## 4. 本阶段明确不做

1. 不写真实 provider 集成
2. 不接入真实 `QwenPawAdapter`
3. 不接入真实 `HermesAdapter`
4. 不接入 LangGraph 真实实现
5. 不接入 Temporal 真实实现
6. 不实现真实 HTTP handler
7. 不实现真实 SSE handler
8. 不实现真实 Tool Gateway 调用链
9. 不实现真实 Workflow 执行链
10. 不连接任何生产接口或外部系统

---

## 5. 文档与契约落点

本阶段优先更新以下真源与定义文件：

- `docs/contracts/gateway-http-and-sse.md`
- `docs/contracts/runtime-adapter.md`
- `docs/contracts/workflow-adapter.md`
- `docs/contracts/tool-gateway.md`
- `docs/demo/stage-2-minimal-loop-definition.md`

必要时可同步更新：

- `README.md`
- `AGENTS.md`
- `docs/project/project-brief.md`

---

## 6. 最小闭环准备范围

本阶段只定义以下 mock-only 联调路径：

`create request -> request accepted -> stream event placeholder -> optional confirmation placeholder -> terminal request status`

约束：

- 仅定义路径与对象关系
- 不定义真实 provider 协议
- 不定义真实网络传输实现
- 不定义真实工具执行实现

---

## 7. 完成标准

阶段 2 视为完成，至少要满足：

1. 五类核心资源的统一模型已完成对齐
2. 状态枚举与状态流转文档已补齐
3. `Tool Gateway / Workflow Adapter` 契约已细化到可指导后续实现
4. 最小闭环联调路径已定义清楚
5. 未引入任何真实 provider / workflow / HTTP / SSE / tool 调用链实现

---

## 8. 输出要求

阶段 2 每次推进完成后，至少输出：

- 本次改动摘要
- 受影响文件清单
- 当前阶段真源是否仍一致
- 仍未实现的内容清单
- 下一步建议

