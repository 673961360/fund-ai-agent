# Hermes Web UI

> 本地运行的 AI 助手网页界面，对接 Hermes Agent 提供对话、工具调用等能力。

## 快速开始（新用户看这里）

### 前提条件

已安装 **Node.js**（官网 https://nodejs.org/，下载 LTS 版本即可）。

### 一键安装

双击 `install.bat`，它会帮你：

1. 安装 Web UI 依赖
2. 自动扫描本机 Hermes Agent 端口
3. 启动界面

安装完成后浏览器会自动打开 **http://localhost:8648**。

## 日常使用

| 操作 | 方法 |
|---|---|
| 启动 | 双击 `start.bat` |
| 停止 | 双击 `stop.bat` |
| 查看状态 | 双击 `status.bat` |
| 更新 | 双击 `update.bat` |
| 重新配置连接地址 | 双击 `config.bat` |

> 所有 `.bat` 文件出错时会自动暂停，不会一闪而过，方便你看错误信息。

## 配置 Hermes 连接地址

Web UI 需要知道 Hermes Agent 的地址才能工作。

### 方法一：自动扫描（推荐）

双击 `config.bat`，它会自动扫描本机常见端口并提示你选择。

### 方法二：手动编辑

用记事本打开目录下的 `.env` 文件，修改 `UPSTREAM` 的值：

```
UPSTREAM=http://127.0.0.1:8056
```

常见端口：
| 服务 | 默认地址 |
|------|----------|
| Hermes Agent（本机） | `http://127.0.0.1:8056` |
| Hermes Agent（另一台机器） | `http://192.168.x.x:8056` |

配置完成后双击 `start.bat` 生效。

## 换机器后怎么操作？

1. 重新安装 Node.js
2. 双击 `install.bat`
3. 完成
