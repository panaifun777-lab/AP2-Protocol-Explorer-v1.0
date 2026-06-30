# AP2 SEO / GEO / AGO 搜索优化完成度报告

更新日期: 2026-06-21

## 一、术语说明

- SEO: 面向 Google、Bing 等传统搜索引擎的搜索优化。
- GEO: Generative Engine Optimization，面向 ChatGPT、Claude、Perplexity、Gemini 等生成式搜索和 LLM 抓取的优化。
- AGO: Agent Gateway Optimization，面向 AI Agent 自动发现、能力识别和 API 调用的优化。

## 二、完成度总览

| 项目 | 完成度 | 状态 |
| --- | ---: | --- |
| SEO 基础 | 75% | 已有 metadata、robots、sitemap、canonical、OpenGraph、JSON-LD |
| GEO 基础 | 70% | 已有 `llms.txt`、语义标签、协议摘要、能力说明 |
| AGO 基础 | 65% | 已有 `/.well-known/agent.json`、API 入口、能力声明 |
| 内容权威性 | 60% | GitHub、合约地址、BaseScan 信息清晰，但还缺正式域名和白皮书页面 |
| 技术可抓取性 | 80% | 关键文件在 public 根路径，可被 crawler 直接读取 |
| 结构化知识 | 65% | 已有 JSON-LD，但还可增加 FAQ、HowTo、API schema 页面 |

综合判断: 当前已达到“可被搜索和 AI Agent 发现”的基础可上线状态，但距离“高权重协议品牌词占位”和“Agent 自动调用标准”还有下一阶段工作。

## 三、已完成项目

SEO:

- 页面 title 和 description。
- keywords。
- canonical URL。
- OpenGraph。
- Twitter card。
- robots crawler 允许策略。
- sitemap。
- JSON-LD `WebApplication` 和 `SoftwareSourceCode`。

GEO:

- 根目录 `llms.txt`。
- AP2 协议摘要。
- Base Sepolia 合约地址。
- API 入口清单。
- 语义标签: AP2、Avatar Payments Protocol、Web4、AFC、sAFC、BudgetFence、TDPO。
- 明确“服务器不保存私钥，用户钱包签名”。

AGO:

- `/.well-known/agent.json`。
- capabilities。
- endpoints。
- chain id。
- contract addresses。
- canonical identity。
- safety 声明。

## 四、当前不足

SEO 不足:

- 还没有正式品牌域名，例如 `ap2-protocol.com`。
- 首页是单页应用，缺少独立可索引页面，如 `/docs`、`/contracts`、`/api`、`/faq`。
- 暂无社交分享图。
- 暂无 Search Console / Bing Webmaster 验证文件。
- 暂无多语言 hreflang。

GEO 不足:

- `llms.txt` 仍是摘要级，后续应补 `llms-full.txt` 或 `/docs/llms`。
- 没有专门的 FAQ 页面帮助 LLM 回答“AP2 与 x402 / MCP / A2A 的区别”。
- 缺少稳定白皮书 HTML 页面。
- 缺少 OpenAPI 在线地址。

AGO 不足:

- `agent.json` 是发现文件，但还不是完整可执行 Agent manifest。
- `/api/v1/events/stream` 尚未实现。
- 交易接口当前返回 unsigned txRequest，Agent 仍需用户钱包参与。
- 没有 machine-readable OpenAPI JSON 在线入口。
- 没有 rate limit、auth、capability negotiation 字段。

## 五、下一阶段建议

第一阶段: 搜索基础固化

- 绑定正式域名。
- 配置 Search Console 和 Bing Webmaster。
- 添加固定 OpenGraph 图片。
- 添加 `/docs`、`/api`、`/contracts`、`/faq` 静态页面。
- 增加中英文 hreflang。

第二阶段: GEO 内容资产

- 发布 AP2 Litepaper 页面。
- 发布 AP2 vs x402 / MCP / A2A 对比页面。
- 发布 AFC / sAFC 映射说明页面。
- 发布 Base Sepolia 合约验证页面。
- 增加 `llms-full.txt`，包含更完整的协议说明和 FAQ。

第三阶段: AGO 协议发现

- 在线发布 OpenAPI JSON/YAML。
- 完善 `/.well-known/agent.json`:
  - auth policy
  - rate limit
  - transaction mode
  - human approval required
  - supported wallets
  - supported chains
- 实现 `/api/v1/events/stream`。
- 增加 Agent dry-run endpoint。
- 增加 `POST /api/v1/intents/quote`，让 Agent 先询价再请求钱包签名。

第四阶段: 权威性与索引

- BaseScan verified 合约页面互链。
- GitHub README 链回官网。
- 官网链回 GitHub、BaseScan、llms.txt、agent.json。
- 发布技术博客和演示视频。
- 在 README 顶部放 live site、docs、contracts、agent discovery 链接。

## 六、注意事项

- 不要在搜索材料中宣称 Base 主网已上线，目前是 Base Sepolia。
- 不要把 sAFC 描述成真实 AFC 主网资产，应描述为 `1:1 shadow/mapped test token`。
- 不要承诺毫秒级链上结算，当前是链上时间流式释放。
- 不要公开私钥、BaseScan key、GitHub token。
- 对 Agent 调用要明确“需要用户钱包签名”，避免被误解为服务器托管资产。
