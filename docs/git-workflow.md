# Git 协作规范

## 分支

- 主分支：`main`
- 工作分支：`codex/<agent>-<topic>`

## PR 模板

每个 PR 需要包含：

- 目的
- 变更点
- 风险
- 验收方式
- 是否涉及规则数据

## 标签

- `product`
- `content`
- `frontend`
- `backend`
- `ai`
- `qa`
- `infra`
- `release`
- `blocked`

## 合并规则

- 每个 PR 只解决一个目标
- 规则数据变更必须同步补测试
- 跨模块变更由 Integrator Agent 统一收口

