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

### Phase 2：聊天驱动工作台 🟡 进行中
- [ ] 创建 `use-command-bus.ts`（指令解析与分发）
- [ ] 创建 `use-workbench.ts`（工作台状态管理）
- [ ] 创建 `WorkbenchLayout.vue` / `WorkbenchNav.vue`
- [ ] 创建 `DataPanel` / `ConfigPanel` / `LogPanel` 占位面板
- [ ] 修改 `App.vue` 为左右分屏布局
- [ ] 添加工作台样式（`chat.css`）
- [ ] vue-tsc 通过 + dev 验证

### Phase 3：（待规划）

---

## 阻塞 / 风险
- 无

## 后续计划
1. Phase 1 流式通路确认后，启动 Phase 2
2. Phase 2 完成后，评估是否恢复 TASK-006 或调整主线方向

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
- [方案详情](solution-proposal.md) — Phase 2 精确执行步骤
- [评审记录](review-notes.md) — 方案评审与决策记录
