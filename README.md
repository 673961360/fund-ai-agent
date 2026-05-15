# 资金AI聊天助手 v0

资金AI聊天助手 v0 是“资金AI 3.0”方向下的基础骨架项目，当前目标是先搭出可演进、可治理、可替换运行时的聊天助手基础层，而不是先堆功能。

## 当前状态

当前仍处于骨架与契约准备阶段。  
默认阶段为 **阶段 3：最小闭环跑通（Mock-Only）**。  
本阶段使用 MockRuntimeAdapter 打通最小可演示链路，不做真实集成。

## 文档入口

- 执行真源：`AGENTS.md`、`docs/project/project-brief.md`、`docs/phases/stage-2-deliverables.md`、`docs/decisions/task-board.md`
- 运行态、执行记录与长期决策：`docs/decisions/solution-proposal.md`、`docs/decisions/execution-checklist.md`、`docs/decisions/review-notes.md`、`docs/decisions/decision-log.md`
- 代理入口：`CLAUDE.md`、`docs/agents/claude-solution-reviewer.md`、`docs/agents/codex-executor.md`
- 全局背景与阶段基线：`docs/project/*.md`、`docs/demo/*.md`、`docs/phases/stage-1-deliverables.md`
- 里程碑与发布计划：`docs/project/milestones.md`、`docs/project/release-plan.md`

## 协作方式

人主要与 Claude 讨论，Claude 与 Codex 共同维护 `task-board.md`，双方按任务分工推进工作。

## 文档导航

按你的角色和目的，选择对应的入口：

### 我是新来的，想快速了解这个项目

| 文档 | 内容 |
|------|------|
| `AGENTS.md` | 项目定位、阶段边界、协作模式、禁止项 |
| `docs/project/project-brief.md` | 项目背景、现状、约束 |
| `docs/project/program-overview.md` | "资金AI 3.0"总体方向说明 |

### 我是开发者，想本地跑起来

| 文档 | 内容 |
|------|------|
| `DEVELOPER.md` | 技术文档、开发环境、运行方式 |

### 我是 AI 代理（Claude / Codex），准备开始执行

| 文档 | 内容 |
|------|------|
| `CLAUDE.md` | 会话入口：读什么、按什么角色、默认行为 |
| `docs/decisions/task-board.md` | 任务看板（第一优先级真源） |
| `docs/phases/stage-2-deliverables.md` | 阶段边界与交付物 |

### 我想看架构设计和 API 契约

| 文档 | 内容 |
|------|------|
| `docs/architecture/system-overview.md` | 系统整体架构 |
| `docs/contracts/gateway-http-and-sse.md` | HTTP 网关 + SSE 流式协议 |
| `docs/contracts/runtime-adapter.md` | 运行时适配器契约 |
| `docs/contracts/tool-gateway.md` | 工具网关契约 |
| `docs/contracts/workflow-adapter.md` | 工作流适配器契约 |

### 我想把前端聊天组件集成到自己的 Vue 项目中

| 文档 | 内容 |
|------|------|
| `runtime-prototypes/qwenpaw-chat/INTEGRATION.md` | QwenPaw Chat 原型集成指南（多 Agent、有认证） |
| `runtime-prototypes/hermes-chat/INTEGRATION.md` | Hermes Chat 原型集成指南（单实例、无认证、极简） |
| `runtime-prototypes/qwenpaw-chat/CLAUDE.md` | QwenPaw Chat 原型技术上下文 |
| `runtime-prototypes/hermes-chat/CLAUDE.md` | Hermes Chat 原型技术上下文 |

### 我想查看执行记录、决策和评审

| 文档 | 内容 |
|------|------|
| `docs/decisions/decision-log.md` | 长期决策记录 |
| `docs/decisions/review-notes.md` | 评审笔记 |
| `docs/decisions/solution-proposal.md` | 方案提案 |
| `docs/decisions/execution-checklist.md` | 执行检查清单 |

## 快速开始

### 1. 安装依赖

本项目使用 `uv` 管理 Python 虚拟环境和依赖（如适用）。前端原型使用 `npm`。

### 2. 启动前端原型

**QwenPaw Chat（完整版，多 Agent + 认证）**：

```bash
cd runtime-prototypes/qwenpaw-chat
npm install          # 首次运行需安装依赖
npm run dev          # 启动开发服务器，访问 http://localhost:5173
```

启动前请检查 `.env.local` 中的 `VITE_QWENPAW_TARGET` 已指向你的 QwenPaw 后端地址。

**Hermes Chat（极简版，单实例 + 无认证）**：

```bash
cd runtime-prototypes/hermes-chat
npm install          # 首次运行需安装依赖
npm run dev          # 启动开发服务器，访问 http://localhost:5173
```

启动前请检查 `.env.local` 中的 `VITE_HERMES_TARGET` 已指向你的 Hermes API Server 地址。

### 3. 验证后端可达

启动前端前，确认后端服务可用：

```bash
# QwenPaw 后端
curl http://127.0.0.1:8088/api/auth/status

# Hermes 后端
curl http://127.0.0.1:8056/health
```

详细集成步骤、环境变量说明和首次使用流程，请参阅对应的 `INTEGRATION.md` 文档。
