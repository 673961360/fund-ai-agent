# Hermes Web UI — 技术文档

## 源码去向

这是一个**部署封装目录**，不包含 hermes-web-ui 的前端源码。

- **源码在**：npm 包 `hermes-web-ui`（全局安装后位于 Node.js 全局模块目录）
- **源码仓库**：https://github.com/EKKOLearnAI/hermes-web-ui
- **npm 包**：https://www.npmjs.com/package/hermes-web-ui

如需二次开发，请 clone 上游源码：

```
git clone https://github.com/EKKOLearnAI/hermes-web-ui.git
cd hermes-web-ui
npm install
npm run dev
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + Vue3 SPA |
| 后端 | Koa HTTP 服务 |
| 实时通信 | Socket.IO |
| 本地存储 | SQLite（会话、消息、用量统计） |
| 守护进程 | npm CLI `hermes-web-ui` |

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

1. 用户输入 → Vue3 前端通过 Socket.IO 发本地 Node.js
2. Node.js 转 HTTP → POST 到 Hermes Agent `/v1/runs`
3. Hermes Agent 通过 SSE 流式返回
4. Node.js 接收 SSE → Socket.IO 推送回浏览器
5. SQLite 保存会话历史、用量统计、压缩快照

## npm CLI 命令

| 命令 | 说明 |
|---|---|
| `hermes-web-ui start` | 后台启动（守护进程模式） |
| `hermes-web-ui start --port 9000` | 自定义端口 |
| `hermes-web-ui stop` | 停止后台进程 |
| `hermes-web-ui restart` | 重启 |
| `hermes-web-ui status` | 查看运行状态 |
| `hermes-web-ui update` | 更新到最新版本并重启 |
| `hermes-web-ui -v` | 显示版本号 |

## Python CLI（hermes.py）

所有 `.bat` 文件最终都调用 `hermes.py`：

| 子命令 | 说明 |
|--------|------|
| `hermes.py install` | 检查 Node.js → npm install -g → 自动配置 → 启动 |
| `hermes.py config` | 端口扫描 → 选择地址 → 写入 `.env` |
| `hermes.py start` | 加载 `.env` → 设置 `AUTH_DISABLED` → 启动 |
| `hermes.py stop` | 停止服务 |
| `hermes.py status` | 查看状态 |
| `hermes.py update` | 更新到最新版本 |

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `http://127.0.0.1:8642` | Hermes Agent 地址，`hermes.py config` 自动写入 `.env` |
| `AUTH_DISABLED` | 未设置（默认启用认证） | 设为 `1` 跳过认证 |
| `AUTH_TOKEN` | 自动生成 | 自定义认证 Token |
| `PORT` | `8648` | Web UI 监听端口 |
| `CORS_ORIGINS` | `*` | 允许的跨域来源 |
| `UPLOAD_DIR` | 系统临时目录 | 文件上传暂存路径 |
| `PROFILE` | `default` | Hermes Profile 名称 |
| `HERMES_BIN` | 自动设置 | `hermes` CLI 路径，由 `hermes.py start` 指向 Hermes Agent 的 `.venv/Scripts/hermes.exe`。v0.5.28+ 的 gateway manager 依赖此变量，路径写死在 `hermes.py` 中，换环境需同步修改 |
| `HERMES_HOME` | 自动设置 | Hermes Agent 数据目录（含 `.env`、`config.yaml` 等）。v0.5.28+ 在 Windows 上默认查找 `%LOCALAPPDATA%\hermes`，但 Hermes Agent 实际使用 `%USERPROFILE%\.hermes`，由 `hermes.py start` 强制对齐 |

**配置优先级**：CLI 参数 > `.env` 文件 > 环境变量 > 代码默认值

## Hermes Profile 多配置

Hermes Agent 支持多 profile 切换，配置存储在 `~/.hermes/`：

```
~/.hermes/
├── active_profile          ← 当前激活的 profile
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
| `~/.hermes-web-ui/server.pid` | 守护进程 PID |
| `~/.hermes-web-ui/server.log` | 运行日志（超 3MB 自动截断） |
| `~/.hermes-web-ui/.token` | 认证 Token（首次启动自动生成） |
| `~/.hermes-web-ui/hermes_data/` | SQLite 数据库 |
| `~/.hermes/` | Hermes Agent profile 配置 |

## 与已有 Hermes 对接

运行 `hermes.py config`，它会自动扫描本机常见端口（8056/8642/3000/5000/8080/8888）并选中第一个监听中的端口。也可手动输入地址。

如需与 hermes-chat 原型联调，两个前端互不影响。

## Docker 部署

本目录同时提供 `docker-compose.yml`，适用于需要在本机完整拉起 Hermes Agent + Web UI 的场景：

```
docker-compose up -d
```
