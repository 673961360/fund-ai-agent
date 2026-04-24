# 方案提议

## 任务ID
TASK-20260424-007

## 任务名称
Runtime Prototypes: QwenPaw 直连聊天页最小闭环 — Phase 2

## 本轮任务理解
Phase 1 已完成搭建（vue-tsc + vite build 均通过）。Phase 2 在原型内新增工作台页面，通过聊天指令控制工作台面板显示/隐藏/切换。用户确认布局为"左侧工作台 + 右侧可折叠聊天"，指令机制为"前端规则匹配 @<动作>:<面板名>"。

## 推荐方案
采用"composables 状态管理 + 组件分层"方案，分 3 步执行。

## 精确执行步骤

### 步骤1：指令总线与工作台状态
1. 创建 `src/composables/use-command-bus.ts`：
   - `parseCommand(text: string): Command | null` — 正则匹配 `@<action>:<target>` 格式
   - `useCommandBus()` — 接收消息文本，解析后 emit 命令事件
   - 支持动作：`show` / `hide` / `switch`
   - 支持目标：`datapanel` / `configpanel` / `logpanel` / `*`（通配）

2. 创建 `src/composables/use-workbench.ts`：
   - `panels` 注册表：`{ id, label, active }[]`
   - `activePanelId: ref<string | null>` — 当前激活面板，null = 收起
   - `navCollapsed: ref<boolean>` — 导航栏折叠状态
   - `showPanel(id) / hidePanel() / switchPanel(id) / toggleNav()` 方法
   - `useCommandBus()` 回调自动调用对应方法

### 步骤2：工作台组件
1. 创建 `src/components/workbench/index.ts` — 统一导出
2. 创建 `src/components/workbench/WorkbenchLayout.vue`：
   - 左右分栏容器：左侧工作台 + 右侧内容区
   - 右侧内容区根据 `activePanelId` 渲染对应面板或占位
   - 提供折叠按钮控制导航栏
3. 创建 `src/components/workbench/WorkbenchNav.vue`：
   - 折叠按钮 + 面板列表
   - 点击面板名称触发 `switchPanel`
   - 折叠时只显示图标/单行
4. 创建 `src/components/workbench/DataPanel.vue` — 占位面板（标题 + 说明文本）
5. 创建 `src/components/workbench/ConfigPanel.vue` — 占位面板
6. 创建 `src/components/workbench/LogPanel.vue` — 占位面板

### 步骤3：App.vue 重组 + 样式
1. 修改 `src/App.vue`：
   - 顶层布局：`<WorkbenchLayout>` 包裹 `<ChatView>`
   - ChatView 作为右侧区域嵌入，支持折叠收起
2. 修改 `src/styles/chat.css`：
   - 新增 `.split-layout` 分屏网格样式
   - 新增 `.workbench-*` 工作台样式
   - 新增 `.chat-collapse` 折叠按钮样式
   - 响应式：窄屏时工作台隐藏、聊天全屏

### 步骤4：运行态文件回写
- 更新 task-board.md / review-notes.md

## 验收标准
- `npm run dev` 启动后显示左侧工作台 + 右侧聊天分屏布局
- `@show:datapanel` → 切换到 DataPanel
- `@switch:configpanel` → 切换到 ConfigPanel
- `@hide:*` → 收起工作台内容区
- 导航栏可折叠/展开
- `vue-tsc --noEmit` 通过
- 未修改 Phase 1 已验证文件
