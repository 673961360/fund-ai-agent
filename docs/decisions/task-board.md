# 任务看板

## 当前任务
- **ID**：TASK-20260424-007
- **名称**：Runtime Prototypes: QwenPaw 直连聊天页界面能力补齐
- **状态**：🟡 进行中

---

## 进度看板

### Phase 1：前端直连 QwenPaw 最小聊天闭环 ✅
- [x] 创建 ChatView、ChatInput、MessageList、MessageBubble 组件
- [x] 实现 use-chat-stream composable（SSE 流式调用）
- [x] vite build / vue-tsc 通过
- [ ] 人工配置 `.env.local` 并验证流式通路

### Phase 2：Chat-First 主界面重构（减法重排） ✅
- [x] 页面收敛为 `ChatHeader` / `ChatMessageList` / `ChatInputBar` / `ChatSidebar`
- [x] 顶部长说明文案、状态卡片群和独立状态块已删除
- [x] 主区改为“极简头部 + 消息主体 + 输入条”的聊天结构
- [x] 右侧收敛为单一轻侧栏，保留 Agent、清空、停止和折叠配置
- [x] `vue-tsc --noEmit` / `vite build` 通过

### Phase 3：QwenPaw Chat 行为对齐（原型旁路） 🟡
- [x] `sendQwenPawChat` 改为只发送当前最新一条 `user message`
- [x] 会话状态改为“前端单 conversation session id + 后端 session 承接历史”
- [x] assistant 消息支持 `正式应答 / 思考过程 / 工具调用 / 工具结果` 结构化分段
- [x] SSE 归并支持 `reasoning / plugin_call / plugin_call_output / function_call / mcp_tool_call`
- [x] `npm.cmd run typecheck` / `npm.cmd run build` 通过
- [x] 127.0.0.1:8088 API 烟测通过：同 session 连续发送 `APPLE` / `BANANA` 返回正确；可观测 `reasoning`、`plugin_call`、`plugin_call_output`
- [ ] 浏览器人工确认折叠块展示、清空会话与切换 agent 的交互表现

### Phase 4：聊天工作区与历史恢复补齐 🟡
- [x] 聊天状态升级为 `activeChatId / activeSessionId / activeChatStatus / chatList`
- [x] Shared client 新增 `listChats / getChatHistory / createChat / deleteChat / reconnectQwenPawChat / uploadConsoleFile`
- [x] 页面挂载、刷新与切换 Agent 后按 `sessionStorage activeChatId -> 最新聊天 -> 空白新会话` 恢复当前聊天
- [x] 新建聊天改为本地空白会话，首次发送前创建后端 `chatId`
- [x] 删除当前聊天后自动切换到下一条最新聊天；无剩余历史时回到空白新会话
- [x] `running` 历史聊天支持基于 `session_id` 的 reconnect 恢复
- [x] 127.0.0.1:8088 API 烟测通过：创建 / 列表 / 历史 / 删除链路可用

### Phase 5：Markdown、多模态 Composer 与交互细化 🟡
- [x] assistant 正式应答改为 Markdown 渲染，links 新开页签并加 `rel="noopener noreferrer"`
- [x] 历史消息与实时消息统一支持 `text / image / file / audio` 内容块
- [x] 输入区重构为 composer：附件入口、上传队列、失败重试、录音入口、录音预览、单一主按钮
- [x] 附件上传支持图片/文件，前端限制 10MB，并兼容上传返回 `filename / file_name`
- [x] 发送按钮在流式中切换为“停止”，停止时先本地 abort，再 best-effort 调远端 `chat_id` stop
- [x] skill/tool 流增加 `response.output` 回填与 1s 静默本地收口，避免正式应答已返回但前端一直停在“生成中”
- [x] 待发送附件支持“立即移除”；上传中的文件改为逐项 `AbortController` 取消，不再被前端禁用
- [x] 修复附件上传就绪后 `canSubmit` 卡在旧 `uploading` 状态的问题，附件 + 文本组合可正常发送
- [x] 修复聊天气泡中附件文件名在深色用户消息里不可见的问题，附件改为高对比度文件卡片显示
- [x] 用户消息气泡改为浅灰底深色字；运行时配置区新增“当前请求入口 / 代理目标地址”只读展示
- [x] 消息区补齐 skeleton、双态自动滚动和“回到底部”入口
- [x] `npm.cmd run typecheck` / `npm.cmd run build` 再次通过
- [x] 127.0.0.1:8088 API 烟测通过：`/console/upload` 可返回上传文件 URL
- [ ] 浏览器人工复核 Markdown、附件预览、录音发送、停止按钮与移动端交互

---

## 阻塞 / 风险
- 浏览器内的最终交互复核仍待执行；本轮已完成本地 typecheck/build 与 127.0.0.1:8088 的列表、历史、上传与流式 API 烟测
- `人员交接` 这类 skill/tool 对话的浏览器内复核仍待执行；代码侧已补 server-terminal-first + local-completion fallback，但还未做 UI 端到端点击验证
- Stop 已改为携带 `chat_id` 的远端 stop 调用，但原型仍以本地 `AbortController` 为主，远端停止继续按 best-effort 处理
- 新建聊天后的 fresh smoke 观测到一次后端 `response.failed (MODEL_EXECUTION_FAILED)`；该场景下历史仅落盘已提交的 `user` 消息，仍需浏览器内复核前端错误态与刷新恢复表现

## 后续计划
1. 在浏览器复核历史聊天切换、刷新恢复、running reconnect、删除当前聊天后的回退策略
2. 在浏览器复核 Markdown、附件预览、录音发送、发送即停止、滚动跟随与空状态表现
3. 验证后端 `response.failed`、`clear_history` 与远端 stop 下的错误态、恢复态与新 session 语义

---

## 历史任务

### TASK-20260423-001：运行态决策文件最小初始化 ✅
### TASK-20260423-002：工作模式优化第一轮 - 同步收口版 ✅
### TASK-20260423-003：阶段2核心对齐 - 代码与契约枚举/命名统一 ✅
### TASK-20260423-004：阶段2骨架补齐 ✅
### TASK-20260423-005：M2 收口 + M3 进入评估 ✅
### TASK-20260423-006：M3 最小闭环 - 基础设施补齐 + 无确认路径 Mock 串联 ⏸️ 暂缓

---

## 附录
- [方案详情](solution-proposal.md) — Chat-first 主界面重构执行方案
- [评审记录](review-notes.md) — 执行验证与阶段记录
