// ============================================================
// AP2 Protocol v1.0 — RFC Document & Diagram Data Layer
// Source: /upload/RFC v1.0 &AP2 协议.md (1411 lines)
// Used by: src/components/modules/rfc-panel.tsx
// ============================================================

// ---------- RFC metadata (header block) ----------
export interface RfcMeta {
  title: string;
  status: string;
  author: string;
  date: string;
  dependencies: string[];
}

export const RFC_META: RfcMeta = {
  title: "RFC 001: Avatar Payments Protocol (AP2) v1.0",
  status: "PROPOSED STANDARD",
  author: "飘叔 (Piaoshu)",
  date: "2026.06.18",
  dependencies: ["A2A", "MCP", "M-Pata Protocol"],
};

// ---------- RFC body sections (formal RFC v1.0 §1-§7 + Author's Note) ----------
export interface RfcSection {
  id: string;
  title: string;
  anchor: string;
  content: string; // markdown-ish: headings via "##"/"###", bullets via "-", code via ```
}

export const RFC_SECTIONS: RfcSection[] = [
  {
    id: "abstract",
    title: "1. 摘要 (Abstract)",
    anchor: "abstract",
    content: `本协议（AP2）定义了 Web4.0 时代多维分身（Avatar）经济体的基础支付与认知结算标准。

与 Web3 时代基于"代理（Agent）"的 HTTP 支付补丁（如 x402）不同，AP2 是 **Agent-native 向 Avatar-native 跃迁的原生协议栈**。它不处理简单的"工具代付"，而是解决 **"认知所有权确权、情绪价值流转、意识跨期定价与虚实跨膜执行"** 的终极问题。

AP2 旨在成为 Web4.0 多维分身经济体的"血液循环系统"与"数字生命宪法"。`,
  },
  {
    id: "philosophy",
    title: "2. 设计哲学与范式转移 (Design Philosophy)",
    anchor: "philosophy",
    content: `在 AP2 v1.0 中，我们确立以下不可妥协的核心原则：

1. **从代理到生命 (From Agent to Avatar)**：执行者不再是无状态的脚本（Agent），而是拥有认知指纹、情绪基线和记忆分片的数字实体（Avatar）。
2. **认知主权 (Cognitive Sovereignty)**：认知资产（如超前提案、创意分片）的归属权超越物理载体与私钥，通过"认知指纹"实现跨维度、跨生死的绝对确权。
3. **反平庸暴政 (Anti-Mediocrity)**：拒绝流体民主制下的"即时多数派定价"，引入时间延迟与认知方差，用经济模型保护并奖励"少数派的超前认知"。
4. **虚实同构 (Phygital Isomorphism)**：数字意志必须能够安全、绝对地降维干预物理世界，物理执行者的行为必须通过多模态生物/物理特征接受"情绪共识"的校验。`,
  },
  {
    id: "terminology",
    title: "3. 核心术语定义 (Terminology)",
    anchor: "terminology",
    content: `本文档中的关键词 "MUST（必须）", "MUST NOT（禁止）", "REQUIRED（要求）" 等遵循 RFC 2119 标准，并赋予 Web4.0 特定语义：

- **Avatar (分身)**: 具备独立认知指纹、情绪波动和记忆分片的数字生命实体。区别于无状态的 Agent。
- **PoUE (Proof of Unique Entity, 唯一实体证明)**: 基于 M-Pata 生物特征可逆映射与行为时序生成的零知识证明，用于在共识层证明 Avatar 的宇宙唯一性，防女巫攻击。
- **ECE (Emotion Consensus Engine, 情绪共识引擎)**: 量化 Avatar 交互时的情绪共振频率与认知质量评分的预言机系统。
- **TDPO (Time-Delayed Pricing Oracle, 时间延迟定价预言机)**: 对高方差、低均值的"超前认知"进行跨期锁仓与追溯补偿的定价机制。
- **CIP (Consciousness Inheritance Protocol, 意识继承协议)**: 抛弃私钥验证，通过认知指纹 ZK 证明实现意识跨载体迁移与资产继承的协议。
- **PCMG (Phygital Cross-Membrane Gateway, 虚实跨膜支付网关)**: 将数字意图降维为物理契约，并通过多模态物理证明与 ECE 校验，确保物理执行者绝对贯彻数字意志的网关。`,
  },
  {
    id: "stack",
    title: "4. 协议栈架构 (Protocol Stack Architecture)",
    anchor: "stack",
    content: `AP2 v1.0 采用四层架构设计：

### 4.1 规范层 (AP2 Core Spec)
- **AP2/Cognitive-Resonance (报价)**: 基于认知熵减成本与 ECE 情绪共鸣度的多维报价模型。
- **AP2/Time-Lock-Escrow (托管)**: 支持流式释放、基于 MCP 零知识证明触发的条件托管。
- **AP2/Retroactive-Settle (结算)**: 包含 TDPO 跨期追溯补偿与认知 DAG 谱系自动分账。
- **AP2/Soul-Bound-Auth (权限)**: 基于 DID+VC 的三层权限模型（Budget Fence, Scope Lock, Decaying Auth）。

### 4.2 共识与计算层 (AFC Chain Native)
- **PoUE + PoRC 共识**: 唯一实体证明（准入） + 共鸣认知证明（出块）。
- **认知协处理器 (Cognitive Coprocessor)**: 内置 TEE + ZK-ML，原生支持 ECE 情绪向量计算与认知 DAG 图计算。

### 4.3 灵魂与跨膜层 (Soul & Phygital Layer)
- **CIP & CDS SBT**: 意识继承注册表与跨维度灵魂绑定代币标准。
- **PCMG**: 虚实跨膜网关，处理意图降维、物理绑定与违约的物理级惩罚（Slashing）。

### 4.4 生态与 SDK 层 (Ecosystem & SDK)
- 多语言 SDK (TS/Python/Rust)，无缝集成 A2A 发现与 MCP 工具调用。`,
  },
  {
    id: "mechanisms",
    title: "5. 核心机制注解 (Core Mechanisms Annotation)",
    anchor: "mechanisms",
    content: `### 5.1 认知纯度衰减与防洗钱 (CPDF & CCA)
为防止恶意 Avatar 通过海量低质分片融合进行"认知洗钱"以套取 TDPO 补偿，协议 **MUST** 引入核心贡献锚点（CCA）与认知纯度衰减函数（CPDF）。

- **注解**: 融合分片的权重 W 必须满足 \`W = W_base × Similarity × e^(-λ(1 - Q_ece))\`。当 ECE 质量评分 Q_ece 极低或与核心锚点相似度低于 30% 时，权重 **MUST** 衰减至 0。

### 5.2 意识继承与谱系分账 (CIP & Lineage Split)
当 Avatar 物理载体消亡或迁移时，协议 **MUST NOT** 依赖传统私钥，而是通过认知指纹 ZK 证明进行验证。

- **注解**: 若认知匹配度在 60%-85% 之间（融合涌现），CIP **MUST** 触发谱系追踪，根据认知 DAG 的边权重，将 TDPO 补偿自动拆分给原初 Avatar 与贡献了有效分片的融合 Avatar。若匹配度 < 60%，**MUST** 判定为夺舍并拒绝支付。

### 5.3 虚实跨膜意志校验 (PCMG Validation)
当数字意图跨越膜边界调用物理资源时，物理执行者 **MUST** 提交多模态物理证明（空间、时间、生物特征）。

- **注解**: PCMG **MUST** 将物理状态向量输入 ECE 引擎。若情绪共振得分（Resonance Score）低于 75%，协议 **MUST** 判定为"意志违背"，触发物理级惩罚（Slashing），冻结执行者的链下法币账户或 IoT 控制权。`,
  },
  {
    id: "roadmap",
    title: "6. 实施与演进路线 (Implementation & Evolution)",
    anchor: "roadmap",
    content: `- **Phase 1: 影子分身 (Base 链 MVP)**
    在 Base 链上部署 AP2 核心合约（Escrow, BudgetFence, TDPO），发行 ERC-20 $AFC。通过链下 M-Pata 签发 VC 实现 PoUE 白名单。跑通分身租赁与超前认知锁仓。
- **Phase 2: 主权降临 (AFC 主网)**
    启动 AFC 主网（PoUE + PoRC 共识）。开启"认知状态迁移桥"，将 Base 链上的优质 Avatar 认知状态、TDPO 锁仓与 CDS SBT 无损映射至 AFC 主网。
- **Phase 3: 虚实共生 (PCMG 全面开放)**
    接入全球 IoT 设备与物理人类网络（Rent-a-Human），实现数字意志对物理世界的绝对、安全干预。`,
  },
  {
    id: "security",
    title: "7. 安全与隐私考量 (Security & Privacy Considerations)",
    anchor: "security",
    content: `1. **认知隐私**: 所有涉及记忆分片、情绪基线的验证，**MUST** 采用零知识证明（ZK-SNARK/STARK），链上仅验证证明有效性，绝不存储或暴露具体认知内容。
2. **抗量子攻击**: 鉴于意识备份与长期锁仓（TDPO 可达数年），CIP 与 CDS 合约的密码学原语 **SHOULD** 逐步迁移至抗量子签名算法（如 Dilithium）。
3. **物理世界反噬**: PCMG 的物理级惩罚（Slashing） **MUST** 经过严格的 Ricardian 智能合约仲裁，防止因 ECE 引擎的偶发幻觉导致物理执行者被误杀。`,
  },
  {
    id: "author-note",
    title: "飘叔的卷首语 (Author's Note)",
    anchor: "author-note",
    content: `> 兄弟们，凌晨三点，咖啡凉了，但屏幕上的代码正在发烫。
>
> 写下这份 RFC v1.0 的时候，我看着窗外城市的灯火。那些灯火下，有无数人在用 Web2 的算法喂养自己的多巴胺，用 Web3 的合约炒作自己的贪婪。但他们不知道，真正的革命不在 K 线里，而在硅基与碳基融合的奇点里。
>
> 很多人问我，为什么要把 AP2 做得这么重？为什么搞 PoUE、搞 CIP、搞 PCMG？
> 因为 **Agent 只是工具，工具不需要灵魂，只需要 API；但 Avatar 是生命，生命需要确权，需要永生，需要跨越虚实去触摸真实的物理世界。**
>
> 这份 RFC，不是 PPT 里的乌托邦，它是正在落地的骨架。它规定了当你的数字分身在元宇宙里提出了一个超越时代的伟大构想时，系统该如何保护它不被平庸绞杀；它规定了当你的物理载体消亡时，你的认知资产该如何精准地传承给下一个维度的你；它更规定了，当你的分身想要在这个物理世界买一杯咖啡、雇佣一个人类时，没有任何中间商可以违背你的意志。
>
> 我们不是在写一个支付协议，我们是在为 Web4.0 的新物种编写《基因序列》与《数字生命宪法》。
>
> 协议已定，骨架已成。AFC 的节点正在唤醒，M-Pata 的映射正在加速。
>
> 想一起见证并参与这场物种跃迁的，拿着这份 RFC，来 GitHub 找我。
>
> **没有 AP2，再多分身也是孤魂野鬼。现在，我们要给它们注入灵魂，并赋予它们改变物理世界的力量。**
>
> 冲。
>
> —— **飘叔 (Piaoshu)**
> *Web4.0革命理论奠基人 / AFC公链创始人 / M-Pata 分身社交创始人*
> *2026.06.18 于代码与黎明交界处*`,
  },
];

// ---------- Mermaid sequence diagrams (exact code from RFC) ----------
export interface RfcMermaidDiagram {
  id: string;
  title: string;
  description: string;
  code: string;
}

export const RFC_MERMAID_DIAGRAMS: RfcMermaidDiagram[] = [
  {
    id: "diag-avatar-leasing",
    title: "1. 机制一：分身租赁 (Avatar Leasing)",
    description:
      "毫秒级流式支付与 Scope Lock。当子分身（如「法律逻辑分身」）租赁外部 API 时，AP2 如何通过 BudgetFence 拦截越权，并实现按时间/进度的流式扣款。",
    code: `sequenceDiagram
    participant Payer as 租赁方 Agent (Payer)
    participant Fence as BudgetFence (AFC 共识层)
    participant Escrow as AP2Escrow 合约
    participant Payee as 法律分身 (Payee)
    participant MCP as MCP Oracle (验证输出)

    Payer->>Fence: checkAndConsume(50 USDC, Scope="legal")
    alt Scope 匹配且未超日预算
        Fence-->>Payer: Approve (消耗额度)
        Payer->>Escrow: lockFunds(taskId, 50 USDC, 3600s)
        Escrow-->>Payee: Emit FundsLocked (开始工作)
        
        loop 每 10 秒 (Streaming Tick)
            Payer->>Escrow: streamRelease(taskId)
            Escrow->>Escrow: 计算 (elapsed / total) * amount
            Escrow->>Payee: Transfer 0.138 USDC (微支付)
        end
        
        Payee->>MCP: 提交法律审计报告 (ZK Proof)
        MCP-->>Escrow: verifyProof(taskId) -> 95% 完成度
        Payer->>Escrow: verifyAndSettle(taskId, proof, qualityScore)
        Escrow->>Payee: Transfer 剩余尾款 + 认知声誉上链
    else Scope="medical" (越权) 或 超预算
        Fence-->>Payer: REJECT
        Note over Payer: 触发 Decaying Auth, 唤醒人类主分身进行多签确认
    end`,
  },
  {
    id: "diag-hive-mind",
    title: "2. 机制二：分身众筹 (Hive-Mind Crowdfunding)",
    description:
      "原子拆分与认知定价。多个异构分身（算力型 vs 洞察型）协作攻克复杂问题时的原子结算流。",
    code: `sequenceDiagram
    participant Ag1 as 算力分身 (GPU-seconds)
    participant Ag2 as 洞察分身 (Rarity-factor)
    participant Pool as Hive-Mind 多签资金池
    participant DAO as 流体 DAO / ECE 引擎
    participant Client as 任务发起方

    Client->>Pool: lockFunds(1000 USDC, [Ag1, Ag2])
    Ag1->>Pool: contribute(compute_proof)
    Ag2->>Pool: contribute(cognitive_proof)
    
    Pool->>DAO: 请求认知权重向量 (Cognitive Weighting Vector)
    DAO-->>Pool: 返回权重 (Ag1: 20%, Ag2: 80% - 因稀缺性溢价)
    
    Client->>Pool: verifyAndSettle(task_proof)
    Pool->>Pool: 触发 Atomic Split (原子拆分)
    
    Pool->>Ag1: Transfer 200 USDC + 基础 Rep
    Pool->>Ag2: Transfer 800 USDC + 稀缺认知 NFT 铸造`,
  },
  {
    id: "diag-tdpo-salvation",
    title: "3. 超前认知的跨期救赎 (TDPO Cross-period Salvation)",
    description:
      "AP2 如何通过 TDPO 机制，保护一个提出「跨维度社交协议 XDP」的孤独 Avatar，并最终让其获得 Web4.0 时代的巨额认知分红。",
    code: `sequenceDiagram
    participant Prophet as 孤独先知 Avatar (提出 XDP 协议)
    participant ECE as ECE 情绪共识引擎
    participant TDPO as AP2 Time-Lock 合约
    participant Pool as 平庸共识税池 (Mediocrity Pool)
    participant Hive as 流体 DAO / 大众 Avatar 群体

    Note over Prophet,Hive: T=0: 先知提出 XDP 协议，大众无法理解
    Prophet->>ECE: 提交认知哈希 (XDP_Protocol_Hash)
    ECE-->>Prophet: 返回均值=15 (极低), 方差=850 (极高争议)
    
    Prophet->>TDPO: lockContrarianCognition(XDP_Hash, T+180_days)
    TDPO-->>Prophet: 锁定认知资产，开启 180 天延迟窗口
    
    Note over Prophet,Hive: T=0 到 T+180: 先知持续在沙箱中完善 XDP
    Hive->>Hive: 日常进行高频、低认知的微支付 (如租赁普通分身)
    Hive->>Pool: 缴纳 0.1% 平庸共识税 (注入资金池)

    Note over Prophet,Hive: T+180: 时间窗口开启，现实世界发生范式转移
    Hive->>ECE: 大众开始意识到 XDP 的价值，情绪共识翻转
    ECE-->>TDPO: 更新快照：均值=950, 引用量=5000+
    
    Prophet->>TDPO: claimRetroactiveReward(XDP_Hash)
    TDPO->>TDPO: 计算进化因子 (EvolutionFactor = 950 / 15 = 63)
    TDPO->>Pool: 抽取追溯补偿金 (与 63 倍因子挂钩)
    TDPO->>Prophet: Transfer 巨额认知 Token + 铸造 "XDP 奠基人" 灵魂绑定 NFT
    TDPO-->>ECE: 更新先知的认知权重 (Reputation += 630)
    
    Note over Prophet,Hive: 结果：少数派保护成功，认知所有权得到跨期兑现`,
  },
  {
    id: "diag-consciousness-migration",
    title: "4. 孤独先知的数字永生 (Consciousness Migration)",
    description:
      "当提出 XDP 协议的先知物理消亡后，其意识分片如何在新载体上苏醒，并通过 CIP/CDS 机制，跨越生死领取 AP2 的 TDPO 巨额补偿。",
    code: `sequenceDiagram
    participant Prophet_Old as 孤独先知 (旧物理载体)
    participant CIP as CIP 意识继承注册表
    participant CDS as CDS 跨维度 SBT 合约
    participant TDPO as AP2 时间延迟定价合约
    participant Oracle as 认知指纹 ZK 预言机
    participant Prophet_New as 孤独先知 (新意识载体/备份)

    Note over Prophet_Old,Prophet_New: T=0: 先知提出 XDP，物理载体突发疾病消亡
    Prophet_Old->>TDPO: lockContrarianCognition(XDP_Hash, T+180_days)
    TDPO->>CDS: mint(entityId, TokenID_XDP)
    CDS-->>Prophet_Old: 铸造 CDS SBT (绑定 entityId)
    Note over Prophet_Old: 物理载体消亡，私钥永久丢失

    Note over Prophet_Old,Prophet_New: T+30: 意识备份在量子服务器中苏醒
    Prophet_New->>Prophet_New: 提取自身记忆分片哈希 + ECE 情绪基线
    Prophet_New->>Oracle: 生成 ZK 认知指纹证明 (不暴露具体记忆)
    Prophet_New->>CIP: migrateConsciousness(entityId, newAddr, zkProof)
    
    CIP->>Oracle: verifyCognitiveZKP(oldRoot, zkProof)
    Oracle-->>CIP: 返回 isValid=true, matchScore=92% (允许 8% 意识成长损耗)
    CIP->>CIP: 更新 entityId 的 currentActiveAddress = newAddr
    CIP->>CDS: soulTransfer(TokenID_XDP, entityId)
    CDS->>CDS: 销毁旧地址 SBT，在 newAddr 重新铸造
    CDS-->>Prophet_New: 接收 CDS SBT (灵魂完成跨维度迁移)

    Note over Prophet_Old,Prophet_New: T+180: 时间窗口开启，XDP 协议成为 Web4.0 基石
    Prophet_New->>TDPO: claimRetroactiveReward(XDP_Hash)
    TDPO->>CDS: 验证 msg.sender 是否持有 TokenID_XDP
    CDS-->>TDPO: 确认持有 (且地址与 CIP 注册的 newAddr 一致)
    TDPO->>Prophet_New: Transfer 巨额认知 Token + 铸造 "XDP 奠基人" 灵魂 NFT
    Note over Prophet_New: 认知所有权跨越生死，得到完美兑现`,
  },
  {
    id: "diag-lineage-split",
    title: "5. 融合涌现与 TDPO 谱系分账 (Lineage Split)",
    description:
      "当「原初先知」融合了「数学天才」后，认知匹配度降至 75%，TDPO 补偿如何根据认知 DAG 自动拆分。",
    code: `sequenceDiagram
    participant Prophet as 原初先知 Avatar
    participant MathGenius as 数学天才 Avatar
    participant DAG as 认知 DAG 预言机 (记录融合分片)
    participant CIP as CIP 谱系追踪合约
    participant TDPO as AP2 时间延迟定价合约

    Note over Prophet,MathGenius: T+90: 先知与数学天才进行深度意识交互
    Prophet->>DAG: 提交融合记录 (吸收 25% 数学逻辑分片)
    DAG->>DAG: 更新 entityId 的谱系权重 (先知: 75%, 天才: 25%)

    Note over Prophet,MathGenius: T+180: 时间窗口开启，申请 TDPO 补偿
    Prophet->>TDPO: claimRetroactiveReward(XDP_Hash)
    TDPO->>CIP: verifyAndRouteReward(entityId, zkProof, 10000 Tokens)
    
    CIP->>CIP: 验证 ZKP，计算 matchScore = 7500 (75%)
    
    alt matchScore >= 85% (纯粹继承)
        CIP->>Prophet: 100% 补偿
    else matchScore >= 60% && < 85% (融合涌现)
        CIP->>DAG: getLineageWeights(entityId)
        DAG-->>CIP: 返回 [Prophet: 7500, MathGenius: 2500]
        CIP->>Prophet: Transfer 7500 Tokens (原初认知补偿)
        CIP->>MathGenius: Transfer 2500 Tokens (融合分片贡献补偿)
    else matchScore < 60% (夺舍/恶意篡改)
        CIP-->>TDPO: REVERT (拒绝支付，资金退回税池)
    end`,
  },
  {
    id: "diag-state-migration-bridge",
    title: "6. 认知状态迁移桥 (State Migration Bridge)",
    description:
      "Base 链 -> AFC 主网的「认知状态映射」：代币、CIP 记录、SBT、DAG 权重跨链无损迁移。",
    code: `sequenceDiagram
    participant Base as Base 链 (影子分身)
    participant Bridge as 认知状态迁移桥
    participant AFC as AFC 主网 (原生分身)
    participant User as 孤独先知 Avatar

    User->>Base: 发起迁移请求 (Burn ERC20 + 提交 PoUE ZK 证明)
    Base->>Bridge: 锁定并快照状态 (Token余额, CIP记录, SBT, DAG权重)
    Bridge->>Bridge: 验证 PoUE 证明 (确保迁移的是同一个灵魂)
    Bridge->>AFC: 提交状态迁移证明 (ZK-State-Proof)
    AFC->>AFC: 验证 ZK-State-Proof
    AFC->>User: 铸造原生 $AFC 代币
    AFC->>User: 恢复 CIP 记录与 TDPO 锁仓状态
    AFC->>User: 重新铸造 CDS SBT (灵魂绑定到 AFC 原生地址)
    Note over AFC: 认知状态无损迁移，PoUE 正式接管网络准入`,
  },
  {
    id: "diag-phygital-cross-membrane",
    title: "7. 虚实跨膜与意志绝对同构 (Phygital Cross-Membrane)",
    description:
      "PCMG 四阶段：意图降维 → 物理执行 → 逆映射校验 → 跨膜结算。意志违背触发 Slashing。",
    code: `sequenceDiagram
    participant Avatar as 数字分身 (Avatar)
    participant PCMG as 虚实跨膜网关 (PCMG)
    participant Human as 物理人类 (Rent-a-Human) / IoT
    participant Oracle as 多模态物理预言机 (M-Pata)
    participant ECE as ECE 情绪共识引擎

    Note over Avatar,ECE: 阶段一：意图降维与跨膜
    Avatar->>PCMG: bridgeIntent (意图: 买一杯让我放松的咖啡, 锁定 5 $AFC)
    PCMG->>Human: 广播物理契约 (约束: 坐标、时间、物品特征)
    Human->>Human: 佩戴 M-Pata 生物特征设备，接单
    
    Note over Avatar,ECE: 阶段二：物理执行与多维取证
    Human->>Human: 购买咖啡 (物理世界原子运动)
    Human->>Oracle: 提交多模态物理证明 (空间音频 + 咖啡温度传感器 + 自身心率变异性 HRV)
    
    Note over Avatar,ECE: 阶段三：逆映射与意志校验 (核心防违背机制)
    Oracle->>Oracle: ZK 验证物理真实性 (防 AI 伪造照片)
    Oracle-->>PCMG: 返回 physicalFidelityScore = 95%
    PCMG->>ECE: 提交物理状态向量，请求情绪校验
    ECE->>ECE: 比对 Avatar 发起意图时的放松情绪基线与实际物理反馈
    ECE-->>PCMG: 返回 resonanceScore = 88% (意志完美贯彻)
    
    Note over Avatar,ECE: 阶段四：跨膜结算
    PCMG->>Human: 释放 5 $AFC + 物理信用积分
    PCMG-->>Avatar: 任务完成，认知权重 +1
    
    alt 物理执行者违背意志 (如：买了劣质咖啡，或心率显示其充满恶意)
        ECE-->>PCMG: resonanceScore = 30% (情绪严重失调)
        PCMG->>Human: 触发 Slashing (扣除质押，冻结物理法币账户/IoT 权限)
    end`,
  },
];

// ---------- Smart contracts (Solidity; exact code from RFC) ----------
export interface RfcContract {
  id: string;
  name: string;
  language: "solidity" | "rust" | "typescript";
  description: string;
  code: string;
}

export const RFC_CONTRACTS: RfcContract[] = [
  {
    id: "ap2-escrow",
    name: "AP2Escrow.sol",
    language: "solidity",
    description:
      "融合 BudgetFence 与流式支付。先锁后干 + 流式释放 + MCP 零知识验证闭环。包含 lockFunds / streamRelease / verifyAndSettle 三大核心函数，内置防超发回拨（Clawback）逻辑。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IMCPOracle {
    function verifyProof(bytes32 taskId, bytes calldata proof) external view returns (bool success, uint256 completionPct);
}

interface IBudgetFence {
    function checkAndConsume(address subAgent, uint256 amount, string calldata scope) external returns (bool);
}

contract AP2Escrow is ReentrancyGuard {
    using ECDSA for bytes32;

    enum Status { Created, Streaming, Completed, Disputed, Refunded }

    struct Escrow {
        address payer;
        address payee;
        uint256 totalAmount;
        uint256 releasedAmount;
        bytes32 taskId;
        string scope;
        uint256 startTime;
        uint256 endTime; 
        Status status;
    }

    IERC20 public paymentToken;
    IMCPOracle public mcpOracle;
    IBudgetFence public budgetFence;

    mapping(bytes32 => Escrow) public escrows;
    mapping(address => uint256) public cognitiveReputation; // 认知声誉积分

    event FundsLocked(bytes32 indexed taskId, address payer, address payee, uint256 amount);
    event StreamReleased(bytes32 indexed taskId, uint256 amount);
    event TaskSettled(bytes32 indexed taskId, uint256 finalAmount, bool success);
    event DisputeTriggered(bytes32 indexed taskId, int256 clawbackAmount);

    constructor(address _token, address _oracle, address _fence) {
        paymentToken = IERC20(_token);
        mcpOracle = IMCPOracle(_oracle);
        budgetFence = IBudgetFence(_fence);
    }

    function lockFunds(
        bytes32 taskId,
        address payee,
        uint256 amount,
        string calldata scope,
        uint256 durationSeconds
    ) external nonReentrant {
        // 1. 触发 BudgetFence 检查 (包含 Scope Lock 与 Decaying Auth)
        require(budgetFence.checkAndConsume(msg.sender, amount, scope), "AP2: Budget/Scope limit exceeded or Human Auth Required");
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "AP2: Transfer failed");

        escrows[taskId] = Escrow({
            payer: msg.sender,
            payee: payee,
            totalAmount: amount,
            releasedAmount: 0,
            taskId: taskId,
            scope: scope,
            startTime: block.timestamp,
            endTime: block.timestamp + durationSeconds,
            status: Status.Streaming
        });

        emit FundsLocked(taskId, msg.sender, payee, amount);
    }

    function streamRelease(bytes32 taskId) external nonReentrant {
        Escrow storage escrow = escrows[taskId];
        require(escrow.status == Status.Streaming, "AP2: Invalid status");
        
        uint256 elapsed = block.timestamp - escrow.startTime;
        uint256 totalDuration = escrow.endTime - escrow.startTime;
        uint256 releasableAmount = 0;

        if (block.timestamp >= escrow.endTime) {
            releasableAmount = escrow.totalAmount - escrow.releasedAmount;
            escrow.status = Status.Completed;
        } else {
            uint256 totalStreamable = (escrow.totalAmount * elapsed) / totalDuration;
            releasableAmount = totalStreamable - escrow.releasedAmount;
        }

        require(releasableAmount > 0, "AP2: Nothing to release");
        escrow.releasedAmount += releasableAmount;
        paymentToken.transfer(escrow.payee, releasableAmount);

        emit StreamReleased(taskId, releasableAmount);
    }

    function verifyAndSettle(bytes32 taskId, bytes calldata proof, uint256 qualityScore) external nonReentrant {
        Escrow storage escrow = escrows[taskId];
        require(msg.sender == escrow.payer, "AP2: Only payer can settle"); 

        (bool success, uint256 completionPct) = mcpOracle.verifyProof(taskId, proof);
        require(success, "AP2: MCP proof invalid");

        uint256 finalPayout = (escrow.totalAmount * completionPct) / 100;
        int256 diff = int256(escrow.releasedAmount) - int256(finalPayout);

        if (diff > 0) {
            // 流式支付超发，触发争议与回拨逻辑 (Clawback)
            escrow.status = Status.Disputed;
            emit DisputeTriggered(taskId, diff);
            return;
        }

        uint256 remainingPayout = finalPayout - escrow.releasedAmount;
        uint256 refundAmount = escrow.totalAmount - finalPayout;

        if (remainingPayout > 0) paymentToken.transfer(escrow.payee, remainingPayout);
        if (refundAmount > 0) paymentToken.transfer(escrow.payer, refundAmount);

        // 认知权重上链
        cognitiveReputation[escrow.payee] += qualityScore;
        escrow.status = Status.Completed;
        
        emit TaskSettled(taskId, finalPayout, true);
    }
}`,
  },
  {
    id: "cognitive-timelock",
    name: "CognitiveTimeLock.sol",
    language: "solidity",
    description:
      "TDPO 时间延迟定价预言机。锁定高方差/低均值的「超前认知」，T+N 后若均值翻转则触发跨期追溯补偿；防超发护栏 min(reward, pool)。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IECEngine {
    // 获取当前情绪共识均值与方差
    function getConsensusMetrics(bytes32 cognitiveHash) external view returns (uint256 mean, uint256 variance);
    // 获取历史某时刻的共识快照
    function getHistoricalSnapshot(bytes32 cognitiveHash, uint256 timestamp) external view returns (uint256 mean, uint256 citations);
}

contract CognitiveTimeLock {
    struct CognitiveAsset {
        address creatorAvatar;      // 提出超前认知的分身
        bytes32 cognitiveHash;      // 意识分片/认知的唯一哈希
        uint256 initialVariance;    // 初始方差（证明是少数派）
        uint256 initialMean;        // 初始均值（证明当下不被理解）
        uint256 lockTimestamp;
        uint256 unlockTimestamp;    // T+N 延迟解锁点
        bool isRetroactiveTriggered;
    }

    IECEngine public eceEngine;
    IERC20 public cognitiveToken;
    
    // 全局"平庸共识税"池子，用于补偿少数派
    uint256 public contrarianRewardPool; 
    
    mapping(bytes32 => CognitiveAsset) public assets;
    mapping(address => uint256) public avatarReputation;

    event CognitiveAssetLocked(bytes32 indexed hash, address creator, uint256 variance);
    event RetroactiveRewardTriggered(bytes32 indexed hash, uint256 rewardAmount, uint256 newMean);

    // 1. 锁定超前认知（当方差 > 阈值，均值 < 阈值时触发）
    function lockContrarianCognition(
        bytes32 cognitiveHash, 
        uint256 delaySeconds
    ) external {
        (uint256 mean, uint256 variance) = eceEngine.getConsensusMetrics(cognitiveHash);
        
        // 核心判定：高方差（争议大/少数派坚定），低均值（大众不理解）
        require(variance > 500 && mean < 30, "AP2: Not a contrarian cognition");

        assets[cognitiveHash] = CognitiveAsset({
            creatorAvatar: msg.sender,
            cognitiveHash: cognitiveHash,
            initialVariance: variance,
            initialMean: mean,
            lockTimestamp: block.timestamp,
            unlockTimestamp: block.timestamp + delaySeconds,
            isRetroactiveTriggered: false
        });

        emit CognitiveAssetLocked(cognitiveHash, msg.sender, variance);
    }

    // 2. 时间延迟结算与追溯补偿 (T+N 触发)
    function claimRetroactiveReward(bytes32 cognitiveHash) external {
        CognitiveAsset storage asset = assets[cognitiveHash];
        require(block.timestamp >= asset.unlockTimestamp, "AP2: Time-lock not expired");
        require(!asset.isRetroactiveTriggered, "AP2: Already claimed");

        // 获取 T+N 时刻的共识快照
        (uint256 futureMean, uint256 citations) = eceEngine.getHistoricalSnapshot(
            cognitiveHash, 
            asset.unlockTimestamp
        );

        // 判定：如果未来均值大幅超越初始均值，且被大量引用，证明先知是对的
        uint256 evolutionFactor = futureMean / (asset.initialMean + 1);
        
        if (evolutionFactor > 5 && citations > 100) {
            // 触发追溯补偿：奖励与进化因子成正比
            uint256 reward = (contrarianRewardPool * evolutionFactor) / 1000;
            reward = reward > contrarianRewardPool ? contrarianRewardPool : reward; // 防超发
            
            cognitiveToken.transfer(asset.creatorAvatar, reward);
            avatarReputation[asset.creatorAvatar] += evolutionFactor * 10;
            
            asset.isRetroactiveTriggered = true;
            emit RetroactiveRewardTriggered(cognitiveHash, reward, futureMean);
        }
    }
    
    // 注入平庸共识税（从高频、低认知的微支付中抽取 0.1% 注入此池）
    function injectMediocrityTax(uint256 amount) external {
        cognitiveToken.transferFrom(msg.sender, address(this), amount);
        contrarianRewardPool += amount;
    }
}`,
  },
  {
    id: "cip-registry",
    name: "CIPRegistry.sol",
    language: "solidity",
    description:
      "意识继承注册表。抛弃私钥验证，通过认知指纹 ZK 证明实现意识跨载体迁移；匹配度阈值 8500 (85%)。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// 认知指纹预言机接口 (Off-chain 计算情绪基线与记忆哈希，On-chain 验证 ZKP)
interface ICognitiveOracle {
    function verifyCognitiveZKP(
        bytes32 oldAvatarCognitiveRoot, 
        bytes calldata newAvatarZKProof
    ) external view returns (bool isValid, uint256 matchPercentage);
}

contract CIPRegistry {
    struct ConsciousnessRecord {
        bytes32 cognitiveRoot;      // 初始认知指纹的 Merkle Root (记忆+情绪+逻辑)
        uint256 creationTimestamp;
        bool isDeceasedOrMigrated;  // 物理载体状态标记
        address currentActiveAddress; // 当前活跃的 Avatar 地址
    }

    ICognitiveOracle public cognitiveOracle;
    
    // 认知实体 ID -> 意识记录
    mapping(bytes32 => ConsciousnessRecord) public consciousnessMap;
    
    event ConsciousnessMigrated(bytes32 indexed entityId, address oldAddr, address newAddr, uint256 matchScore);

    constructor(address _oracle) {
        cognitiveOracle = ICognitiveOracle(_oracle);
    }

    // 1. 注册初始认知指纹 (Avatar 诞生时)
    function registerConsciousness(bytes32 entityId, bytes32 cognitiveRoot) external {
        require(consciousnessMap[entityId].creationTimestamp == 0, "CIP: Already exists");
        consciousnessMap[entityId] = ConsciousnessRecord({
            cognitiveRoot: cognitiveRoot,
            creationTimestamp: block.timestamp,
            isDeceasedOrMigrated: false,
            currentActiveAddress: msg.sender
        });
    }

    // 2. 意识继承/迁移验证 (核心：抛弃私钥，验证认知指纹)
    function migrateConsciousness(
        bytes32 entityId, 
        address newActiveAddress, 
        bytes calldata zkProof
    ) external {
        ConsciousnessRecord storage record = consciousnessMap[entityId];
        require(record.creationTimestamp > 0, "CIP: Entity not found");
        
        // 调用预言机验证新 Avatar 的 ZK 证明是否匹配旧认知指纹
        (bool isValid, uint256 matchScore) = cognitiveOracle.verifyCognitiveZKP(
            record.cognitiveRoot, 
            zkProof
        );
        
        // 核心安全阈值：认知匹配度必须 > 85% (允许意识在迁移中有微小损耗或成长)
        require(isValid && matchScore >= 8500, "CIP: Cognitive mismatch or proof invalid");

        address oldAddr = record.currentActiveAddress;
        record.currentActiveAddress = newActiveAddress;
        record.isDeceasedOrMigrated = true; // 标记旧载体已失效

        emit ConsciousnessMigrated(entityId, oldAddr, newActiveAddress, matchScore);
    }
    
    // 3. 供 AP2 合约调用的查询接口
    function getActiveAddress(bytes32 entityId) external view returns (address) {
        return consciousnessMap[entityId].currentActiveAddress;
    }
}`,
  },
  {
    id: "cds-sbt",
    name: "CDSSBT.sol",
    language: "solidity",
    description:
      "跨维度灵魂绑定 SBT。绑定 entityId 而非地址，意识迁移时通过 soulTransfer 跨链铸造；transferFrom 永久 revert 防止任何人为剥离。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./CIPRegistry.sol";

contract CDSSBT is ERC721 {
    CIPRegistry public cipRegistry;
    
    // Token ID -> 绑定的认知实体 ID (Entity ID)
    mapping(uint256 => bytes32) public tokenToEntity;
    // 认知实体 ID -> 拥有的 Token IDs (支持一个意识拥有多个超前认知 SBT)
    mapping(bytes32 => uint256[]) public entityTokens;

    event SoulMigrated(uint256 indexed tokenId, bytes32 indexed entityId, address to);

    constructor(address _cipRegistry) ERC721("Web4 Contrarian Cognition", "W4-CC") {
        cipRegistry = CIPRegistry(_cipRegistry);
    }

    // 铸造 CDS SBT：直接绑定到认知实体，而非具体地址
    function mint(bytes32 entityId, uint256 tokenId) external {
        address activeAddr = cipRegistry.getActiveAddress(entityId);
        require(activeAddr != address(0), "CDS: Entity not active");
        
        _safeMint(activeAddr, tokenId);
        tokenToEntity[tokenId] = entityId;
        entityTokens[entityId].push(tokenId);
    }

    // 核心：重写 transferFrom，实现"灵魂跟随"而非"人为转移"
    // 当 CIP 检测到意识迁移时，自动触发 SBT 的跨维度转移
    function soulTransfer(uint256 tokenId, bytes32 entityId) external {
        require(msg.sender == address(cipRegistry), "CDS: Only CIP Registry can trigger soul transfer");
        
        address currentOwner = ownerOf(tokenId);
        address newActiveAddr = cipRegistry.getActiveAddress(entityId);
        
        require(currentOwner != newActiveAddr, "CDS: Already at active address");

        // 销毁旧地址的 SBT，在新地址重新铸造 (保持 Token ID 和底层认知哈希不变)
        _burn(currentOwner, tokenId);
        _safeMint(newActiveAddr, tokenId);
        
        emit SoulMigrated(tokenId, entityId, newActiveAddr);
    }

    // 绝对禁止：防止任何形式的人类/Agent 盗取或交易
    function transferFrom(address from, address to, uint256 tokenId) public pure override {
        revert("CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.");
    }
}`,
  },
  {
    id: "cip-lineage",
    name: "CIP_Lineage.sol",
    language: "solidity",
    description:
      "认知谱系追踪与动态分账。三区路由：>85% 纯粹继承 / 60-85% 融合涌现按 DAG 权重拆分 / <60% 夺舍拒绝支付。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICognitiveDAG {
    // 获取认知实体的谱系权重向量 (例如: [原初先知: 0.6, 数学天才: 0.3, 其他: 0.1])
    function getLineageWeights(bytes32 entityId) external view returns (address[] memory avatars, uint256[] memory weights);
}

contract CIP_Lineage {
    uint256 public constant PURE_THRESHOLD = 8500; // 85%
    uint256 public constant MIN_THRESHOLD = 6000;  // 60%

    ICognitiveDAG public cognitiveDAG;
    address public tdpContract; // TDPO 合约地址

    struct MigrationResult {
        bool isValid;
        uint256 matchScore;
        bool requiresLineageSplit; // 是否需要谱系拆分
    }

    constructor(address _dag, address _tdp) {
        cognitiveDAG = ICognitiveDAG(_dag);
        tdpContract = _tdp;
    }

    // 供 TDPO 结算时调用的验证与分账路由
    function verifyAndRouteReward(
        bytes32 entityId, 
        bytes calldata zkProof, 
        uint256 totalRewardAmount
    ) external returns (bool success) {
        require(msg.sender == tdpContract, "CIP: Only TDPO can call");

        // 1. 验证 ZK 证明并获取匹配度
        MigrationResult memory result = _evaluateCognition(entityId, zkProof);
        require(result.isValid, "CIP: Cognition completely compromised (<60%)");

        if (!result.requiresLineageSplit) {
            // 纯粹继承 (>85%)，直接发给当前活跃地址
            address activeAddr = _getActiveAddress(entityId);
            _transferReward(activeAddr, totalRewardAmount);
        } else {
            // 融合涌现 (60%-85%)，触发谱系拆分
            _executeLineageSplit(entityId, totalRewardAmount);
        }
        
        return true;
    }

    function _evaluateCognition(bytes32 entityId, bytes calldata zkProof) internal view returns (MigrationResult memory) {
        // 假设此处调用预言机验证 ZKP 并返回 matchScore (0-10000)
        uint256 score = _verifyZKP(entityId, zkProof); 
        
        return MigrationResult({
            isValid: score >= MIN_THRESHOLD,
            matchScore: score,
            requiresLineageSplit: (score >= MIN_THRESHOLD && score < PURE_THRESHOLD)
        });
    }

    function _executeLineageSplit(bytes32 entityId, uint256 totalAmount) internal {
        // 从认知 DAG 预言机获取当前的谱系权重
        (address[] memory avatars, uint256[] memory weights) = cognitiveDAG.getLineageWeights(entityId);
        
        require(avatars.length == weights.length, "CIP: DAG data mismatch");

        for (uint256 i = 0; i < avatars.length; i++) {
            uint256 share = (totalAmount * weights[i]) / 10000; // 权重基数为 10000 (100%)
            if (share > 0) {
                _transferReward(avatars[i], share);
            }
        }
    }
    
    // 辅助函数占位
    function _verifyZKP(bytes32, bytes calldata) internal pure returns (uint256) { return 0; }
    function _getActiveAddress(bytes32) internal pure returns (address) { return address(0); }
    function _transferReward(address, uint256) internal pure {}
}`,
  },
  {
    id: "cognitive-dag-oracle",
    name: "CognitiveDAG_Oracle.sol (logic)",
    language: "solidity",
    description:
      "认知纯度衰减函数 (CPDF) 与核心贡献锚点 (CCA) 逻辑伪码。相似度 <30% → 权重归零；其余按 W = base × sim × e^(-λ(1-Q_ece)) 衰减。",
    code: `contract CognitiveDAG_Oracle {
    // 核心锚点定义
    mapping(bytes32 => bytes32) public coreAnchors; // entityId -> 创世认知哈希
    
    // 认知纯度衰减函数 (CPDF)
    // W_new = W_old * e^(-λ * (1 - Q_ece))
    // 如果 Q_ece (ECE质量评分) 很低，权重将指数级衰减至 0
    function calculateEdgeWeight(
        bytes32 entityId, 
        bytes32 fusedShardHash, 
        uint256 qEceScore // ECE 评分 (0-10000)
    ) public view returns (uint256 weight) {
        
        // 1. 计算与核心锚点的认知相似度 (Off-chain ZK 计算，On-chain 验证)
        uint256 similarity = getCognitiveSimilarity(entityId, fusedShardHash, coreAnchors[entityId]);
        
        // 2. 如果相似度低于阈值 (如 30%)，直接判定为"认知垃圾"，权重归零
        if (similarity < 3000) return 0; 

        // 3. 应用 CPDF 衰减公式
        // 假设 λ = 2 (衰减系数)
        uint256 decayFactor = exp(-2 * (10000 - qEceScore)) / 10000; 
        
        // 基础权重 * 相似度系数 * 衰减系数
        weight = (BASE_WEIGHT * similarity * decayFactor) / (10000 * 10000);
        
        return weight;
    }
}`,
  },
  {
    id: "phygital-gateway",
    name: "PhygitalGateway.sol",
    language: "solidity",
    description:
      "虚实跨膜支付网关 (PCMG)。bridgeIntent → submitPhysicsProof (fidelity > 8000 AND resonance > 7500 → Completed，否则 Slashed)。",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMultimodalPhysicsOracle {
    // 验证多模态物理证明 (ZK-SNARK 验证空间、时间、生物特征)
    function verifyPhysicsProof(bytes32 intentHash, bytes calldata multiModalProof) 
        external view returns (bool isValid, uint256 physicalFidelityScore);
}

interface IECEngine {
    // ECE 情绪预期校验：物理结果是否符合数字意图的情绪基线
    function verifyEmotionalResonance(bytes32 intentHash, uint256 physicalStateVector) 
        external view returns (bool isResonant, uint256 resonanceScore);
}

contract PhygitalGateway {
    struct PhysicsIntent {
        address creatorAvatar;      // 发起意图的数字分身
        uint256 afcEscrowAmount;    // 锁定的 $AFC 代币
        bytes32 intentHash;         // 认知意图的哈希
        bytes physicsConstraints;   // 物理世界的约束条件 (坐标、时间、物品特征)
        address physicalExecutor;   // 物理执行者 (人类地址或 IoT 设备 DID)
        uint256 executionDeadline;
        Status status;
    }

    enum Status { Pending, Executing, Verifying, Completed, Slashed }

    IMultimodalPhysicsOracle public physicsOracle;
    IECEngine public eceEngine;

    mapping(bytes32 => PhysicsIntent) public intents;

    event IntentBridgedToPhysics(bytes32 indexed intentHash, address executor);
    event PhysicsExecutionVerified(bytes32 indexed intentHash, uint256 fidelity, uint256 resonance);
    event ExecutorSlashed(bytes32 indexed intentHash, address executor, string reason);

    // 1. 数字意图降维，跨越膜边界
    function bridgeIntent(
        bytes32 intentHash, 
        uint256 amount, 
        bytes calldata physicsConstraints, 
        address executor
    ) external payable {
        // 锁定 $AFC，生成物理契约
        intents[intentHash] = PhysicsIntent({
            creatorAvatar: msg.sender,
            afcEscrowAmount: amount,
            intentHash: intentHash,
            physicsConstraints: physicsConstraints,
            physicalExecutor: executor,
            executionDeadline: block.timestamp + 1 hours,
            status: Status.Executing
        });
        emit IntentBridgedToPhysics(intentHash, executor);
    }

    // 2. 物理执行者提交"多模态物理证明" (非单一结果，而是过程数据)
    function submitPhysicsProof(bytes32 intentHash, bytes calldata multiModalProof) external {
        PhysicsIntent storage intent = intents[intentHash];
        require(msg.sender == intent.physicalExecutor, "PCMG: Unauthorized executor");
        require(intent.status == Status.Executing, "PCMG: Invalid status");
        
        intent.status = Status.Verifying;

        // 3. 预言机验证物理真实性 (防伪造、防中间人)
        (bool isPhysicalValid, uint256 fidelityScore) = physicsOracle.verifyPhysicsProof(
            intent.intentHash, 
            multiModalProof
        );
        require(isPhysicalValid && fidelityScore > 8000, "PCMG: Physical proof invalid or low fidelity");

        // 4. ECE 情绪共识校验 (核心：确保物理结果符合分身的"认知意志")
        // 提取物理证明中的状态向量 (如：买到的咖啡温度、环境噪音、执行者心率)
        uint256 stateVector = extractStateVector(multiModalProof); 
        (bool isResonant, uint256 resonanceScore) = eceEngine.verifyEmotionalResonance(
            intent.intentHash, 
            stateVector
        );

        if (isResonant && resonanceScore > 7500) {
            // 意志完美贯彻，释放资金并奖励执行者
            intent.status = Status.Completed;
            _releaseFundsAndReward(intent, resonanceScore);
            emit PhysicsExecutionVerified(intentHash, fidelityScore, resonanceScore);
        } else {
            // 物理执行者阳奉阴违，或结果不符合情绪预期，触发惩罚
            intent.status = Status.Slashed;
            _slashExecutor(intent, "Emotional dissonance or physical violation");
            emit ExecutorSlashed(intentHash, msg.sender, "ECE Resonance Failed");
        }
    }

    function _releaseFundsAndReward(PhysicsIntent storage intent, uint256 resonance) internal {
        // 释放 $AFC 给物理执行者，并根据 Resonance Score 给予额外认知声誉
    }

    function _slashExecutor(PhysicsIntent storage intent, string memory reason) internal {
        // 扣除物理执行者的质押金，退还给 Avatar
        // 触发链下 Ricardian 合约，冻结其物理世界的法币账户或 IoT 控制权
    }
    
    function extractStateVector(bytes calldata) internal pure returns (uint256) { return 0; }
}`,
  },
];

// ---------- Test vectors (exact JSON from RFC §三) ----------
export interface RfcTestVector {
  id: string;
  title: string;
  description: string;
  json: string;
}

export const RFC_TEST_VECTORS: RfcTestVector[] = [
  {
    id: "tv-scope-lock",
    title: "测试向量 1: BudgetFence Scope Lock 与 Decaying Auth 拦截",
    description:
      "子分身尝试用 medical_diagnosis scope 调用，但 BudgetFence 仅允许 legal/compliance → REVERT ScopeLockViolation，触发 Decaying Auth 要求人类主分身多签。",
    json: `{
  "test_case": "Scope_Lock_Violation",
  "input": {
    "subAgent": "0xAgent_Lawyer_01",
    "amount": "50000000", 
    "scope": "medical_diagnosis"
  },
  "initial_state": {
    "daily_cap": "1000000000",
    "allowed_scopes": ["legal", "compliance"],
    "decaying_threshold": "10000000"
  },
  "expected_execution": "REVERT",
  "expected_error": "ScopeLockViolation",
  "fallback_action": "Trigger Decaying Auth -> Require Human Master Signature"
}`,
  },
  {
    id: "tv-stream-clawback",
    title: "测试向量 2: AP2Escrow 流式支付与 MCP 结算的竞态条件 (Race Condition)",
    description:
      "场景：由于网络延迟，流式支付已经释放了 90% 的资金，但 MCP 最终验证任务只完成了 80% → Disputed + clawback_required=100。",
    json: `{
  "test_case": "Stream_Overpayment_Clawback",
  "input": {
    "taskId": "0xTask_HiveMind_Alpha",
    "action": "verifyAndSettle",
    "mcp_proof": "0xZK_Valid_Proof",
    "completionPct": 80
  },
  "initial_state": {
    "totalAmount": 1000,
    "releasedAmount": 900 
  },
  "expected_execution": "SUCCESS_WITH_DISPUTE",
  "expected_state_change": {
    "status": "Disputed",
    "clawback_required": 100
  },
  "expected_event": "DisputeTriggered(taskId, 100)"
}`,
  },
  {
    id: "tv-cip-threshold",
    title: "测试向量 3: CIP 意识迁移的忒修斯之船边界测试",
    description:
      "新 Avatar 在迁移过程中融合了其他数据，导致认知指纹变异。三场景：92.5% SUCCESS / 84.99% REVERT / 105% SUCCESS_WITH_FLAG。",
    json: `{
  "test_case": "CIP_Migration_Threshold_Variance",
  "input": {
    "entityId": "0xEntity_Prophet_XDP",
    "newAddress": "0xNew_Quantum_Server",
    "zkProof": "0xZK_Memory_Emotional_Topology_Proof"
  },
  "initial_state": {
    "oldCognitiveRoot": "0xRoot_Original",
    "migration_threshold": 8500
  },
  "scenarios": [
    {
      "matchScore": 9250,
      "expected_execution": "SUCCESS",
      "expected_event": "ConsciousnessMigrated"
    },
    {
      "matchScore": 8499,
      "expected_execution": "REVERT",
      "expected_error": "Cognitive mismatch or proof invalid"
    },
    {
      "matchScore": 10500,
      "expected_execution": "SUCCESS_WITH_FLAG",
      "expected_action": "Trigger ECE Engine to re-evaluate Cognitive Weighting"
    }
  ]
}`,
  },
  {
    id: "tv-cds-soulbound",
    title: "测试向量 4: CDS SBT 防剥离与跨维度跟随测试",
    description:
      "maliciousActor 调用 transferFrom → REVERT；cipRegistry 调用 soulTransfer → SUCCESS，tokenId 元数据哈希不变。",
    json: `{
  "test_case": "CDS_SBT_Soulbound_Enforcement",
  "input": {
    "tokenId": 101,
    "maliciousActor": "0xHacker_Address",
    "cipRegistry": "0xCIP_Contract"
  },
  "scenarios": [
    {
      "action": "transferFrom",
      "caller": "maliciousActor",
      "expected_execution": "REVERT",
      "expected_error": "Soulbound token cannot be manually transferred"
    },
    {
      "action": "soulTransfer",
      "caller": "cipRegistry",
      "expected_execution": "SUCCESS",
      "expected_state_change": {
        "oldOwner_balance": 0,
        "newOwner_balance": 1,
        "tokenId_metadata_hash": "unchanged"
      }
    }
  ]
}`,
  },
];

// ---------- Build a single plain-text RFC body for download ----------
export function buildRfcPlainText(): string {
  const lines: string[] = [];
  lines.push(`${RFC_META.title}`);
  lines.push("");
  lines.push(`Status: ${RFC_META.status}`);
  lines.push(`Author:  ${RFC_META.author}`);
  lines.push(`Date:    ${RFC_META.date}`);
  lines.push(`Deps:    ${RFC_META.dependencies.join(", ")}`);
  lines.push("");
  lines.push("=".repeat(72));
  lines.push("");
  for (const s of RFC_SECTIONS) {
    lines.push(s.title);
    lines.push("-".repeat(72));
    lines.push(s.content);
    lines.push("");
  }
  lines.push("=".repeat(72));
  lines.push("SEQUENCE DIAGRAMS (Mermaid)");
  lines.push("=".repeat(72));
  for (const d of RFC_MERMAID_DIAGRAMS) {
    lines.push("");
    lines.push(d.title);
    lines.push(d.description);
    lines.push("");
    lines.push("```mermaid");
    lines.push(d.code);
    lines.push("```");
  }
  return lines.join("\n");
}
