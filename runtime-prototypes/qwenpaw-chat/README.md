# QwenPaw Chat 原型

Vue3 + TypeScript 聊天界面原型，通过 Vite 开发代理对接 QwenPaw Flask 后端。

## 前置条件

- Node.js >= 18（推荐 20+）
- QwenPaw 后端服务已启动（默认 `http://127.0.0.1:8088`）

## 快速启动

### Windows

双击 `start.bat`，或：

```
start.bat
```

浏览器打开 **http://localhost:5173**，局域网其他机器使用 **http://\<本机局域网IP\>:5173**。

### 手动启动

```
npm install
npm run dev
```

## 配置

配置文件为 `.env.local`（已 gitignore，不会被提交）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_QWENPAW_TARGET` | 后端 Flask 服务地址 | `http://127.0.0.1:8088` |
| `VITE_QWENPAW_PROXY_PREFIX` | Vite 代理前缀 | `/qwenpaw-api` |
| `VITE_QWENPAW_MODEL` | 请求使用的模型 | 空（由后端决定） |
| `VITE_QWENPAW_USER_ID` | 默认用户 ID | `default_user` |
| `VITE_QWENPAW_CHANNEL` | 渠道标识 | `console` |

修改后重启 dev server 生效。

## 架构说明

```
浏览器 (localhost:5173)
  │
  ├─ Vite dev server
  │    └─ 代理 /qwenpaw-api → 后端 Flask
  │
  ├─ src/                      Vue3 前端源码
  │   ├─ components/           UI 组件
  │   │   ├─ ChatHeader.vue    顶部栏
  │   │   ├─ ChatSidebar.vue   侧边栏（Agent 选择、登录、配置）
  │   │   ├─ ChatMessageList.vue  消息列表
  │   │   ├─ ChatInputBar.vue  输入框
  │   │   └─ MessageBubble.vue 单条消息气泡
  │   └─ composables/          组合式函数
  │       ├─ use-qwenpaw-chat-session.ts  消息收发、SSE 流处理
  │       ├─ use-qwenpaw-agents.ts        Agent 列表加载
  │       └─ use-qwenpaw-auth.ts          认证状态
  │
  └─ shared/                   前后端共享类型与客户端
      ├─ types.ts              TypeScript 类型定义
      ├─ qwenpaw-client.ts     HTTP 请求构造
      └─ sse-handler.ts        SSE 流消费
```

## 常见问题

**Q: 页面显示 "Loading agents" 一直转圈？**
A: 检查后端是否已启动，且 `.env.local` 中 `VITE_QWENPAW_TARGET` 地址正确。

**Q: 发送消息后无回复？**
A: 打开浏览器开发者工具 (F12) → Network，检查 `/qwenpaw-api` 请求是否返回错误。

**Q: 如何构建生产版本？**
A: 运行 `npm run build`，产物在 `dist/` 目录。

## 其他命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（含热更新） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅类型检查 |
| `npm run preview` | 预览生产构建 |
