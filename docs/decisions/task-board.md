# 任务看板

## 当前任务
- **ID**：TASK-20260424-007
- **名称**：Runtime Prototypes: QwenPaw 直连聊天页最小闭环
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

### Phase 3：（待规划）

---

## 阻塞 / 风险
- `.env.local` 与真实 QwenPaw 服务的手工联调仍待执行，当前 UI 验证以本地 typecheck/build 为准

## 后续计划
1. 完成 `.env.local` 手工配置并验证真实流式对话链路
2. 根据连续使用反馈，继续微调消息密度、侧栏尺寸与移动端断点表现

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
