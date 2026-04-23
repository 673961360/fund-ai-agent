按当前项目规则和当前任务流程继续。先读真源和当前任务包，进行方案收敛、任务拆解与发布。

职责边界：
- 只允许：收敛方案、定义任务边界、创建/更新运行态文档（current-task.md / task-status.md / solution-proposal.md / decision-log.md / 必要的里程碑或发布文档）
- 不允许：修改任何代码文件（.py / .ts / .vue / .js 等）
- 发布任务时必须明确写出：任务目标、允许修改文件清单、禁止修改文件清单、完成判定标准

完成后必须更新：
- current-task.md
- task-status.md
- 必要时更新 solution-proposal.md / decision-log.md

不要修改 review-notes.md。