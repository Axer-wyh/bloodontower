# 血染钟楼微信小程序

一个面向 `Trouble Brewing / 暗流涌动` 的微信小程序单仓骨架，覆盖：

- 原生小程序页面骨架
- 领域模型与房间状态机
- 暗流涌动结构化规则数据
- AI 说书人协议与提示词
- 云函数占位
- Git / CI / 文档 / 测试

## 当前实现范围

- 内容索引：剧本、角色、术语、FAQ、规则索引
- 房间流转：创建房间、加入玩家、随机发牌开局、昼夜推进、提名投票
- 视图隔离：主持可见全量状态，玩家只见自己的私密面板
- 图标策略：保留 `role_icon_key`，默认文字占位，不内置官方图标资源
- 云端持久化：房间文档写入微信云开发 `rooms` 集合，主持和玩家通过云函数读取各自视图

## 目录

- `miniprogram/`：原生微信小程序代码
- `cloudfunctions/`：云函数占位
- `packages/domain/`：房间状态、AI 协议、可见性规则
- `packages/rules-data/`：官方来源驱动的规则数据
- `prompts/`：AI 说书人系统提示词
- `docs/`：产品、Agent、Git 流程文档
- `tests/`：零依赖 Node 测试

## 本地使用

```bash
npm test
```

微信开发者工具导入时，将项目根目录设为当前仓库，`miniprogramRoot` 为 `miniprogram/`，`cloudfunctionRoot` 为 `cloudfunctions/`。

## 云开发要求

- 创建集合：`rooms`
- 部署云函数：`createRoom`、`joinRoom`、`advanceRoom`、`getRoomView`
- 每个云函数目录内都需要安装 `wx-server-sdk`

## v0.2 体验路径

- `房间大厅`：创建房间 / 加入房间 / 刷新房间
- `主持台`：随机发牌开局、推进昼夜、录入提名、按席位结算投票
- `玩家私密面板`：查看个人身份、提交夜间动作、发起提名

## 当前约束

- 仅适配 `Trouble Brewing / 暗流涌动`
- 默认用于内部测试
- 官方角色图标未实装，仅保留资源映射位
- AI 说书人当前是“规则状态机 + 结构化决策协议”骨架
