---
type: reference
title: "Vue3前端开发规范精简版（AI指引用）"
tags: ["AI辅助开发", "Ruler", "Skills", "前端开发", "Vue3", "Vite", "规范"]
created_at: "2026-04-23"
updated_at: "2026-04-23"
source: "由 raw/ai-landing/vue3-vite-pinia/ 目录 13 个文件整合精简"
related_docs:
  - docs/projects/ai-landing/vue3-ruler-skills-reference.md
---

# Vue3 前端开发规范精简版

> **用途**：直接粘贴到 CLAUDE.md / Cursor Rules / AI 对话中，作为前端开发的全局约束。
> **来源**：`raw/ai-landing/vue3-vite-pinia/` 下 rules + 7 个 skills slices 整合。

---

## 一、技术栈强制要求

| 类别 | 选型 | 约束 |
|------|------|------|
| 框架 | Vue 3 + `<script setup lang="ts">` + Composition API | 禁止选项式（兼容遗留除外） |
| 路由/状态 | Vue Router + Pinia + VueUse | VueUse 优先，避免重复造轮子 |
| 构建 | Vite + TypeScript（strict） | 禁用 Vue CLI 习惯写法 |
| UI | Element Plus 为主；Tailwind 辅助布局/间距/响应式 | 不与 EP 变量冲突 |
| HTTP | axios 单例 + 拦截器 + 分层封装 | api/services 与组件解耦 |
| 金融计算 | Decimal.js / BigNumber.js | **禁止裸浮点运算** |
| 代码规范 | ESLint + Prettier | 提交前必须通过 |

---

## 二、目录结构

```
src/
├── api/              # 按域拆分，封装具体接口
├── assets/
├── components/       # 通用与跨模块组件
├── composables/      # 组合式函数（useXxx）
├── keys/             # provide/inject 的 InjectionKey（可选）
├── layouts/
├── router/
├── stores/           # Pinia，按域拆分
├── styles/           # 全局样式、Tailwind 入口、EP 变量覆盖
├── types/
├── utils/
├── views/            # 页面级，可按业务分子目录
├── App.vue
└── main.ts
```

---

## 三、金融后台硬约束

### 3.1 排序

- 列表排序**默认后端实现**
- 前端排序仅限：后端明确支持，或纯前端全量数据场景

### 3.2 空值语义

- `null` / `undefined` / 空字符串语义必须明确，与后端契约一致
- 金融场景下 `null/undefined` 显示为 `""`，**不能误转为 `0`**

### 3.3 金额与数值

- 金额、费率、份额等**禁止裸浮点**，统一用高精度库
- 金融计算链路中输入值须转入高精度对象

### 3.4 数据格式规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 申购金额 | 保留2位小数，千分位分隔 | `10,000.00` |
| 基金份额 | 保留2-4位小数，千分位分隔 | `12,345.6789` |
| 净值 | 保留4位小数 | `1.2345` |
| 收益率 | 保留2位小数，带% | `+5.67%` |
| 费率 | 保留2位小数，带% | `1.50%` |

### 3.5 敏感操作

- 必须二次确认，给出影响范围说明
- 权限校验与路由守卫保持一致
- 提交期间禁用重复提交，按钮状态与 loading 联动

---

## 四、编码规范

### CSS

- 页面与组件样式优先局部作用域，避免全局污染
- 优先使用 EP 设计变量与主题；Tailwind 用于布局辅助
- 禁止滥用深层选择器与内联样式

### HTML

- 模板语义化、扁平化，避免复杂表达式
- 列表渲染必须提供稳定 `key`
- 表格、表单、弹框等复杂结构应拆分子组件

### JS / TypeScript

- Composition API；复杂状态优先 `computed` 与可复用 composables
- 方法命名体现业务意图；布尔变量用 `is/has/can` 前缀
- 请求、状态、视图逻辑分层
- `console.log` / `debugger` 提交前必须清理
- Store 按业务域拆分，命名 `use` + 领域 + `Store`

### 注释（Why-First）

- 注释解释"为什么"，而非翻译"做了什么"
- 涉及业务约束、兼容处理、性能取舍时必须补充注释
- 禁止保留大段注释掉的旧代码

### 响应式选用

- 原始值 / 单字段：`ref`
- 对象形态状态：`ref` 包对象（团队统一一种风格）
- 派生状态：`computed`；副作用用 `watch`，明确 `deep/immediate`
- 大列表：避免无谓深层响应式，必要时 `shallowRef`

---

## 五、AI 行为规范（6 条）

1. **排序**：默认后端排序，除非用户明确要求前端排序
2. **数据监控**：禁止用"相同ID不刷新"阻断更新，每次操作默认获取最新数据
3. **数值精度**：禁止原生 `+ - * /`，必须用高精度库
4. **空值语义**：`null/undefined` 显示为 `""`，不能误转为 `0`
5. **最小实现**：严格按需求实现，不添加未确认扩展
6. **数据获取**：关键操作默认获取最新数据，查询请求加防抖与取消机制

---

## 六、数字输入框与表单校验

### 数字输入框

- `el-input` 数字型必须在 `@input` 做字符过滤（仅数字与一个小数点）
- 千分符：`@blur` 加、`@focus` 去
- 接口提交前必须先去千分符再 `Number` 转换
- 互斥字段（如"绝对数量/净值比例"）不能同时有值

### 表单校验

- 必填项：`rules` 声明 `required + message + trigger`（文本 `blur`，下拉/日期 `change`）
- 字符串统一 `trim` 后校验
- 数字字段：校验可解析性、业务范围、小数位
- 区间字段：开始值不得大于结束值
- 提交前：`await formRef.value?.validate()`，不通过禁止发请求

---

## 七、开发流程硬约束

### 阶段约束

1. 开发前必须先完成需求分析文档（`XXX-plan.md`）
2. 页面 UI 完成后必须**先审后开功能**
3. 功能按**单功能点迭代**，每完成一个都提示审核
4. 新增需求必须先输出"新增需求分析报告"

### 必审节点

- 需求文档完成时
- 每个 UI 页面完成时
- 每个功能点完成时
- 新增需求方案后
- 架构变更前

---

## 八、UI 样式规范

### 页面布局

- 列表页遵循"查询区 / 操作区 / 表格区 / 分页区"结构
- 区块间距统一，层级清晰
- 使用 Tailwind 间距体系或项目统一间距变量

### 表格

- 文本列左对齐、数值列右对齐
- 金额/费率/份额统一格式化后展示
- 超长文本支持省略与悬浮展示
- 行内操作超过 3 个使用"更多"收敛
- 大数据量优先考虑虚拟滚动

### 弹框

- 必须有明确标题、关闭路径、错误提示
- 危险操作必须二次确认并说明影响范围

### 分页

- 包含总数、页码切换、每页条数切换
- 与后端分页参数严格对齐

### 查询表单

- 字段命名与后端参数语义一致
- 查询、重置按钮位置固定
- 高频查询加防抖/节流

---

## 九、HTTP 请求封装要点

### axios 单例与分层

- 单例实例（`src/api/http.ts`）：配置 `baseURL`、`timeout`、`withCredentials`
- 业务接口放 `src/api/modules/` 或 `src/services/`，组件内不直接 new axios

### 拦截器约定

- **请求拦截**：注入 Token、统一 Content-Type；用 AbortController 取消重复请求
- **响应拦截**：
  - HTTP 2xx：业务 code 非成功码转 reject
  - 401/403：刷新令牌或登出，避免刷新死循环
  - 5xx：统一日志 + 用户可读提示

### 错误对象

- `AppHttpError`：至少包含 `code`、`message`，可选 `requestId`、`payload`

### 关键代码模式

```ts
// api/http.ts
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30_000,
})

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  (res) => {
    const body = res.data
    if (body.code != null && body.code !== '0' && body.code !== '200') {
      return Promise.reject(/* AppHttpError */)
    }
    return body
  },
  (error) => { /* 401/403/5xx 统一处理 */ },
)
```

---

## 十、组件设计要点

### 三层拆分

- **views**：编排布局、拉取数据、路由参数；复杂块拆到 components
- **业务组件**：可复用领域 UI（如"账户选择器"），带明确 props/events
- **基础组件**：无业务语义（如统一样式按钮）

### Props 设计

- 必要/可选分明，提供合理默认值
- props 过多时合并为 `options` 对象并配 interface

```vue
<script setup lang="ts">
export interface QueryToolbarOptions {
  keywordPlaceholder?: string
  showExport?: boolean
}
interface Props {
  modelValue: string
  options?: QueryToolbarOptions
}
const props = withDefaults(defineProps<Props>(), {
  options: () => ({ keywordPlaceholder: '请输入', showExport: false }),
})
</script>
```

### 插槽

- 默认插槽：主内容区
- 具名插槽：工具栏、空状态、底部操作条
- 作用域插槽：暴露行数据、索引，父级可做权限判断

---

## 十一、性能优化要点

- 路由懒加载：`component: () => import('...')`，按模块拆分路由表
- 重型子模块：`defineAsyncComponent` + `Suspense`
- 大列表：后端分页 + `useDebounceFn`（VueUse）防抖查询
- 虚拟滚动：`el-table-v2` / `vxe-table` / `@tanstack`
- ECharts 按需引入
- 分包：`build.rollupOptions.manualChunks` 拆分重依赖
- 字典缓存：`useDictStore` 启动时加载，避免逐页重复请求

```ts
// 路由懒加载示例
export const tradeRoutes: RouteRecordRaw[] = [
  {
    path: '/trade/list',
    name: 'TradeList',
    component: () => import('@/views/trade/list/index.vue'),
    meta: { title: '成交查询' },
  },
]
```

---

## 十二、提交前评审清单

- [ ] 分层清晰：api/stores/composables 未与视图强耦合
- [ ] 无不当 `any`；公共类型可复用
- [ ] HTTP 错误与用户提示一致；无泄漏敏感信息
- [ ] 金融数值与空值展示符合约定
- [ ] 路由懒加载与重依赖分包合理
- [ ] 列表排序/分页与后端契约一致
- [ ] 权限与路由 meta/守卫一致
- [ ] 无多余 console/debugger
