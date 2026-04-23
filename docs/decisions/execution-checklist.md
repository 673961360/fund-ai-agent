# 执行清单

## 任务ID
TASK-20260423-004

## 任务名称
阶段2骨架补齐 - HTTP路由骨架 + Mock适配器骨架 + Port字段对齐

## 执行前检查
- [x] 已阅读 `AGENTS.md`
- [x] 已阅读 `docs/phases/stage-2-deliverables.md`
- [x] 已阅读 `docs/decisions/current-task.md`
- [x] 已阅读 `docs/decisions/solution-proposal.md`
- [x] 已阅读 `docs/contracts/gateway-http-and-sse.md`（Section 5 HTTP 路径）
- [x] 已阅读 `docs/contracts/runtime-adapter.md`（Section 4 方法定义）
- [x] 已阅读 `docs/contracts/workflow-adapter.md`（Section 3/4 对象与方法）
- [x] 已阅读 `docs/contracts/tool-gateway.md`（Section 3/4 对象与方法）
- [x] 已阅读 ports/tool_gateway.py、ports/workflow_adapter.py、ports/runtime_adapter.py
- [x] 已阅读 adapters/runtime/mock/adapter.py（作为骨架模式参考）
- [x] 已阅读 routes/__init__.py 当前状态

## 步骤1：创建 HTTP 路由骨架
- [x] `backend/app/api/http/routes/sessions.py` — GET /sessions、GET /sessions/{session_id}、GET /sessions/{session_id}/messages，全部 501
- [x] `backend/app/api/http/routes/requests.py` — POST /requests、GET /requests/{request_id}、GET /requests/{request_id}/events，全部 501
- [x] `backend/app/api/http/routes/confirmations.py` — GET /confirmations/{confirmation_id}、POST /confirmations/{confirmation_id}/approve、POST /confirmations/{confirmation_id}/reject、POST /confirmations，全部 501
- [x] 更新 `backend/app/api/http/routes/__init__.py` — 导出模块 + 定义 mount_routes(app)

## 步骤2：创建 WorkflowAdapter Mock 骨架
- [x] `backend/app/adapters/workflow/__init__.py` — 空占位
- [x] `backend/app/adapters/workflow/mock_adapter.py` — MockWorkflowAdapter 类，4个方法均抛 NotImplementedError

## 步骤3：创建 ToolGateway Mock 骨架
- [x] `backend/app/adapters/tool/__init__.py` — 空占位
- [x] `backend/app/adapters/tool/mock_gateway.py` — MockToolGateway 类，4个方法均抛 NotImplementedError

## 步骤4：对齐 ToolCallRequest 字段
- [x] `backend/app/ports/tool_gateway.py` — ToolCallRequest 加 workflow_id / timeout_ms / idempotency_key（均为 Optional，默认 None）

## 步骤5：Python AST 验证
- [x] 对所有新增/修改的 .py 文件执行 AST 解析，确认语法正确

## 步骤6：自检与回写
- [x] 所有新增方法是否均抛 NotImplementedError
- [x] HTTP 路由路径是否与契约 Section 5 完全一致
- [x] ToolCallRequest 字段是否与契约 Section 3.1 完全一致
- [x] 未越过阶段2边界
- [x] 回写 review-notes.md
- [x] 回写 task-status.md

## 本轮禁止项
- [x] 不修改 docs/contracts/**
- [x] 不修改 docs/project/**
- [x] 不修改 docs/phases/**
- [x] 不修改 AGENTS.md、CLAUDE.md、README.md
- [x] 不修改 backend/app/adapters/runtime/**
- [x] 不修改 backend/app/core/**
- [x] 不修改 backend/app/application/**
- [x] 不接真实 provider / runtime / workflow / HTTP / SSE

## 完成判定
- [x] HTTP 路由骨架文件可被 Python 解析
- [x] 所有新增方法均抛 NotImplementedError
- [x] HTTP 路由路径与契约 Section 5 完全一致
- [x] ToolCallRequest 字段与契约 Section 3.1 完全一致
- [x] Python AST 解析通过
- [x] 未越过阶段2边界
