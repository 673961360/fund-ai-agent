# v0 Demo 定义（Stage 1）

## 1. 文档定位

本文档定义 v0 Demo 的目标边界，避免阶段 1 把“可运行 Demo”误解为“真实功能已实现”。

---

## 2. Demo 目标

v0 Demo 的目标是证明以下骨架已经建立：

1. Frontend 存在聊天页骨架
2. Frontend 与 Gateway 契约命名已对齐
3. Gateway / Runtime / Workflow / Tool Gateway 已有统一抽象位置
4. Confirmation 资源与接口占位已明确
5. QwenPaw / Hermes / MockRuntime 的扩展点已预留

---

## 3. 阶段 1 Demo 允许内容

- 文档真源完整落盘
- backend / frontend 目录完整
- schema / dto / entity / ports / types / services / composables / views 均有占位
- 未实现动作显式返回 `NotImplementedError` 或等价占位错误

---

## 4. 阶段 1 Demo 禁止内容

- 不以硬编码假装真实聊天
- 不接任何真实 Provider
- 不接任何真实工具
- 不接任何生产接口
- 不把未来阶段逻辑提前实现

---

## 5. 通过标准

当以下条件满足时，可视为阶段 1 Demo 达标：

- 文档清单完整
- backend 骨架清单完整
- frontend 骨架清单完整
- 所有命名与契约真源对齐
- 禁止项未被破坏

---

## 6. TODO

- TODO：阶段 3 在 `MockRuntimeAdapter` 前提下补最小闭环联调定义
- TODO：阶段 5 补真实可运行 Demo 的验收步骤

