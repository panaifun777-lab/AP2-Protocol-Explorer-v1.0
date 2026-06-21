# AP2 MVP 技术总结与功能清单

更新日期: 2026-06-21

## 一、系统定位

AP2 MVP 当前已经从“协议概念展示站”推进到“Base Sepolia 可交互协议控制台”。

系统由两部分组成:

- `ap2-mvp-base`: Solidity 合约、部署记录、验证记录、Base Sepolia runbook、ABI 和前端接入包。
- `AP2-Protocol-Explorer-v1.0`: Next.js 协议浏览器、模拟控制台、`/api/v1` 适配层、钱包交易面板、链上状态回读。

当前目标不是把完整 AP2 宇宙全部上链，而是先跑通可验证的最小闭环:

`BudgetFence -> AP2Escrow -> TDPO_Pool -> FDEAC veto/claim`

## 二、已完成的链上能力

Base Sepolia clean 环境:

- ShadowAFC: `0x2dF7a295650e890fe2A48B3aa58BB38d36E89E42`
- BudgetFence: `0xdb970DE65f90C9447a700C9b06ae6F591a9d9a55`
- AP2Escrow: `0xFd553E5989834DF76f6C790021FDDBfEB9dc2972`
- TDPO_Pool: `0x684FF81da3b9ac92D0f75037f7D3E6C7a792EC8f`

已完成:

- ShadowAFC 测试映射代币。
- BudgetFence payer 策略、scope lock、daily cap。
- AP2Escrow 创建任务、按时间提现、质量结算、取消退款。
- TDPO option fee 接收、认知锁仓、factor 注入、veto、claim 测试路径。
- owner/oracle/FDEAC 权限拆分接口。
- pause/unpause 安全开关。
- BaseScan 合约验证。
- Foundry 测试通过: 10 项合约测试。

## 三、已完成的网站能力

模式:

- Simulation Mode: 使用现有 Prisma/TypeScript 模拟逻辑。
- Base Sepolia Mode: 使用钱包签名真实交易。

钱包:

- 右上角钱包连接。
- Base Sepolia 网络切换。
- 模式切换。

`/api/v1` 交易适配层:

- `POST /api/v1/admin/mint-safc`
- `POST /api/v1/admin/set-policy`
- `POST /api/v1/admin/set-scope`
- `POST /api/v1/escrow/approve`
- `POST /api/v1/escrow/create-task`
- `POST /api/v1/escrow/withdraw`
- `POST /api/v1/escrow/settle`
- `POST /api/v1/tdpo/lock-contrarian`
- `POST /api/v1/tdpo/inject-factor`
- `POST /api/v1/tdpo/veto`
- `POST /api/v1/tdpo/claim`

链上回读:

- `GET /api/v1/escrow/status`
- `GET /api/v1/tdpo/status`

前端 Demo 面板:

- Configure: mint sAFC、set policy、set scope。
- One-click Start: approve、create task、解析 `TaskCreated.taskId`、withdraw、settle、TDPO lock、inject factor、veto。
- 单步按钮: 每个链上动作都可单独调试。
- 状态回读: task id、escrow status、withdrawn、TDPO deposit、veto status、factor。
- 交易历史: 浏览器会话内展示 tx hash 和 BaseScan 链接。

## 四、搜索与 Agent 发现能力

已补齐:

- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `/.well-known/agent.json`
- canonical metadata
- OpenGraph metadata
- Twitter card metadata
- JSON-LD 结构化数据

这些文件让传统搜索引擎、生成式搜索引擎、AI Agent 和 LLM 更容易识别:

- AP2 是什么。
- 当前支持哪些链上能力。
- 如何发现 API。
- 哪些合约地址是 Base Sepolia clean 环境。
- 服务器不托管私钥，交易由用户钱包签名。

## 五、当前验证状态

已通过:

- `bun run lint`
- `bun run build`
- `forge test -vvv`
- 线上 `/api/v1/escrow/status`
- 线上 `/api/v1/tdpo/status`

需要人工钱包验证:

- 使用 `piaoshu.eth` 钱包在网页执行 Configure。
- 使用 One-click Start 跑完整链上闭环。
- 检查 BaseScan 每一步交易。
- 用 Read State 确认链上状态变化。

## 六、当前边界

- 当前仍是 Base Sepolia 测试网，不是 Base 主网。
- ShadowAFC 是 `AFC:sAFC = 1:1` 的测试映射代币，不是真实 AFC 主网桥。
- 网站不会保存私钥。
- 一键 Demo 仍会弹出多次钱包确认，因为每一步都是真实链上交易。
- `/api/v1/events/stream` 还未实现，当前使用状态轮询和交易历史。
