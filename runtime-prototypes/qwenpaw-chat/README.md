# QwenPaw Chat 原型

QwenPaw 聊天界面的 Vue 3 原型，通过 SSE 流式连接与 QwenPaw Flask 后端进行实时对话。属于 `runtime-prototypes` 实验性代码路径，用于验证前后端联调和交互体验。

## 功能特性

- 多 Agent 选择与切换（从后端动态加载 Agent 列表）
- SSE 流式消息展示（含思考过程、工具调用/结果、正式应答分区展示）
- 聊天历史管理（创建、切换、删除）
- 文件 / 图片 / 音频附件上传
- 浏览器端语音录制（MediaRecorder API）
- Markdown 内容渲染（代码高亮、链接自动新窗口）
- 可选的认证 / 登录系统（Token 持久化到 localStorage）
- 运行时配置面板（侧边栏可修改 API 地址、Channel、User ID、Model）
- 完整响应式布局（桌面 / 平板 / 手机三档断点）

## 技术栈

| 维度 | 选型 | 说明 |
|------|------|------|
| 框架 | Vue 3 (Composition API + `<script setup>`) | 无 Router / Pinia |
| 语言 | TypeScript | 严格模式 |
| 构建 | Vite 5 | 开发代理转发后端请求 |
| Markdown | markdown-it | 链接自动 `target="_blank"` |
| 样式 | 纯手写 CSS（CSS 变量） | 无 UI 组件库、无预处理器 |
| 包管理 | npm | — |

## 前置条件

- Node.js >= 18（推荐 20+）
- QwenPaw 后端服务已启动（默认 `http://127.0.0.1:8088`）

## 快速启动

### Windows 一键启动

双击 `start.bat`，或命令行执行：

```
start.bat
```

脚本会自动检查 Node.js → 安装依赖 → 启动 dev server。浏览器打开 **http://localhost:5173**，局域网其他机器使用 **http://\<本机局域网IP\>:5173**。

### 手动启动

```
npm install
npm run dev
```

## 项目结构

```
qwenpaw-chat/
├── src/
│   ├── main.ts                              应用入口
│   ├── App.vue                              根组件
│   ├── views/
│   │   └── ChatView.vue                     主聊天视图（组件编排层）
│   ├── components/
│   │   ├── ChatHeader.vue                   顶部栏（标题、Agent 名、状态徽章）
│   │   ├── ChatSidebar.vue                  侧边栏（Agent 选择、历史、登录、配置）
│   │   ├── ChatMessageList.vue              消息列表（滚动管理、空状态）
│   │   ├── ChatInputBar.vue                 输入框（附件、语音、发送/停止）
│   │   └── MessageBubble.vue                消息气泡（Markdown、图片、文件、音频）
│   ├── composables/
│   │   ├── use-qwenpaw-chat-session.ts      核心业务逻辑（~1900 行）
│   │   ├── use-qwenpaw-agents.ts            Agent 列表加载
│   │   └── use-qwenpaw-auth.ts              认证状态管理
│   ├── types/
│   │   └── chat-ui.ts                       UI 层专属类型
│   ├── utils/
│   │   └── render-markdown.ts               markdown-it 封装
│   └── styles/
│       └── chat.css                         全局样式（含响应式）
│
└── ../shared/                               前后端共享模块（@proto-shared 别名）
    ├── types.ts                             完整 TypeScript 类型定义
    ├── qwenpaw-client.ts                    HTTP 请求客户端
    └── sse-handler.ts                       SSE / NDJSON 流消费器
```

核心业务逻辑集中在 `use-qwenpaw-chat-session.ts`，负责消息收发、SSE 流解析、聊天历史、文件上传、语音录制等。

## 配置

### 环境变量

配置文件为 `.env.local`（已 gitignore），参照 `.env.example` 创建：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_QWENPAW_TARGET` | 后端 Flask 服务地址 | `http://127.0.0.1:8088` |
| `VITE_QWENPAW_PROXY_PREFIX` | Vite 代理前缀 | `/qwenpaw-api` |
| `VITE_QWENPAW_MODEL` | 请求使用的模型 | 空（由后端决定） |
| `VITE_QWENPAW_USER_ID` | 默认用户 ID | `default_user` |
| `VITE_QWENPAW_CHANNEL` | 渠道标识 | `console` |

修改后重启 dev server 生效。

### 运行时配置

启动后在浏览器侧边栏底部的「运行时配置」面板可动态修改 API 地址、Channel、User ID、Model，无需重启（存入 localStorage）。

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（含热更新） |
| `npm run build` | 类型检查 + 生产构建（产物在 `dist/`） |
| `npm run typecheck` | 仅类型检查 |
| `npm run preview` | 预览生产构建 |

## 常见问题

**Q: 页面显示 "Loading agents" 一直转圈？**
A: 检查后端是否已启动，且 `.env.local` 中 `VITE_QWENPAW_TARGET` 地址正确。

**Q: 发送消息后无回复？**
A: 打开浏览器开发者工具 (F12) → Network，检查 `/qwenpaw-api` 请求是否返回错误。

**Q: 如何构建生产版本？**
A: 运行 `npm run build`，产物在 `dist/` 目录。

**Q: 修改了 shared/ 下的代码会影响什么？**
A: `../shared/` 是前后端共享模块，修改会影响 Flask 后端。注意同步验证。
