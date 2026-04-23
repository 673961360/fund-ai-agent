# 当前任务

## 任务ID
TASK-YYYYMMDD-001

## 任务名称
请填写本轮任务名称

## 任务状态
planned

可选值：
- planned
- proposal_ready
- approved_for_execution
- executing
- review_pending
- done
- blocked

## 任务背景
说明为什么要做这轮任务，它解决什么问题，它属于哪个阶段目标。

## 任务目标
明确本轮要达成的单一目标。
不要写成长期总目标。
不要把目标态写成现状。

## 当前阶段
请填写当前阶段名称。

示例：
阶段 2：统一模型、契约对齐、最小联调准备

## 阶段边界摘要
简要摘录当前阶段允许做什么、不允许做什么。
这里写当前任务真正会用到的阶段边界，不要把整份阶段文档原样复制进来。

## 本轮只做
- 
- 
- 

## 本轮不做
- 
- 
- 

## 第一优先级真源
这些文件优先级最高，用于判定当前任务是否成立、是否越界：

- AGENTS.md
- docs/phases/<current-phase-file>.md
- docs/decisions/current-task.md

## 本轮依赖真源
Claude / Codex 在执行本轮任务前，必须先阅读以下文件：

- 
- 
- 

## 可选参考文档
这些文件可用于补充理解，但优先级低于真源：

- 
- 
- 

## 允许修改文件
本轮只允许修改以下文件：

- 
- 
- 

## 禁止修改文件
除“允许修改文件”外，以下内容默认禁止修改：

- backend/**
- frontend/**
- docs/contracts/**
- docs/project/**
- docs/phases/**
- docs/templates/current-task.template.md
- 其他与本轮无关文件

如本轮确实需要修改以上某项，必须在“允许修改文件”中显式点名。

## 前置条件
本轮任务开始前，应满足：

- 已存在或已确认当前阶段真源
- 当前任务边界已明确
- 如需执行，已具备可执行的 solution-proposal.md / execution-checklist.md
- 相关真源之间无未裁决冲突

## 执行方式
本轮任务应采用哪种方式推进：

- 方案优先
- 文档细化
- 最小修改
- 仅评审，不执行
- 允许执行

请根据本轮实际情况填写。

## 完成判定
满足以下条件，才可视为本轮完成：

- 
- 
- 
- docs/decisions/review-notes.md 已回写
- docs/decisions/task-status.md 已更新

## 输出物要求
本轮产出应回写到以下文件：

- 方案：docs/decisions/solution-proposal.md
- 执行清单：docs/decisions/execution-checklist.md
- 执行结果：docs/decisions/review-notes.md
- 进度更新：docs/decisions/task-status.md

如本轮只是方案或评审，可只更新其中部分文件，但必须在 review-notes.md 或 task-status.md 中说明。

## 风险提示
本轮已知风险、冲突点、依赖项、容易越界的地方：

- 
- 
- 

## 验收关注点
本轮验收时重点检查：

- 是否超出当前阶段边界
- 是否把候选路线写成现状
- 是否引入新的文档冲突
- 是否误改了不允许修改的文件
- 是否遗漏了需要回写的运行态文件

## 交接说明
- 本轮由 Claude 先产出方案与清单
- 经人工确认后，任务状态改为 approved_for_execution
- 再由 Codex 执行允许范围内的修改
- 如执行中发现真源冲突，停止修改并回写冲突说明
- 如本轮讨论形成新任务边界，Claude 应先更新 current-task.md，再继续推进

## 最近一次更新
- 更新时间：YYYY-MM-DD HH:MM
- 更新人：Claude / Codex / Human
- 更新说明：请简要说明本次更新了什么