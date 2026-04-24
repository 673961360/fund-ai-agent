# 发布前自检清单

## 使用规则
- 每次 Codex 发布任务前，必须逐项勾选
- 未全部勾选前，不得将任务状态设为 approved_for_execution
- 发现冲突时，先修复再发布，不要带病发布

---

## 真源一致性扫描

### 阶段口径扫描
发布任务涉及阶段切换时，必须执行以下搜索并确认无残留：

| 搜索词 | 范围 | 结果记录 |
|--------|------|---------|
| `阶段 2\|Stage 2\|阶段2` | `docs/**/*.md` | |
| `当前进行中` | `docs/**/*.md` | |
| `待进入` | `docs/**/*.md` | |

- [ ] 搜索结果中，所有"当前阶段=阶段 2"的声明均已同步更新
- [ ] 无遗漏文件（AGENTS.md、project-brief.md、milestones.md、release-plan.md 至少覆盖）

### 第一优先级真源一致性
- [ ] `AGENTS.md` 的阶段声明与 current-task.md 一致
- [ ] `docs/project/project-brief.md` 的阶段说明与 current-task.md 一致
- [ ] `docs/project/milestones.md` 的里程碑状态与 current-task.md 一致
- [ ] `docs/project/release-plan.md` 的当前状态与 milestones.md 一致
- [ ] `docs/phases/*.md` 的当前阶段声明（如有）与 current-task.md 一致

### 规范一致性
- [ ] 前端实现要求与 `docs/frontend/vue3-ruler-skills-compact.md` 一致（axios 单例 / 拦截器 / 分层）
- [ ] 后端实现要求与 `docs/contracts/*.md` 的契约定义一致
- [ ] 未引入契约中不存在的端点/接口/状态值

---

## 任务包完整性

### 允许/禁止修改文件
- [ ] 允许修改文件清单完整，无遗漏
- [ ] 禁止修改文件清单覆盖当前阶段边界禁止项
- [ ] 新增文件（如 pyproject.toml、package.json）已列入允许修改清单

### 依赖可验证性
- [ ] 后端依赖（pyproject.toml 或 requirements）已声明或被列入允许文件
- [ ] 前端依赖（package.json）已声明或被列入允许文件
- [ ] 无"import 但无依赖声明"的悬空引用

### 完成判定可验证
- [ ] 完成判定标准具体可操作，不是"功能正常"这类模糊描述
- [ ] 验证方式不依赖人工主观判断（优先使用命令输出、搜索结果、文件存在性）

---

## 边界与风险

### 阶段越界检查
- [ ] 未引入下一阶段的内容（如阶段 3 不接真实 provider）
- [ ] 禁止项清单覆盖当前阶段的所有禁止内容
- [ ] 风险评估中列出可能的越界点和应对措施

### 冲突处理
- [ ] 已识别当前方案与现有真源的所有冲突点
- [ ] 每个冲突点都有明确的处理方式（不是"待确认"）
- [ ] 冲突处理方式与既有决策（decision-log.md）不矛盾
