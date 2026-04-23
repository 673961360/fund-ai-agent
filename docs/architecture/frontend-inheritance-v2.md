# 前端继承约束（Stage 1）

## 1. 文档定位

本文档说明阶段 1 前端骨架如何继承公司 Vue3 前端规范，并把聊天助手前端限制在统一协议边界内。

直接规范来源为 [docs/frontend/vue3-ruler-skills-compact.md](/D:/个人本地知识库/yfbcode/fund-ai/fund_ai_agent/docs/frontend/vue3-ruler-skills-compact.md)。

---

## 2. 继承原则

### 2.1 技术选型

- 使用 Vue 3
- 使用 `<script setup lang="ts">`
- 使用 Composition API
- 路由、状态、视图、类型、服务分层组织

### 2.2 边界约束

- 前端只调用 Gateway 统一协议
- 前端不直接调用 QwenPaw、Hermes 或任何 Provider 私有协议
- 前端不持有业务决策主权
- 高风险动作由 Confirmation 资源驱动，不由页面本地规则硬编码

### 2.3 阶段 1 实现限制

- `api/` 只允许保留请求签名占位
- `services/` 只允许保留调用编排签名占位
- `stores/` 只允许保留状态字段与未实现动作签名
- `composables/` 只允许保留组合式接口占位
- `views/` 与 `components/` 只允许保留未接线模板骨架

---

## 3. 推荐目录映射

本期前端骨架目录：

- `frontend/src/router/modules/`
- `frontend/src/api/modules/`
- `frontend/src/services/`
- `frontend/src/composables/`
- `frontend/src/stores/`
- `frontend/src/types/`
- `frontend/src/utils/`
- `frontend/src/views/assistant/chat/`
- `frontend/src/views/assistant/chat/components/`
- `frontend/src/components/chat/`

---

## 4. 页面骨架职责

### 4.1 聊天页 `views/assistant/chat/index.vue`

- 承担页面编排骨架
- 聚合会话列表、消息列表、输入框、确认弹窗四块区域
- 不直接写请求逻辑

### 4.2 业务组件

- `session-list-panel.vue`：会话列表骨架
- `message-list-panel.vue`：消息列表骨架
- `message-input-box.vue`：输入框骨架
- `confirmation-dialog.vue`：确认弹窗骨架

### 4.3 通用聊天组件

- `message-bubble.vue`
- `message-renderer.vue`
- `empty-state.vue`

这些组件只承担展示占位，不引入 Provider 分支逻辑。

---

## 5. 数据与状态边界

- `types/gateway.ts` 与 Gateway 契约对齐
- `types/chat.ts` 面向前端展示模型
- `types/confirmation.ts` 面向确认交互模型
- `stores/` 不固化后端未确认的字段
- `utils/` 不实现真实 SSE、附件上传与 Provider 兼容逻辑

---

## 6. 默认假设

- 会话列表排序默认依赖后端能力，前端不先行实现本地排序逻辑
- 空值语义遵循公司前端规范：不把 `null` / `undefined` 误转为 `0`
- 金融数值格式化能力暂不落地，只保留后续扩展位置

---

## 7. TODO

- TODO：阶段 2 对齐 Gateway 字段与前端展示模型差异
- TODO：阶段 2 明确确认弹窗的 UI 状态机
- TODO：阶段 3 允许在 `MockRuntimeAdapter` 前提下接最小闭环联调

