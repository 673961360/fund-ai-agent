# Python HTTP 接入 QwenPaw 指南

## 0. 从零开始的完整接入流程

### 步骤 1：确认 QwenPaw 服务状态

```bash
# 在 qwenpaw 目录下执行
status_qwenpaw.bat
# 确认端口 8088 已监听
# 浏览器打开：http://127.0.0.1:8088/docs 确认 Swagger 文档可用
```

### 步骤 2：安装依赖

```bash
# 使用 uv 管理（推荐）
uv add requests httpx

# 或使用 pip
pip install requests httpx
```

### 步骤 3：选择 HTTP 客户端

| 客户端 | 适用场景 | 说明 |
|--------|---------|------|
| `requests` | 同步调用、脚本、简单集成 | 不支持原生 SSE，需手动解析 |
| `httpx` | 异步调用、流式 SSE | 支持 `Client.stream()` 原生处理 SSE |

> **推荐**：流式聊天使用 `httpx`，简单调用使用 `requests`。

### 步骤 4：按场景接入

1. **认证模块** — 登录获取 Token
2. **Agent 管理** — 列出 Agent、切换 Agent
3. **同步调用** — 非流式问答（`stream: false`）
4. **流式调用** — SSE 实时输出
5. **聊天历史** — 加载历史记录

---

## 1. 服务概览

| 项目 | 值 |
|------|-----|
| 服务地址 | `http://127.0.0.1:8088` |
| 协议 | HTTP/1.1 (FastAPI + Uvicorn) |
| 绑定 | 仅 `127.0.0.1`（不可外部直连） |
| API 文档 | `http://127.0.0.1:8088/docs`（Swagger UI） |
| 认证方式 | JWT Bearer Token |
| 流式协议 | Server-Sent Events (SSE) |

---

## 2. 基础封装类

### 2.1 QwenPawClient（基于 requests）

> 适用于同步调用场景，包含认证、Agent 管理、非流式聊天、聊天历史等完整功能。

```python
"""qwenpaw_client.py — QwenPaw HTTP 客户端（同步版，基于 requests）"""

import json
import time
from typing import Generator, Optional
from urllib.parse import urljoin

import requests


class QwenPawClient:
    """QwenPaw REST API 客户端（同步）"""

    def __init__(self, base_url: str = "http://127.0.0.1:8088"):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self._token: str | None = None
        self._agent_id: str = "default"

    # ── 认证 ──────────────────────────────────────────────

    def login(self, username: str, password: str, expires_in: int = 604800) -> dict:
        """登录并保存 Token"""
        resp = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password, "expires_in": expires_in},
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self._token}"})
        return data

    def logout(self) -> None:
        """清除 Token"""
        self._token = None
        self.session.headers.pop("Authorization", None)

    @property
    def is_authenticated(self) -> bool:
        return self._token is not None

    def check_auth_status(self) -> dict:
        """检查认证状态"""
        resp = self.session.get(f"{self.base_url}/api/auth/status")
        resp.raise_for_status()
        return resp.json()

    # ── Agent 管理 ────────────────────────────────────────

    def list_agents(self) -> list[dict]:
        """列出所有 Agent"""
        resp = self.session.get(f"{self.base_url}/api/agents")
        resp.raise_for_status()
        return resp.json()["agents"]

    def get_agent(self, agent_id: str) -> dict:
        """获取 Agent 详情"""
        resp = self.session.get(f"{self.base_url}/api/agents/{agent_id}")
        resp.raise_for_status()
        return resp.json()

    def create_agent(
        self,
        name: str,
        description: str = "",
        agent_id: str | None = None,
        language: str = "zh",
        skill_names: list[str] | None = None,
    ) -> dict:
        """创建 Agent"""
        body: dict = {"name": name, "description": description, "language": language}
        if agent_id:
            body["id"] = agent_id
        if skill_names:
            body["skill_names"] = skill_names
        resp = self.session.post(f"{self.base_url}/api/agents", json=body)
        resp.raise_for_status()
        return resp.json()

    @property
    def agent_id(self) -> str:
        return self._agent_id

    @agent_id.setter
    def agent_id(self, value: str) -> None:
        self._agent_id = value
        self.session.headers["X-Agent-Id"] = value

    # ── 核心聊天（非流式）──────────────────────────────────

    def chat(
        self,
        messages: list[dict],
        user_id: str = "default_user",
        session_id: str | None = None,
        stream: bool = False,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict:
        """
        发送聊天请求（非流式），返回完整响应

        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": [{"type": "text", "text": "你好"}]}]
            user_id: 用户标识
            session_id: 会话标识，不传则自动生成
            stream: 是否流式（设为 True 请使用 stream_chat）
            model: 指定模型
            temperature: 温度参数
            max_tokens: 最大 token 数

        Returns:
            完整的 Agent 响应（含 output messages 和 usage）
        """
        body = self._build_request(messages, user_id, session_id, stream)
        if model:
            body["model"] = model
        if temperature is not None:
            body["temperature"] = temperature
        if max_tokens is not None:
            body["max_tokens"] = max_tokens

        resp = self.session.post(
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat",
            json=body,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()

    # ── 核心聊天（流式 SSE）────────────────────────────────

    def stream_chat(
        self,
        messages: list[dict],
        user_id: str = "default_user",
        session_id: str | None = None,
    ) -> Generator[dict, None, None]:
        """
        发送聊天请求（流式），逐条 yield SSE 事件

        Yields:
            dict: 解析后的 SSE 事件

        Example:
            for event in client.stream_chat([{"role": "user", "content": [...]}]):
                if event.get("object") == "content" and event.get("delta"):
                    print(event.get("text", ""), end="", flush=True)
                elif event.get("object") == "response" and event.get("status") == "completed":
                    print(f"\n[Done] usage={event.get('usage')}")
        """
        body = self._build_request(messages, user_id, session_id, stream=True)

        resp = self.session.post(
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat",
            json=body,
            headers={"Accept": "text/event-stream"},
            stream=True,
        )
        resp.raise_for_status()

        buffer = ""
        for line in resp.iter_lines(decode_unicode=True):
            if line is None:
                continue
            line = line.strip()
            if not line:
                continue
            if line.startswith("data: "):
                payload = line[6:]
                try:
                    yield json.loads(payload)
                except json.JSONDecodeError:
                    continue
            elif line.startswith("data:"):
                # 兼容无空格格式 "data:{}"
                payload = line[5:]
                try:
                    yield json.loads(payload)
                except json.JSONDecodeError:
                    continue

    # ── 停止聊天 ──────────────────────────────────────────

    def stop_chat(self) -> None:
        """停止当前正在运行的聊天"""
        resp = self.session.post(
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat/stop"
        )
        resp.raise_for_status()

    # ── 聊天历史 ──────────────────────────────────────────

    def list_chats(
        self, user_id: str | None = None, channel: str | None = None
    ) -> list[dict]:
        """列出聊天列表"""
        params = {}
        if user_id:
            params["user_id"] = user_id
        if channel:
            params["channel"] = channel
        resp = self.session.get(
            f"{self.base_url}/api/agents/{self._agent_id}/chats", params=params
        )
        resp.raise_for_status()
        return resp.json()

    def get_chat_history(self, chat_id: str) -> dict:
        """获取聊天历史（含完整消息）"""
        resp = self.session.get(
            f"{self.base_url}/api/agents/{self._agent_id}/chats/{chat_id}"
        )
        resp.raise_for_status()
        return resp.json()

    def delete_chat(self, chat_id: str) -> None:
        """删除聊天"""
        resp = self.session.delete(
            f"{self.base_url}/api/agents/{self._agent_id}/chats/{chat_id}"
        )
        resp.raise_for_status()

    def batch_delete_chats(self, chat_ids: list[str]) -> None:
        """批量删除聊天"""
        resp = self.session.post(
            f"{self.base_url}/api/agents/{self._agent_id}/chats/batch-delete",
            json={"chat_ids": chat_ids},
        )
        resp.raise_for_status()

    # ── 文件上传 ──────────────────────────────────────────

    def upload_file(self, file_path: str) -> dict:
        """上传文件（最大 10MB）"""
        with open(file_path, "rb") as f:
            resp = self.session.post(
                f"{self.base_url}/api/agents/{self._agent_id}/console/upload",
                files={"file": f},
            )
        resp.raise_for_status()
        return resp.json()

    # ── 工具/技能 ─────────────────────────────────────────

    def list_tools(self) -> list[dict]:
        """列出所有工具"""
        resp = self.session.get(f"{self.base_url}/api/agents/{self._agent_id}/tools")
        resp.raise_for_status()
        return resp.json()

    def list_skills(self) -> list[dict]:
        """列出所有技能"""
        resp = self.session.get(f"{self.base_url}/api/agents/{self._agent_id}/skills")
        resp.raise_for_status()
        return resp.json()

    # ── 内部方法 ──────────────────────────────────────────

    @staticmethod
    def _build_request(
        messages: list[dict],
        user_id: str,
        session_id: str | None,
        stream: bool = True,
    ) -> dict:
        """构建 AgentRequest 请求体"""
        input_msgs = []
        for msg in messages:
            content = msg["content"]
            # 如果 content 是纯文本字符串，自动包装为 ContentBlock
            if isinstance(content, str):
                content = [{"type": "text", "text": content}]
            input_msgs.append({
                "role": msg["role"],
                "type": "message",
                "content": content,
            })

        body: dict = {
            "input": input_msgs,
            "stream": stream,
            "user_id": user_id,
            "channel": "console",
        }
        if session_id:
            body["session_id"] = session_id
        return body
```

---

## 3. 认证模块

### 3.1 登录

```python
from qwenpaw_client import QwenPawClient

client = QwenPawClient()

# 登录（返回 JWT Token，默认 7 天有效期）
result = client.login(username="admin", password="your_password")
print(f"Token: {result['token']}")
print(f"User: {result['username']}")
```

### 3.2 可选参数

```python
# 自定义 Token 有效期（秒）
client.login(username="admin", password="xxx", expires_in=86400)  # 1 天

# 永久 Token
client.login(username="admin", password="xxx", expires_in=0)

# 不传 expires_in 使用默认 7 天
client.login(username="admin", password="xxx")
```

### 3.3 检查认证状态

```python
# 检查服务是否开启认证
status = client.check_auth_status()
print(status)  # {"enabled": true/false}

# 检查当前 Token 是否有效
if client.is_authenticated:
    print("已登录")
```

### 3.4 关闭认证的场景

如果 `QWENPAW_AUTH_ENABLED=false`，所有接口无需登录即可访问：

```python
client = QwenPawClient()  # 无需 login()
# 直接调用其他 API
agents = client.list_agents()
```

---

## 4. Agent 管理

### 4.1 列出所有 Agent

```python
agents = client.list_agents()
for agent in agents:
    print(f"ID: {agent['id']}, 名称: {agent['name']}, 启用: {agent['enabled']}")
```

### 4.2 切换当前 Agent

```python
client.agent_id = "my_agent"  # 后续请求自动使用此 Agent
```

### 4.3 创建 Agent

```python
new_agent = client.create_agent(
    name="数据分析助手",
    description="专门处理数据分析和报表",
    language="zh",
)
print(f"新 Agent ID: {new_agent['id']}")
```

### 4.4 获取 Agent 详情

```python
detail = client.get_agent("default")
print(detail)
```

---

## 5. 核心聊天接口

### 5.1 非流式调用（同步等待完整响应）

```python
response = client.chat(
    messages=[
        {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    user_id="python_user",
)

# 提取助手回复
for msg in response.get("output", []):
    if msg.get("role") == "assistant":
        for content_block in msg.get("content", []):
            if content_block.get("type") == "text":
                print(content_block["text"])

# 提取 token 用量
usage = response.get("usage", {})
print(f"Prompt tokens: {usage.get('prompt_tokens')}")
print(f"Completion tokens: {usage.get('completion_tokens')}")
```

### 5.2 流式调用（SSE 实时输出）

```python
messages = [
    {"role": "user", "content": "写一首关于春天的短诗"}
]

print("AI 回复：")
for event in client.stream_chat(messages, user_id="python_user"):
    # 官方协议格式：object="content" + delta=true → 增量文本
    if event.get("object") == "content" and event.get("delta"):
        print(event.get("text", ""), end="", flush=True)

    # object="response" + status="completed" → 完成
    elif event.get("object") == "response" and event.get("status") == "completed":
        usage = event.get("usage", {})
        print(f"\n[完成] 用时: {usage}")
        break

    # 错误处理
    elif event.get("error"):
        print(f"\n[错误] {event['error'].get('message')}")
        break
```

### 5.3 多轮对话（上下文保持）

```python
# 方式一：使用 session_id 保持上下文（服务端自动维护历史）
session_id = None  # 首次不传，服务端自动生成

for question in ["什么是 Python?", "它和 JavaScript 有什么区别?", "写个 Hello World"]:
    print(f"Q: {question}")
    full_text = ""
    for event in client.stream_chat(
        [{"role": "user", "content": question}],
        user_id="python_user",
        session_id=session_id,
    ):
        if event.get("object") == "content" and event.get("delta"):
            text = event.get("text", "")
            full_text += text
            print(text, end="", flush=True)
        elif event.get("object") == "response" and event.get("status") == "completed":
            # 保存 session_id 用于下一轮
            session_id = event.get("session_id") or session_id
            break
    print()
```

```python
# 方式二：手动维护消息历史（适合需要精细控制上下文的场景）
history: list[dict] = []

while True:
    user_input = input("你: ")
    if user_input.lower() in ("quit", "exit"):
        break

    # 构建完整消息列表（含历史）
    messages = history + [{"role": "user", "content": user_input}]

    full_text = ""
    print("AI: ", end="", flush=True)
    for event in client.stream_chat(messages, user_id="python_user"):
        if event.get("object") == "content" and event.get("delta"):
            text = event.get("text", "")
            full_text += text
            print(text, end="", flush=True)
        elif event.get("object") == "response" and event.get("status") == "completed":
            break
    print()

    # 追加到历史
    history.append({"role": "user", "content": user_input})
    history.append({"role": "assistant", "content": full_text})
```

### 5.4 带图片的多模态对话

```python
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image_url": "https://example.com/photo.jpg"},
            {"type": "text", "text": "请描述这张图片"},
        ],
    }
]

for event in client.stream_chat(messages, user_id="python_user"):
    if event.get("object") == "content" and event.get("delta"):
        print(event.get("text", ""), end="", flush=True)
    elif event.get("object") == "response" and event.get("status") == "completed":
        break
```

### 5.5 停止正在运行的聊天

```python
import threading

# 在另一个线程中触发停止
def stop_after_5_seconds():
    time.sleep(5)
    client.stop_chat()
    print("\n[已停止]")

threading.Thread(target=stop_after_5_seconds, daemon=True).start()

for event in client.stream_chat(
    [{"role": "user", "content": "写一篇很长的文章"}],
    user_id="python_user",
):
    if event.get("object") == "content" and event.get("delta"):
        print(event.get("text", ""), end="", flush=True)
    elif event.get("object") == "response" and event.get("status") == "completed":
        break
```

### 5.6 指定模型和生成参数

```python
response = client.chat(
    messages=[{"role": "user", "content": "生成 5 个创意点子"}],
    user_id="python_user",
    model="gpt-4o",              # 指定模型
    temperature=0.9,             # 更高创造性
    max_tokens=500,              # 限制输出长度
)
```

---

## 6. 聊天历史管理

### 6.1 列出聊天列表

```python
chats = client.list_chats(user_id="python_user")
for chat in chats:
    print(f"ID: {chat['id']}, 名称: {chat['name']}, 状态: {chat['status']}")
    print(f"  创建时间: {chat['created_at']}, 更新时间: {chat['updated_at']}")
```

### 6.2 获取聊天历史（完整消息）

```python
history = client.get_chat_history("chat-uuid-here")

print(f"状态: {history['status']}")
for msg in history["messages"]:
    role = msg.get("role", "unknown")
    for content_block in msg.get("content", []):
        if content_block.get("type") == "text":
            text = content_block.get("text", "")[:100]  # 截断显示
            print(f"  [{role}] {text}...")
```

### 6.3 删除聊天

```python
# 单个删除
client.delete_chat("chat-uuid-1")

# 批量删除
client.batch_delete_chats(["chat-uuid-1", "chat-uuid-2", "chat-uuid-3"])
```

---

## 7. 异步版本（基于 httpx）

> 适用于异步框架（FastAPI、aiohttp、asyncio 定时任务等）。

```python
"""qwenpaw_async_client.py — QwenPaw HTTP 客户端（异步版，基于 httpx）"""

import json
from typing import AsyncGenerator, Optional

import httpx


class QwenPawAsyncClient:
    """QwenPaw REST API 异步客户端"""

    def __init__(self, base_url: str = "http://127.0.0.1:8088"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=300.0)  # 5 分钟超时
        self._token: str | None = None
        self._agent_id: str = "default"

    async def aclose(self) -> None:
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.aclose()

    # ── 认证 ──────────────────────────────────────────────

    async def login(self, username: str, password: str, expires_in: int = 604800) -> dict:
        resp = await self.client.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password, "expires_in": expires_in},
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["token"]
        self.client.headers.update({"Authorization": f"Bearer {self._token}"})
        return data

    def logout(self) -> None:
        self._token = None
        self.client.headers.pop("Authorization", None)

    # ── Agent 管理 ────────────────────────────────────────

    async def list_agents(self) -> list[dict]:
        resp = await self.client.get(f"{self.base_url}/api/agents")
        resp.raise_for_status()
        return resp.json()["agents"]

    @property
    def agent_id(self) -> str:
        return self._agent_id

    @agent_id.setter
    def agent_id(self, value: str) -> None:
        self._agent_id = value
        self.client.headers["X-Agent-Id"] = value

    # ── 核心聊天（非流式）──────────────────────────────────

    async def chat(
        self,
        messages: list[dict],
        user_id: str = "default_user",
        session_id: str | None = None,
        **kwargs,
    ) -> dict:
        body = self._build_request(messages, user_id, session_id, stream=False)
        body.update(kwargs)  # model, temperature 等

        resp = await self.client.post(
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat",
            json=body,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()

    # ── 核心聊天（流式 SSE）────────────────────────────────

    async def stream_chat(
        self,
        messages: list[dict],
        user_id: str = "default_user",
        session_id: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        """
        异步流式聊天，逐条 yield SSE 事件

        Example:
            async with QwenPawAsyncClient() as client:
                await client.login("admin", "password")
                async for event in client.stream_chat([{"role": "user", "content": "你好"}]):
                    if event.get("object") == "content" and event.get("delta"):
                        print(event.get("text", ""), end="", flush=True)
        """
        body = self._build_request(messages, user_id, session_id, stream=True)

        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat",
            json=body,
            headers={"Accept": "text/event-stream"},
        ) as resp:
            resp.raise_for_status()
            buffer = ""
            async for line in resp.aiter_lines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("data: "):
                    payload = line[6:]
                elif line.startswith("data:"):
                    payload = line[5:]
                else:
                    continue
                try:
                    yield json.loads(payload)
                except json.JSONDecodeError:
                    continue

    # ── 停止聊天 ──────────────────────────────────────────

    async def stop_chat(self) -> None:
        resp = await self.client.post(
            f"{self.base_url}/api/agents/{self._agent_id}/console/chat/stop"
        )
        resp.raise_for_status()

    # ── 聊天历史 ──────────────────────────────────────────

    async def list_chats(self, **params) -> list[dict]:
        resp = await self.client.get(
            f"{self.base_url}/api/agents/{self._agent_id}/chats",
            params=params,
        )
        resp.raise_for_status()
        return resp.json()

    async def get_chat_history(self, chat_id: str) -> dict:
        resp = await self.client.get(
            f"{self.base_url}/api/agents/{self._agent_id}/chats/{chat_id}"
        )
        resp.raise_for_status()
        return resp.json()

    # ── 内部方法 ──────────────────────────────────────────

    @staticmethod
    def _build_request(
        messages: list[dict],
        user_id: str,
        session_id: str | None,
        stream: bool = True,
    ) -> dict:
        input_msgs = []
        for msg in messages:
            content = msg["content"]
            if isinstance(content, str):
                content = [{"type": "text", "text": content}]
            input_msgs.append({
                "role": msg["role"],
                "type": "message",
                "content": content,
            })

        body = {
            "input": input_msgs,
            "stream": stream,
            "user_id": user_id,
            "channel": "console",
        }
        if session_id:
            body["session_id"] = session_id
        return body
```

### 异步使用示例

```python
import asyncio
from qwenpaw_async_client import QwenPawAsyncClient


async def main():
    async with QwenPawAsyncClient() as client:
        # 登录
        await client.login("admin", "your_password")

        # 列出 Agent
        agents = await client.list_agents()
        print(f"可用 Agent: {[a['name'] for a in agents]}")

        # 流式聊天
        print("\nAI 回复：")
        async for event in client.stream_chat(
            [{"role": "user", "content": "什么是异步编程？"}],
            user_id="python_user",
        ):
            if event.get("object") == "content" and event.get("delta"):
                print(event.get("text", ""), end="", flush=True)
            elif event.get("object") == "response" and event.get("status") == "completed":
                usage = event.get("usage", {})
                print(f"\n[完成] {usage}")
                break


asyncio.run(main())
```

---

## 8. 实用场景示例

### 8.1 命令行问答工具

```python
#!/usr/bin/env python3
"""qwenpaw_cli.py — 简单的命令行 QwenPaw 对话工具"""

import sys
from qwenpaw_client import QwenPawClient


def main():
    client = QwenPawClient()

    # 登录
    username = input("用户名: ")
    password = input("密码: ")
    client.login(username, password)

    # 选择 Agent
    agents = client.list_agents()
    print("\n可用 Agent:")
    for i, agent in enumerate(agents):
        status = "✅" if agent["enabled"] else "❌"
        print(f"  {i}. [{status}] {agent['name']} ({agent['id']})")

    idx = int(input("\n选择 Agent 编号: "))
    client.agent_id = agents[idx]["id"]

    # 对话循环
    print("\n输入 'quit' 退出, 'clear' 清空历史")
    history = []

    while True:
        try:
            user_input = input("\n你: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见！")
            break

        if user_input.lower() in ("quit", "exit"):
            print("再见！")
            break

        if user_input.lower() == "clear":
            history = []
            print("[历史已清空]")
            continue

        if not user_input:
            continue

        messages = history + [{"role": "user", "content": user_input}]
        full_text = ""

        print("AI: ", end="", flush=True)
        for event in client.stream_chat(messages, user_id="cli_user"):
            if event.get("object") == "content" and event.get("delta"):
                text = event.get("text", "")
                full_text += text
                print(text, end="", flush=True)
            elif event.get("object") == "response" and event.get("status") == "completed":
                break
        print()

        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": full_text})


if __name__ == "__main__":
    main()
```

### 8.2 自动化批处理脚本

```python
"""batch_process.py — 使用 QwenPaw 批量处理文本"""

from qwenpaw_client import QwenPawClient

client = QwenPawClient()
client.login("admin", "your_password")

# 待处理的文本列表
items = [
    "将以下英文翻译为中文: Hello, world! Welcome to AI.",
    "总结以下文本的核心观点: ...",
    "为以下产品写一段营销文案: ...",
]

for i, item in enumerate(items, 1):
    print(f"\n--- 处理第 {i}/{len(items)} 项 ---")

    response = client.chat(
        messages=[{"role": "user", "content": item}],
        user_id="batch_processor",
        stream=False,  # 批处理用非流式更简单
    )

    for msg in response.get("output", []):
        if msg.get("role") == "assistant":
            for block in msg.get("content", []):
                if block.get("type") == "text":
                    print(block["text"])
```

### 8.3 与现有 FastAPI 服务集成

```python
"""api_proxy.py — 在 FastAPI 中代理 QwenPaw 聊天"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from qwenpaw_async_client import QwenPawAsyncClient


class ChatRequest(BaseModel):
    message: str
    user_id: str = "api_user"
    session_id: str | None = None


class ChatResponse(BaseModel):
    text: str
    session_id: str | None = None


qp_client: QwenPawAsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global qp_client
    qp_client = QwenPawAsyncClient()
    await qp_client.login("admin", "your_password")
    yield
    await qp_client.aclose()


app = FastAPI(lifespan=lifespan)


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    assert qp_client is not None

    full_text = ""
    new_session_id = None

    async for event in qp_client.stream_chat(
        [{"role": "user", "content": req.message}],
        user_id=req.user_id,
        session_id=req.session_id,
    ):
        if event.get("object") == "content" and event.get("delta"):
            full_text += event.get("text", "")
        elif event.get("object") == "response" and event.get("status") == "completed":
            new_session_id = event.get("session_id") or req.session_id
            break

    return ChatResponse(text=full_text, session_id=new_session_id)


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """SSE 流式代理"""
    from fastapi.responses import StreamingResponse

    async def event_stream() -> AsyncGenerator[str, None]:
        assert qp_client is not None
        async for event in qp_client.stream_chat(
            [{"role": "user", "content": req.message}],
            user_id=req.user_id,
            session_id=req.session_id,
        ):
            yield f"data: {event}\n\n"
            if event.get("object") == "response" and event.get("status") == "completed":
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

### 8.4 定时任务 + QwenPaw

```python
"""daily_summary.py — 每天定时让 QwenPaw 生成摘要并发送到飞书/钉钉"""

import schedule
import time
from qwenpaw_client import QwenPawClient


def generate_daily_summary():
    """使用 QwenPaw 生成今日工作总结"""
    client = QwenPawClient()
    client.login("admin", "your_password")

    response = client.chat(
        messages=[
            {
                "role": "user",
                "content": "请帮我生成今天的工作总结，包括：1.完成的任务 2.待办事项 3.明日计划",
            }
        ],
        user_id="daily_summary_bot",
        stream=False,
    )

    summary = ""
    for msg in response.get("output", []):
        if msg.get("role") == "assistant":
            for block in msg.get("content", []):
                if block.get("type") == "text":
                    summary += block["text"]

    # TODO: 发送到飞书/钉钉/邮件
    print(f"\n=== 每日摘要 ===\n{summary}\n================\n")


# 每天 18:00 执行
schedule.every().day.at("18:00").do(generate_daily_summary)

print("定时任务已启动，每天 18:00 生成摘要")
while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## 9. 完整 API 端点速查

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/status` | 认证状态 |
| GET | `/api/auth/verify` | Token 验证 |
| GET | `/api/agents` | Agent 列表 |
| POST | `/api/agents` | 创建 Agent |
| GET | `/api/agents/{agentId}` | Agent 详情 |
| PUT | `/api/agents/{agentId}` | 更新 Agent |
| DELETE | `/api/agents/{agentId}` | 删除 Agent |
| POST | `/api/agents/{agentId}/console/chat` | **流式/非流式聊天** |
| POST | `/api/agents/{agentId}/console/chat/stop` | 停止聊天 |
| POST | `/api/agents/{agentId}/console/upload` | 文件上传 |
| GET | `/api/agents/{agentId}/chats` | 聊天列表 |
| GET | `/api/agents/{agentId}/chats/{chatId}` | 聊天历史 |
| POST | `/api/agents/{agentId}/chats` | 创建聊天 |
| POST | `/api/agents/{agentId}/chats/batch-delete` | 批量删除 |
| GET | `/api/agents/{agentId}/tools` | 工具列表 |
| GET | `/api/agents/{agentId}/skills` | 技能列表 |
| GET | `/api/agents/{agentId}/agent/files` | 工作文件 |
| GET | `/api/version` | 版本号（公开） |

---

## 10. SSE 事件格式参考

> 基于 [AgentScope Runtime 官方协议](https://runtime.agentscope.io/en/protocol.html)

### 10.1 正常流式对话

```
data: {"status": "created", "id": "response_123", "object": "response"}
data: {"status": "created", "id": "msg_abc", "object": "message", "type": "assistant"}
data: {"status": "in_progress", "type": "text", "index": 0, "delta": true, "text": "你好", "object": "content", "msg_id": "msg_abc"}
data: {"status": "in_progress", "type": "text", "index": 0, "delta": true, "text": "！有什么可以帮你的？", "object": "content", "msg_id": "msg_abc"}
data: {"status": "completed", "type": "text", "index": 0, "delta": false, "text": "你好！有什么可以帮你的？", "object": "content", "msg_id": "msg_abc"}
data: {"id": "msg_abc", "status": "completed", "object": "message"}
data: {"id": "response_123", "status": "completed", "object": "response", "usage": {"prompt_tokens": 50, "completion_tokens": 20}}
```

### 10.2 工具调用

官方协议/文档中常见的工具调用事件形态如下：

```
data: {"status": "in_progress", "type": "function_call", "function_call": {"name": "search", "arguments": "{\"query\": \"...\"}"}, "object": "message", "role": "assistant"}
data: {"status": "completed", "type": "function_call_output", "function_call_output": {"call_id": "...", "output": "..."}, "object": "message", "role": "tool"}
```

QwenPaw 本地控制台链路（2026-04-27，`127.0.0.1:8088`，`default` agent）实际观测到的常见形态如下：

```
data: {"object":"message","status":"in_progress","id":"msg_tool_call","type":"plugin_call","role":"assistant","content":null}
data: {"object":"content","status":"in_progress","type":"data","msg_id":"msg_tool_call","data":{"call_id":"call_xxx","name":"get_current_time","arguments":"{}"}}
data: {"object":"message","status":"completed","id":"msg_tool_call","type":"plugin_call","role":"assistant","content":[{"type":"data","data":{"call_id":"call_xxx","name":"get_current_time","arguments":"{}"}}]}

data: {"object":"message","status":"in_progress","id":"msg_tool_result","type":"plugin_call_output","role":"tool","content":null}
data: {"object":"content","status":"completed","type":"data","msg_id":"msg_tool_result","data":{"call_id":"call_xxx","name":"get_current_time","output":"[{\"type\": \"text\", \"text\": \"2026-04-27 20:02:10 Asia/Shanghai (Monday)\"}]"}}
data: {"object":"message","status":"completed","id":"msg_tool_result","type":"plugin_call_output","role":"tool","content":[{"type":"data","data":{"call_id":"call_xxx","name":"get_current_time","output":"..."}}]}
```

结论：

- 客户端不能只兼容 `function_call / function_call_output`
- 还应兼容 `plugin_call / plugin_call_output / mcp_tool_call / mcp_tool_call_output`
- tool payload 既可能放在顶层字段（如 `function_call`），也可能放在 `content.data` / `event.data`

### 10.3 事件判断逻辑

```python
def handle_event(event: dict) -> str:
    """根据事件类型返回处理指令"""
    obj = event.get("object")
    status = event.get("status")
    delta = event.get("delta", False)
    msg_type = event.get("type")

    if obj == "content" and msg_type == "data":
        payload = event.get("data") or {}
        return f"TOOL_PAYLOAD: {payload}"
    elif obj == "content" and delta:
        return f"APPEND_TEXT: {event.get('text', '')}"
    elif obj == "message" and msg_type in {
        "function_call", "function_call_output",
        "plugin_call", "plugin_call_output",
        "mcp_tool_call", "mcp_tool_call_output",
    }:
        # 某些实现会把 tool payload 放在 message.function_call /
        # message.plugin_call / message.content[0].data 中
        return f"TOOL_MESSAGE: {msg_type}"
    elif obj == "response" and status == "completed":
        # response.output 可能包含完整回放，可用于最终 backfill / 补偿
        return f"DONE: usage={event.get('usage')}"
    elif obj == "message" and status == "completed":
        return "MESSAGE_DONE"
    elif event.get("error"):
        return f"ERROR: {event['error'].get('message')}"
    elif event.get("metadata", {}).get("clear_history"):
        return "CLEAR_HISTORY"
    else:
        return f"IGNORE: {obj}/{status}"
```

### 10.4 前端/客户端实现约束

为避免“普通问答正常，但一旦涉及 tools 就看不到过程或正式应答”的回归，建议把下面几条作为强约束：

1. **工具事件兼容要按“类型集合 + payload 位置”双维度处理**
   - 类型集合：`function_call / function_call_output / plugin_call / plugin_call_output / mcp_tool_call / mcp_tool_call_output`
   - payload 位置：顶层字段、`event.data`、`event.content[*].data`

2. **`response.completed` 不能只当结束信号，也要当补偿信号**
   - `response.output` 中可能带完整的 `reasoning / tool_call / tool_result / answer` 回放
   - 如果前面的增量事件丢失、顺序异常，或 UI 中途断连，应该用 `response.output` 做最终 backfill

3. **不要在“只有 thinking/tool 输出”时就本地收口**
   - 工具调用后到正式应答前，服务端可能有短暂静默
   - 如果客户端做“静默 N 秒自动完成”，必须以“正式应答已经可渲染”为前提
   - 不能因为已经出现 `thinking` 或 `tool_result` 就提前结束流

4. **响应式 UI 必须更新状态树中的真实 message 实例**
   - Vue / React / MobX 等场景下，不要只修改一个脱离状态树的局部对象引用
   - 应始终通过 `messages` 列表中当前跟踪的 assistant message 实例更新 `sections / content / status`
   - 否则最容易出现：后台已有 tool 事件，但前端折叠块和正式应答不刷新

5. **普通应答的 fallback 不要只认 `type == "message"`**
   - 某些链路或文档示例里，assistant 父消息可能写成 `type == "assistant"`
   - 这类事件在没有更精细分类时，应回退视为正式应答

 ---

## 11. 注意事项

1. **超时设置**：聊天接口可能长时间运行（Agent 需要执行多轮推理+工具调用），建议 `requests` 设置 `timeout=300`（5 分钟），`httpx` 设置 `timeout=300.0`。
2. **session_id 管理**：不传 `session_id` 时服务端自动生成，但建议保存并在后续请求中复用，以保持对话上下文。
3. **channel 字段**：建议设为 `"console"` 以与官方控制台保持一致，便于调试和管理。
4. **认证开关**：通过环境变量 `QWENPAW_AUTH_ENABLED` 控制。关闭后所有接口无需 Token。
5. **错误重试**：SSE 连接可能中断，建议在外层添加重试逻辑。或使用 `reconnect: true` 参数恢复流。
6. **纯文本快捷**：`QwenPawClient` 的 `_build_request` 自动将 `content: "纯文本"` 包装为 `[{"type": "text", "text": "纯文本"}]`。
7. **服务绑定**：QwenPaw 默认仅绑定 `127.0.0.1`，Python 脚本必须与 QwenPaw 服务运行在同一台机器上。如需远程访问，需修改启动参数 `--host 0.0.0.0`。
8. **SSE 真实形态优先**：官方协议示例可作为起点，但控制台真实链路可能优先发 `plugin_call` 而不是 `function_call`。联调时应先抓一次原始 SSE，再确定客户端归并逻辑。
9. **tool 后静默不等于完成**：如果客户端自己实现“本地超时收口”，必须确认正式应答已经出现；仅有 `thinking` / `tool_result` 时禁止收口。
10. **终态兜底依赖 `response.output`**：为避免前端漏渲染或流中断后历史不完整，建议在 `response.completed` 时把 `output` 全量再归并一遍。

---

## 12. 官方文档与参考

| 资源 | 链接 |
|------|------|
| QwenPaw 文档 | https://qwenpaw.agentscope.io/docs/ |
| QwenPaw GitHub | https://github.com/agentscope-ai/QwenPaw |
| Agent API 协议规范 | https://runtime.agentscope.io/en/protocol.html |
| AgentScope Runtime 文档 | https://runtime.agentscope.io/ |
| Swagger UI（本地） | http://127.0.0.1:8088/docs |
