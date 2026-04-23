# 执行清单

## 任务ID
TASK-20260423-006

## 任务名称
M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联

## 执行前检查
- [ ] 已阅读 `AGENTS.md`
- [ ] 已阅读 `docs/project/project-brief.md`
- [ ] 已阅读 `docs/demo/stage-2-minimal-loop-definition.md`（无确认路径定义）
- [ ] 已阅读 `docs/decisions/current-task.md`
- [ ] 已阅读 `docs/decisions/solution-proposal.md`
- [ ] 已阅读 `docs/contracts/gateway-http-and-sse.md`（HTTP 路径 + 事件族）
- [ ] 已阅读 `docs/contracts/runtime-adapter.md`（RuntimeAdapter 方法定义）
- [ ] 已阅读 routes/ 目录下所有路由文件
- [ ] 已阅读 adapters/runtime/mock/adapter.py
- [ ] 已阅读 frontend/src/api/http.ts

## 步骤1：后端依赖与入口补齐
- [ ] 创建 `backend/pyproject.toml` — fastapi + uvicorn[standard] + pydantic
- [ ] 创建 `backend/main.py` — FastAPI 应用入口 + mount_routes + CORS
- [ ] 创建 `backend/README.md` — 启动说明

## 步骤2：MockRuntimeAdapter 最小 mock 逻辑
- [ ] `submit()` 返回 RuntimeAccepted，内存记录状态
- [ ] `stream()` 异步生成器 yield 4 类事件
- [ ] `describe_capabilities()` 返回 mock 能力说明
- [ ] `cancel()` 暂保持 NotImplementedError

## 步骤3：SSE Handler 实现
- [ ] `POST /requests` 调用 MockRuntimeAdapter.submit()，返回 Request 快照
- [ ] `GET /requests/{id}/events` 调用 MockRuntimeAdapter.stream()，返回 SSE 事件流
- [ ] sessions.py 添加创建 session 占位端点

## 步骤4：前端 API 客户端激活
- [ ] `frontend/src/api/http.ts`：get()/post() 改为真实请求
- [ ] `frontend/src/api/modules/requests.ts`：添加 listRequestEvents
- [ ] `frontend/src/composables/use-chat-stream.ts`：激活 SSE 连接

## 步骤5：运行态文件回写
- [ ] 回写 review-notes.md
- [ ] 回写 task-status.md

## 本轮禁止项
- [ ] 不修改 docs/contracts/**
- [ ] 不修改 docs/project/**
- [ ] 不修改 docs/phases/**
- [ ] 不修改 AGENTS.md、CLAUDE.md、README.md（根目录）
- [ ] 不修改 backend/app/adapters/workflow/**
- [ ] 不修改 backend/app/adapters/tool/**
- [ ] 不修改 backend/app/core/policies/**
- [ ] 不修改 backend/app/ports/**
- [ ] 不接真实 QwenPaw / 真实工具 / 真实外部系统

## 完成判定
- [ ] 后端可独立启动（uvicorn main:app）
- [ ] POST /requests 可返回 Request 快照（status=accepted）
- [ ] GET /requests/{id}/events 可返回 SSE 事件流
- [ ] 事件流包含 4 类事件（request.accepted / response.delta / response.completed / request.terminal）
- [ ] 前端 API 客户端可发出真实请求
- [ ] Python AST 解析通过
- [ ] 未越过阶段 3 边界
