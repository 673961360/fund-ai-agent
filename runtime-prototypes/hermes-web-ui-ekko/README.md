# Hermes Web UI (EKKO) 部署封装

[EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) 的本地部署封装。

## 为什么本目录没有 hermes-web-ui 源码？

这是一个**部署封装目录**，不包含 hermes-web-ui 的前端源码。

- **源码在**：npm 包 `hermes-web-ui`（全局安装后位于 Node.js 全局模块目录）
- **源码仓库**：https://github.com/EKKOLearnAI/hermes-web-ui
- **npm 包**：https://www.npmjs.com/package/hermes-web-ui
- **本目录职责**：提供一键安装/启停的 bat 脚本 + Docker Compose 编排，降低本地部署门槛

如果需要对 hermes-web-ui 进行二次开发，请 clone 上游源码仓库：

```
git clone https://github.com/EKKOLearnAI/hermes-web-ui.git
cd hermes-web-ui
npm install
npm run dev
```

---

## 快速启动（npm 全局安装 — 当前已采用）

```powershell
hermes-web-ui start
# 或自定义端口
hermes-web-ui start --port 9000
```

启动后浏览器访问：**http://localhost:8648**（局域网内可通过 `http://<本机IP>:8648` 访问）

> 本目录同时提供 Docker Compose 方案（`docker-compose.yml`），适用于需要在本机完整拉起 Hermes Agent + Web UI 的场景。

## 常用 CLI 命令

| 命令 | 说明 |
|---|---|
| `hermes-web-ui start` | 后台启动（守护进程模式） |
| `hermes-web-ui start --port 9000` | 自定义端口启动 |
| `hermes-web-ui stop` | 停止后台进程 |
| `hermes-web-ui restart` | 重启后台进程 |
| `hermes-web-ui status` | 查看运行状态 |
| `hermes-web-ui update` | 更新到最新版本并重启 |
| `hermes-web-ui -v` | 显示版本号 |
| `hermes-web-ui -h` | 显示帮助信息 |

## 快捷脚本（双击运行）

| 脚本 | 说明 |
|---|---|
| `install.bat` | 一键安装依赖 + 配置 Hermes 地址 + 启动（新机首选） |
| `start.bat` | 启动 Web UI（自动加载 `.env` 配置） |
| `stop.bat` | 停止 Web UI |
| `status.bat` | 查看运行状态 |
| `update.bat` | 更新到最新版本 |
| `config.bat` | 配置 Hermes 连接地址（自动扫描端口） |
| `hermes.bat <command>` | CLI 入口（等价于上方所有脚本） |

## 目录结构

```
hermes-web-ui-ekko/
├── README.md            # 本文件
├── docker-compose.yml   # Docker 联合部署编排（备用）
├── .env.example         # Docker 环境变量模板
├── .env                 # 本地运行时配置（hermes.py config 自动生成，不入库）
├── .gitignore
├── install.bat          # 首次引导脚本：安装依赖 + 配置 + 启动
├── hermes.bat           # CLI 快捷入口 → hermes.py
├── hermes.py            # Python CLI 统一管理
├── start.bat            # 启动（→ hermes.py start）
├── stop.bat             # 停止（→ hermes.py stop）
├── status.bat           # 状态（→ hermes.py status）
├── update.bat           # 更新（→ hermes.py update）
└── config.bat           # 配置（→ hermes.py config）
```

## 架构与数据流

```
Browser (localhost:8648)
   │
   ▼
┌─────────────────────────────────────────┐
│  hermes-web-ui  Node.js Server          │
│  ├─ 前端：Vite 构建的 Vue3 SPA         │
│  ├─ 后端：Koa HTTP 服务 (port 8648)    │
│  ├─ Socket.IO 实时通信                  │
│  ├─ SQLite 本地会话/消息存储            │
│  └─ Gateway Manager 多 Profile 管理     │
└────────────┬────────────────────────────┘
             │ HTTP /v1/runs + SSE events
             ▼
┌─────────────────────────────────────────┐
│  Hermes Agent  (上游)                   │
│  默认: http://127.0.0.1:8642            │
│  通过 UPSTREAM 环境变量指定              │
│  提供 LLM 推理、工具调用、会话管理       │
└─────────────────────────────────────────┘
```

**请求路径**：
1. 用户在浏览器输入 → Vue3 前端通过 Socket.IO 发到本地 Node.js 服务
2. Node.js 服务转为 HTTP 请求 → POST 到 Hermes Agent 的 `/v1/runs` 端点
3. Hermes Agent 处理请求 → 通过 SSE（Server-Sent Events）流式返回结果
4. Node.js 服务接收 SSE → 通过 Socket.IO 推送回浏览器实时更新
5. 本地 SQLite 保存会话历史、用量统计、压缩快照

## 配置项

### 环境变量（可通过 `.env` 文件配置）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `http://127.0.0.1:8642` | Hermes Agent 地址，`hermes.py config` 自动写入 `.env` |
| `AUTH_DISABLED` | 未设置（默认启用认证） | 设为 `1` 跳过认证 |
| `AUTH_TOKEN` | 自动生成 | 自定义认证 Token，优先级高于 `AUTH_DISABLED` |
| `PORT` | `8648` | Web UI 监听端口，可通过 CLI `--port` 覆盖 |
| `CORS_ORIGINS` | `*` | 允许的跨域来源 |
| `UPLOAD_DIR` | 系统临时目录 | 文件上传暂存路径 |
| `PROFILE` | `default` | Hermes 配置 Profile 名称 |

### 配置优先级

```
CLI 参数 > .env 文件 > 环境变量 > 代码默认值
```

`.env` 文件由 `hermes.py config` 管理，手动编辑也有效。

### Hermes Profile 多配置

Hermes Agent 支持多 profile 切换，配置存储在 `~/.hermes/` 目录：

```
~/.hermes/
├── active_profile          ← 当前激活的 profile 名称
├── config.yaml             ← default profile 配置
├── auth.json               ← 认证信息
├── .env                    ← 环境变量
└── profiles/
    ├── dev/
    │   ├── config.yaml
    │   └── auth.json
    └── prod/
        ├── config.yaml
        └── auth.json
```

通过修改 `active_profile` 文件内容或设置 `PROFILE` 环境变量切换。

## 运行时数据

| 路径 | 内容 |
|---|---|
| `~/.hermes-web-ui/server.pid` | 守护进程 PID 文件 |
| `~/.hermes-web-ui/server.log` | 服务运行日志（超 3MB 自动截断） |
| `~/.hermes-web-ui/.token` | 认证 Token（首次启动自动生成） |
| `~/.hermes-web-ui/hermes_data/` | SQLite 数据库（会话、消息、用量） |
| `~/.hermes/` | Hermes Agent profile 配置 |

## 与已有 Hermes 对接

通过 `hermes.py config` 配置 `UPSTREAM` 环境变量指向 Hermes Agent 地址。本机 Hermes Agent 通常在 `127.0.0.1:8056` 运行。

如需同时保留 hermes-chat 原型的 Chat Completions / Responses API 联调，两个前端互不影响。

## 注意事项

- 首次启动时认证 Token 会在控制台输出，也可在设置页面通过用户名/密码替代
- 如无需认证，`hermes.py start` 默认设置 `AUTH_DISABLED=1`
- 局域网访问默认开启，启动日志中会显示 LAN 地址如 `http://192.168.x.x:8648`
- 迁移机器时只需重装 Node.js + `npm i -g hermes-web-ui`，再运行 `hermes.py config` 重新配置地址即可

## 其他部署方式

| 方式 | 适用场景 | 命令 |
|---|---|---|
| **npm 全局安装**（当前） | 已有 Hermes Agent 运行中 | `hermes-web-ui start` |
| **Docker Compose** | 联合部署 Hermes Agent + Web UI | `docker-compose up -d` |
| **开发模式** | 二次开发 | `git clone` 源码 + `npm install` + `npm run dev` |
