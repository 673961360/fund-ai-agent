# QwenPaw Chat 原型 — Claude 项目上下文

## 项目定位

`runtime-prototypes` 下的实验性前端原型，非生产代码。用于验证 QwenPaw 聊天界面的前后端联调和交互体验。

## 技术栈

- **Vue 3** Composition API + `<script setup>` + TypeScript（严格模式）
- **Vite 5** 构建，开发时代理 `/qwenpaw-api/*` → Flask 后端 `127.0.0.1:8088`
- **markdown-it** 渲染，纯手写 CSS（无 UI 库、无预处理器）
- 包管理用 **npm**

## 目录速查

| 路径                                          | 职责                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `src/views/ChatView.vue`                      | 主视图，编排所有子组件和 composable                                  |
| `src/components/`                             | UI 组件（Header / Sidebar / MessageList / InputBar / MessageBubble） |
| `src/composables/use-qwenpaw-chat-session.ts` | **核心文件 ~1900 行**：消息收发、SSE 流、历史、上传、录制            |
| `src/composables/use-qwenpaw-agents.ts`       | Agent 列表加载                                                       |
| `src/composables/use-qwenpaw-auth.ts`         | 认证状态                                                             |
| `src/styles/chat.css`                         | 全部样式（~1000 行，含响应式断点）                                   |
| `../shared/types.ts`                          | 前后端共享类型定义                                                   |
| `../shared/qwenpaw-client.ts`                 | HTTP 客户端（API 调用、配置管理）                                    |
| `../shared/sse-handler.ts`                    | SSE / NDJSON 流消费器                                                |

## 共享模块

`../shared/` 通过 Vite 别名 `@proto-shared` 引用，被前端和 Flask 后端共用。修改 shared 代码会影响后端。

## 开发约定

- 无 Vue Router、无 Pinia、无 UI 组件库
- 无测试框架
- 所有样式在 `src/styles/chat.css`，使用 CSS 变量
- 响应式断点在 chat.css 中定义（桌面 / 平板 / 手机）

## 运行方式

```
npm run dev          # 开发服务器，localhost:5173
npm run build        # 类型检查 + 生产构建 → dist/
npm run typecheck    # 仅类型检查
```

## Claude 工作注意事项

- 核心业务逻辑在 `composables/` 层，组件层只做 UI 和事件转发
- `use-qwenpaw-chat-session.ts` 是最复杂的文件，改动前需理解其完整的消息生命周期
- 修改 `../shared/` 的代码会影响 Flask 后端，注意跨项目影响
- CSS 响应式设计在 `chat.css`，修改样式时注意三档断点
