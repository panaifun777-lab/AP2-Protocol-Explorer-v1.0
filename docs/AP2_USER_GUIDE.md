# AP2 MVP 用户使用说明

更新日期: 2026-06-21

访问地址: `https://my-project-chi-rust.vercel.app/`

## 一、准备工作

用户需要:

- MetaMask、Rabby、OKX Wallet 或其他 EIP-1193 钱包。
- 钱包网络切换到 Base Sepolia。
- 钱包里有少量 Base Sepolia ETH 作为 gas。
- 如果要配置 clean 环境，当前需要使用 owner 钱包: `piaoshu.eth` / `0x10687368eF1be3f178de0fCCf5EdfF49e1C258B1`。

## 二、模式说明

网站右上角有两个核心控件:

- Wallet: 连接第三方数字钱包。
- Mode: 切换 `Simulation` 或 `Base Sepolia`。

建议流程:

1. 新用户先用 `Simulation` 熟悉 AP2 模块。
2. 测试真实合约时切换到 `Base Sepolia`。
3. 所有真实交易都需要钱包弹窗签名。

## 三、Base Sepolia Demo 使用流程

进入 Escrow / AP2Escrow 面板，找到 `Base Sepolia Demo Run`。

### 1. Configure

点击 `Configure`。

这个按钮会依次生成并发送:

- `mint-safc`: 给当前钱包铸造测试 sAFC。
- `set-policy`: 给当前 payer 配置 BudgetFence daily cap。
- `set-scope`: 给当前 payer 开启 `legal` scope。

注意:

- 这些是 owner-only 操作。
- clean 环境当前 owner 是 `piaoshu.eth`。
- 如果使用非 owner 钱包，这一步会失败。

### 2. One-click Start

点击 `One-click Start`。

系统会依次执行:

1. `approve`: 授权 AP2Escrow 使用 sAFC。
2. `create-task`: 创建 AP2 托管任务。
3. 等待交易收据。
4. 解析 `TaskCreated.taskId`。
5. `withdraw`: 执行流式提现。
6. `settle`: 质量结算并把 option fee 路由到 TDPO。
7. `lock`: TDPO 认知锁仓。
8. `inject`: 注入 evolution factor。
9. `veto`: 执行 FDEAC veto。

每一步都是真实链上交易，所以钱包会多次弹窗确认。

### 3. Read State

点击 `Read State` 可以读取:

- `nextTaskId`
- 当前 `taskId`
- escrow status
- withdrawn amount
- TDPO deposit
- vetoed 状态
- evolution factor

### 4. Transaction History

面板底部会显示当前浏览器会话产生的交易 hash。

点击 hash 可以跳转到 BaseScan 查看交易细节。

## 四、常见问题

### 钱包提示网络不对

点击网站钱包按钮或交易按钮时，网站会尝试切换到 Base Sepolia。若钱包未添加该网络，需要确认添加。

### Configure 失败

通常原因是当前钱包不是 owner。clean 测试环境的 owner 是 `piaoshu.eth` 地址。

### One-click Start 中途失败

常见原因:

- gas 不足。
- 用户拒绝钱包签名。
- sAFC 余额不足。
- BudgetFence policy 或 scope 未配置。
- 刚创建任务后等待时间不足或链上交易尚未确认。

建议:

1. 先点击 `Read State`。
2. 检查 Transaction History 的最后一笔交易。
3. 打开 BaseScan 看失败原因。
4. 必要时用单步按钮从失败步骤继续。

### 为什么不是一次钱包确认

AP2 MVP 当前每个动作都是单独合约交易。后续可以通过批处理合约、账户抽象或 session key 优化用户体验。

## 五、正式演示建议

演示顺序:

1. 先展示 Simulation Mode，让观众理解 AP2 模块。
2. 切换 Base Sepolia Mode。
3. 连接 `piaoshu.eth` 钱包。
4. 点击 Configure。
5. 点击 One-click Start。
6. 展示交易历史和 BaseScan。
7. 点击 Read State 展示链上状态回读。

演示前检查:

- Base Sepolia ETH 余额。
- sAFC mint 权限。
- 网站是否已经部署最新版本。
- BaseScan 是否可访问。
- 浏览器钱包是否连接正确地址。
