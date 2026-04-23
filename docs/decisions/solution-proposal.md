# 方案提议

## 任务ID
TASK-20260423-004

## 任务名称
阶段2骨架补齐 - HTTP路由骨架 + Mock适配器骨架 + Port字段对齐

## 本次任务理解
TASK-003 已完成枚举/命名对齐，但阶段2代码层仍有3处骨架缺口。本轮目标是补齐这些骨架，使阶段2"最小联调准备"可视为完成。

## 当前真源是否足够
足够。

原因：
- 契约文档已详细定义 HTTP 路径（gateway-http-and-sse.md Section 5）、方法签名（runtime-adapter.md Section 4、workflow-adapter.md Section 4、tool-gateway.md Section 4）和数据模型
- Port 层已定义 Protocol 接口，可直接作为骨架实现依据
- 现有 MockRuntimeAdapter 可作为适配器骨架模式的参考

## 缺口清单

### 缺口1：HTTP 路由骨架缺失
**契约定义**（gateway-http-and-sse.md Section 5）：
10 个端点：
- Sessions ×3：GET /sessions、GET /sessions/{id}、GET /sessions/{id}/messages
- Requests ×3：POST /requests、GET /requests/{id}、GET /requests/{id}/events
- Confirmations ×4：GET /confirmations/{id}、POST /confirmations/{id}/approve、POST /confirmations/{id}/reject、POST /confirmations

**代码实际**：`routes/` 目录为空，仅 __init__.py 存在但为占位

### 缺口2：WorkflowAdapter Mock 骨架缺失
**契约定义**（workflow-adapter.md Section 4）：
4 个方法：start / resume / cancel / get_status

**代码实际**：port 已定义（ports/workflow_adapter.py），但 adapters/workflow/ 目录不存在

### 缺口3：ToolGateway Mock 骨架缺失
**契约定义**（tool-gateway.md Section 4）：
4 个方法：validate / authorize / execute / describe_tool

**代码实际**：port 已定义（ports/tool_gateway.py），但 adapters/tool/ 目录不存在

### 缺口4：ToolCallRequest 字段缺失
**契约定义**（tool-gateway.md Section 3.1）：
10 个字段，含 workflow_id / timeout_ms / idempotency_key

**代码实际**（ports/tool_gateway.py）：仅 7 个字段，缺少上述 3 个

## 推荐方案
采用"骨架补齐"方案：所有新增文件均为空骨架 + NotImplementedError，不写业务逻辑。

## 精确执行步骤

### 步骤1：创建 HTTP 路由骨架
1. `backend/app/api/http/routes/sessions.py` — 3个端点，全部 501
2. `backend/app/api/http/routes/requests.py` — 3个端点，全部 501
3. `backend/app/api/http/routes/confirmations.py` — 4个端点，全部 501
4. 更新 `backend/app/api/http/routes/__init__.py` — 导出模块 + mount_routes

### 步骤2：创建 WorkflowAdapter Mock 骨架
1. `backend/app/adapters/workflow/__init__.py` — 空占位
2. `backend/app/adapters/workflow/mock_adapter.py` — MockWorkflowAdapter 类

### 步骤3：创建 ToolGateway Mock 骨架
1. `backend/app/adapters/tool/__init__.py` — 空占位
2. `backend/app/adapters/tool/mock_gateway.py` — MockToolGateway 类

### 步骤4：对齐 ToolCallRequest 字段
1. `backend/app/ports/tool_gateway.py` — 加 workflow_id / timeout_ms / idempotency_key

### 步骤5：Python AST 验证
对所有新增/修改的 .py 文件执行 AST 解析

### 步骤6：全局残留检查
确认无阶段越界内容，无真实集成代码

## 不该做的事情
- 不改 docs/contracts/ 文档
- 不改业务逻辑实现
- 不接真实 provider / runtime / workflow / HTTP / SSE
- 不改规则层文件

## 验收标准
- HTTP 路由骨架文件可被 Python 解析
- 所有新增方法均抛 NotImplementedError
- HTTP 路由路径与契约 Section 5 完全一致
- ToolCallRequest 字段与契约 Section 3.1 完全一致
- Python AST 解析通过
- 未越过阶段2边界
