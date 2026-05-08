# Hermes Chat 原型 — Claude 项目上下文

## 项目定位

`runtime-prototypes/hermes-chat` 下的实验性前端原型。用于验证 Hermes Agent API Server 的 Chat Completions 接口联调和交互体验。

## 技术栈

- **Vue 3** Composition API + `<script setup>` + TypeScript（严格模式）
- **Vite 5** 构建，开发时代理 `/hermes-api/*` → Hermes API Server `127.0.0.1:8056`
- **markdown-it** 渲染，纯手写 CSS（无 UI 库、无预处理器）
- 包管理用 **npm**

## 硬约束

1. **API Key 仅限本地开发原型**。生产环境须由后端网关代理 Hermes 并注入鉴权。
2. **浏览器侧请求统一走 Vite 代理前缀** (`/hermes-api`)，不得直接访问 `http://127.0.0.1:8056`。
3. **SSE 解析按标准实现**：多行 data、CRLF/LF、TextDecoder stream、空行派发、keepalive 跳过、`[DONE]` 终止、AbortError 不作为错误。
4. **发送历史仅含 user/assistant/system 纯文本**，不回传 tool/thinking/UI meta，限制最近 20 轮。
5. **HermesConfig 预留** agentId/model/profile 字段（暂不启用）。
6. **不修改 `../shared/`**，除非先说明必要性并等待确认。

## API 选择

使用 **Chat Completions** (`/v1/chat/completions`)，无状态模式。未来可切到 Responses API。

## 目录速查

| 路径 | 职责 |
|------|------|
| `src/views/ChatView.vue` | 主视图，编排所有子组件和 composable |
| `src/components/` | UI 组件（Header / Sidebar / MessageList / InputBar / MessageBubble） |
| `src/composables/use-hermes-chat-session.ts` | **核心文件**: 消息收发、SSE 流、会话管理 |
| `src/composables/use-hermes-config.ts` | 运行时配置（代理前缀、API Key） |
| `src/composables/hermes-client.ts` | Hermes HTTP 客户端 |
| `src/composables/hermes-sse.ts` | SSE 流消费器（标准 SSE 解析） |
| `src/composables/hermes-session/` | 会话子模块（types, message-helpers, stream） |
| `src/types/hermes.ts` | Hermes 专用类型 + 从 shared/ 复用的类型 |
| `src/styles/chat.css` | 全部样式（含响应式断点） |
| `../shared/types.ts` | 前后端共享类型（ChatMessage, Section 等） |
| `../shared/fetch-client.ts` | HTTP 客户端基础封装 |

## 与 qwenpaw-chat 的差异

- **无 Agent 选择**：Hermes 单实例，无需切换
- **无用户登录**：全局 API Key，无用户体系
- **聊天历史**：Hermes 无历史查询端点，消息通过 localStorage 持久化，刷新后可恢复
- **无文件上传/录音/语音**：Hermes API Server 不支持
- **无流式重连**：Chat Completions 无状态

## 运行方式

```
npm run dev          # 开发服务器，localhost:5173
npm run build        # 类型检查 + 生产构建 → dist/
npm run typecheck    # 仅类型检查
```

## Claude 工作注意事项

- 核心业务逻辑在 `composables/` 层，组件层只做 UI 和事件转发
- SSE 解析器在 `hermes-sse.ts`，修改前需理解标准 SSE 规范
- CSS 响应式设计在 `chat.css`，修改样式时注意三档断点
- MessageBubble.vue 的 section 模型与 qwenpaw-chat 共享，由 shared/types.ts 定义
