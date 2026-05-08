# Hermes Web UI (EKKO) 部署目录

[EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui) 的本地部署封装。

## 快速启动（npm 全局安装 — 当前已采用）

```powershell
hermes-web-ui start
# 或自定义端口
hermes-web-ui start --port 9000
```

启动后浏览器访问：**http://localhost:8648**

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
| `start.bat` | 启动 Web UI（后台守护进程模式） |
| `stop.bat` | 停止 Web UI |
| `status.bat` | 查看运行状态 |
| `update.bat` | 更新到最新版本并重启 |

## 目录结构

```
hermes-web-ui-ekko/
├── README.md            # 本文件
├── docker-compose.yml   # Docker 联合部署编排（备用）
├── .env.example         # Docker 环境变量模板
├── .gitignore
├── start.bat            # 启动脚本
├── stop.bat             # 停止脚本
├── status.bat           # 状态脚本
└── update.bat           # 更新脚本
```

## 其他部署方式

| 方式 | 适用场景 | 命令 |
|---|---|---|
| **npm 全局安装**（当前） | 已有 Hermes Agent 运行中 | `hermes-web-ui start` |
| **Docker Compose** | 联合部署 Hermes Agent + Web UI | `.\start.bat` |
| **开发模式** | 二次开发 | `git clone` + `npm install` + `npm run dev` |

## 与已有 Hermes 对接

本机 Hermes Agent 在 `127.0.0.1:8056` 运行，`hermes-web-ui start` 会自动探测并连接。

如需同时保留 hermes-chat 原型的 Chat Completions / Responses API 联调，两个前端互不影响。

## 注意事项

- 首次启动时认证 Token 会在控制台输出，也可在设置页面通过用户名/密码替代
- 如无需认证，可设置环境变量 `AUTH_DISABLED=1` 后启动
- 迁移机器时只需重装 Node.js + `npm i -g hermes-web-ui`
