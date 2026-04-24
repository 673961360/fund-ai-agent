# 执行清单

## 任务ID
TASK-20260423-006

## 任务名称
M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联

## REVISE 反馈处理
- [x] 阶段边界冲突：AGENTS.md 已更新为阶段 3
- [x] 任务状态未批准：推进至 approved_for_execution
- [x] 前端规范冲突：改为按 axios 单例 + 拦截器实现
- [x] 接口契约风险：删除 POST /sessions 端点
- [x] project-brief.md 阶段口径残留：已更新为阶段 3
- [x] milestones.md 总览表不一致：已更新 M2=已完成/M3=进行中
- [x] 前端缺少依赖落点：允许修改文件补充 frontend/package.json
- [x] project-brief.md 第 9/10 节仍指向阶段 2：已改为指向阶段 3，不再以 stage-2-deliverables.md 为当前边界
- [x] milestones.md M2/M3 小节标题与第 7 节：已同步更新为 M2 已完成/M3 进行中

## 执行前检查
- [ ] 已阅读 `AGENTS.md`（阶段 3 已更新）
- [ ] 已阅读 `docs/demo/stage-2-minimal-loop-definition.md`（无确认路径定义）
- [ ] 已阅读 `docs/project/milestones.md`（里程碑状态）
- [ ] 已阅读 `docs/contracts/gateway-http-and-sse.md`（HTTP 路径 + 事件族）
- [ ] 已阅读 `docs/contracts/runtime-adapter.md`（RuntimeAdapter 方法定义）
- [ ] 已阅读 `docs/frontend/vue3-ruler-skills-compact.md`（axios 单例规范）
- [ ] 已阅读 `backend/app/api/http/routes/requests.py`
- [ ] 已阅读 `backend/app/adapters/runtime/mock/adapter.py`
- [ ] 已阅读 `frontend/src/api/http.ts`

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
- [ ] session_id=null 时内部创建 mock session UUID（不暴露独立端点）
- [ ] `GET /requests/{id}/events` 调用 MockRuntimeAdapter.stream()，返回 SSE 事件流

## 步骤4：前端依赖与 API 客户端激活（按 axios 单例规范）
- [ ] 创建 `frontend/package.json` — 声明 axios 依赖
- [ ] `frontend/src/api/http.ts`：按规范实现 axios 单例 + 拦截器
- [ ] `frontend/src/api/modules/requests.ts`：使用 axios 单例调用
- [ ] `frontend/src/composables/use-chat-stream.ts`：激活 SSE 连接

## 步骤5：运行态文件回写
- [ ] 回写 review-notes.md
- [ ] 回写 task-status.md

## 本轮禁止项
- [ ] 不修改 docs/contracts/**
- [ ] 不修改 docs/project/**
- [ ] 不修改 docs/phases/**
- [ ] 不修改 CLAUDE.md、README.md（根目录）
- [ ] 不修改 backend/app/adapters/workflow/**
- [ ] 不修改 backend/app/adapters/tool/**
- [ ] 不修改 backend/app/core/policies/**
- [ ] 不修改 backend/app/ports/**
- [ ] 不修改 backend/app/api/http/routes/sessions.py
- [ ] 不接真实 QwenPaw / 真实工具 / 真实外部系统
- [ ] 不创建 POST /sessions 端点
- [ ] 不创建除 frontend/package.json 外的其他前端工程文件（如 node_modules、构建配置等）

## 完成判定
- [ ] 后端可独立启动（uvicorn main:app）
- [ ] POST /requests 可返回 Request 快照（status=accepted）
- [ ] GET /requests/{id}/events 可返回 SSE 事件流
- [ ] 事件流包含 4 类事件（request.accepted / response.delta / response.completed / request.terminal）
- [ ] 前端 API 客户端按 axios 单例规范实现
- [ ] frontend/package.json 已创建并声明 axios 依赖
- [ ] Python AST 解析通过
- [ ] 未越过阶段 3 边界
- [ ] 未创建 POST /sessions 端点
