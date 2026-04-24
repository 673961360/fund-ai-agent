# 当前任务

## 任务信息
- **ID**：TASK-20260424-007
- **名称**：Runtime Prototypes: QwenPaw 直连聊天页最小闭环
- **状态**：approved_for_execution
- **阶段**：阶段 3 旁路（原型验证）

## 背景
暂不推进主线 M3 任务（TASK-20260423-006），优先在 `runtime-prototypes/` 独立目录验证前端直连 QwenPaw 的最小聊天闭环。

## Phase 1 目标

前端直连 QwenPaw 聊天页面：
- 用户输入文本并发送
- 调用 QwenPaw API 获取流式回复
- 消息列表实时展示流式内容
- 基础 loading / error / empty state

## 本轮只做

### 1. 目录骨架
- `runtime-prototypes/README.md`（原型实验场边界说明）
- `runtime-prototypes/shared/`（多原型复用层）

### 2. qwenpaw-chat 项目配置
- `qwenpaw-chat/package.json`（vue ^3.4, vite ^5, typescript ^5）
- `qwenpaw-chat/vite.config.ts`（Vite proxy 解决 CORS）
- `qwenpaw-chat/index.html`、`tsconfig.json`、`tsconfig.node.json`
- `qwenpaw-chat/.env.example`（API 地址/鉴权模板）
- `qwenpaw-chat/.gitignore`

### 3. Vue 组件
- `src/main.ts`、`src/App.vue`
- `src/views/ChatView.vue`（输入框 + 消息列表 + 错误提示）
- `src/components/ChatInput.vue`（提交/禁用状态）
- `src/components/MessageList.vue`（自动滚动 + 空状态）
- `src/components/MessageBubble.vue`（用户/助手区分样式）
- `src/composables/use-chat-stream.ts`（SSE 连接 + 流式追加）
- `src/styles/chat.css`

### 4. Shared 复用层
- `shared/types.ts`（ChatMessage、ChatState）
- `shared/qwenpaw-client.ts`（fetch + ReadableStream 流式读取）
- `shared/sse-handler.ts`（SSE 连接封装）

## 技术要点
- 使用 Vite + Vue3 + TypeScript
- 本地 ref 状态管理，不引入 Pinia/Vuex
- SSE 使用浏览器原生 fetch + ReadableStream
- 组件命名与分层参考 `docs/frontend/vue3-ruler-skills-compact.md`
- API 地址/密钥通过 `.env` 本地配置，不提交到版本库

## 完成判定
- `runtime-prototypes/qwenpaw-chat/` 可独立启动（`npm install && npm run dev`）
- 页面可输入文本、发送消息、展示 QwenPaw 流式回复
- loading / error / empty 状态均已实现
