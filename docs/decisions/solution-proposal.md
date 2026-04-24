# 方案提议

## 任务ID
TASK-20260423-006

## 任务名称
M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联

## 本次任务理解
M2 已全部退出，项目处于"纯骨架"状态。需先补齐依赖管理与应用入口，再实现 MockRuntimeAdapter 最小 mock 逻辑，打通无确认路径。

## REVISE 反馈处理（4个冲突点）

| # | 冲突点 | 处理方式 |
|---|--------|---------|
| 1 | AGENTS.md 声明阶段 2 但任务执行阶段 3 | AGENTS.md 已更新为阶段 3，补充 M3 真源 |
| 2 | 任务状态 proposal_ready 未批准 | 状态推进至 approved_for_execution |
| 3 | 前端要求 fetch 但规范强制 axios 单例 | 修订为按 axios 单例 + 拦截器实现 |
| 4 | POST /sessions 不在契约中 | 删除此端点，改为 POST /requests 内部处理 session_id=null |
| 5 | project-brief.md 仍写阶段 2 | 已更新为阶段 3 |
| 6 | milestones.md 总览表仍写 M2 进行中/M3 未进入 | 已更新为 M2 已完成/M3 进行中 |
| 7 | 前端缺少依赖落点 | 允许修改文件补充 frontend/package.json |

## 推荐方案
采用"基础设施补齐 + Mock 串联"方案，分 5 部分执行。

## 精确执行步骤

### 步骤1：后端依赖与入口补齐
1. 创建 `backend/pyproject.toml` — fastapi + uvicorn[standard] + pydantic
2. 创建 `backend/main.py` — FastAPI 应用入口，调用 mount_routes，配置 CORS
3. 创建 `backend/README.md` — 启动说明

### 步骤2：MockRuntimeAdapter 最小 mock 逻辑
1. 修改 `backend/app/adapters/runtime/mock/adapter.py`：
   - `submit()` 返回 RuntimeAccepted，内存记录状态
   - `stream()` 异步生成器 yield 4 类事件（request.accepted → response.delta×N → response.completed → request.terminal）
   - `describe_capabilities()` 返回 mock 能力说明
   - `cancel()` 暂保持 NotImplementedError

### 步骤3：SSE Handler 实现
1. 修改 `backend/app/api/http/routes/requests.py`：
   - `POST /requests`：调用 MockRuntimeAdapter.submit()，返回 Request 快照
   - 当 session_id 为 null 时，内部创建 mock session UUID
   - `GET /requests/{request_id}/events`：调用 MockRuntimeAdapter.stream()，返回 SSE 事件流

### 步骤4：前端依赖与 API 客户端激活（按 axios 单例规范）
1. 创建 `frontend/package.json` — 声明 axios 依赖
2. 修改 `frontend/src/api/http.ts`：按规范实现 axios 单例（baseURL、timeout、拦截器）
3. 修改 `frontend/src/api/modules/requests.ts`：使用 axios 单例调用
4. 修改 `frontend/src/composables/use-chat-stream.ts`：激活 SSE 连接

### 步骤5：运行态文件回写
更新 current-task / task-status / solution-proposal / execution-checklist / review-notes

## 验收标准
- 后端可独立启动
- POST /requests 可返回 Request 快照（status=accepted）
- GET /requests/{id}/events 可返回 SSE 事件流（4 类事件完整）
- 前端 API 客户端按 axios 单例规范实现
- Python AST 解析通过
- 未越过阶段 3 边界
- 未创建 POST /sessions 端点
