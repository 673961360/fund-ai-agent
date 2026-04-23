# 方案提议

## 任务ID
TASK-20260423-006

## 任务名称
M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联

## 本次任务理解
M2 已全部退出，但项目处于"纯骨架"状态。需先补齐依赖管理与应用入口，再实现 MockRuntimeAdapter 最小 mock 逻辑，打通无确认路径。

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
   - `GET /requests/{request_id}/events`：调用 MockRuntimeAdapter.stream()，返回 SSE 事件流
2. 修改 `backend/app/api/http/routes/sessions.py`：
   - 添加创建 session 占位端点

### 步骤4：前端 API 客户端激活
1. 修改 `frontend/src/api/http.ts`：get()/post() 改为真实请求
2. 修改 `frontend/src/api/modules/requests.ts`：添加 listRequestEvents 方法
3. 修改 `frontend/src/composables/use-chat-stream.ts`：激活 SSE 连接

### 步骤5：运行态文件回写
更新 current-task / task-status / solution-proposal / execution-checklist / review-notes

## 验收标准
- 后端可独立启动
- POST /requests 可返回 Request 快照（status=accepted）
- GET /requests/{id}/events 可返回 SSE 事件流（4 类事件完整）
- 前端 API 客户端可发出真实请求
- Python AST 解析通过
- 未越过阶段 3 边界
