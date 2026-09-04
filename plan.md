# 谷布谷 重构计划 (plan.md)

> 本文件是全项目重构的执行蓝图。定位从「谷子买卖商城」转向
> **「谷子收藏关系网络」**：以标准图鉴为数据底座，以谷柜 / 愿望单构建收藏身份，
> 以匹配引擎寻找双向 / 多向**以物换物**关系，以收藏关系驱动人与人社交。
>
> 架构方向：**重后端 / 薄前端（Server-Driven, Backend-Heavy）**。后端是唯一可信的
> 业务逻辑来源；前端只负责渲染、交互与本地 UI 状态。

---

## 0. 北极星

```
我喜欢什么 → 我拥有什么 → 我想要什么
      → 谁拥有我想要的 → 谁想要我拥有的
      → 系统帮我们相遇、换谷、并建立关系
```

三大数据资产：**兴趣图谱**（user→likes→IP/角色）、**收藏图谱**
（user→owns/wants/trades→collectible）、**交换图谱**（user⇄user）。

判断任一功能是否该存在：它是帮用户「买更多」，还是帮用户「管理收藏、发现想要的谷、
找到合适的人、建立收藏关系」？优先后者。

---

## 1. 现状审计（Current Architecture）

**技术栈**：Next.js 16（App Router，RSC + Server Actions）· React 19 · TypeScript ·
Drizzle ORM · PostgreSQL · 自托管认证 · Tailwind v4 · zod · vitest · pnpm。

**架构现状（关键结论）**：本项目**已经是**重后端 / 薄前端结构——

- 页面是 React Server Components，取数在服务端（`server/data/*` 仓储层）完成。
- 变更走 Server Actions（`server/**/actions.ts`），入口即 zod 校验 + 鉴权 + 所有权校验。
- 客户端**从不直连数据库**（`server/db/client.ts` 标记 `server-only`）。
- 因此第二版提示词「把前端业务逻辑搬到后端」这一层的 gap **很小**——业务逻辑本就在后端。
  真正的 gap 是**产品方向**（匹配 / 换谷 / 社交）与**多端 API 暴露**。

**领域现状**：

- 图鉴：`ips` → `characters` → `series` → `goods`（= Collectible / SKU）。
- 收藏关系：`user_goods`（`owned` / `wanted` / `exchange`）；`owned` 表示已入谷柜，
  只有 `owned.lit_at IS NOT NULL` 才表示经扫描确认的已点亮收藏。
- 以物换物：`user_goods` 的 wanted / exchange 状态派生匹配，再创建带快照的 `exchanges`。
- 社区：`posts` / `post_images` / `ratings`；贡献：`catalog_submissions`；成就：`achievements`。
- 用户：`profiles`（handle / 展示名 / 可见性）；行级安全 RLS 已启用。
- 图像识别：`goods_image_embeddings` + Adapter（Mock / HF transformers）。

**历史增量（已下线运行时，见 §6）**：定价市场 schema 与迁移仅保留数据兼容；支付、订单、
定价挂单入口和 Mock Provider 已删除。品相快照、`official_type` 与 `verification_status` 继续服务图鉴与换谷。

**鉴权**：自托管（scrypt 口令 + HMAC 签名会话 cookie）；非生产环境另有演示三账号（collector/trader/reviewer）；admin 角色来自
env allowlist（`lib/admin-access.ts`）。

**数据流**：`RSC → server/data（仓储）→ drizzle → PG`；变更 `Server Action（zod+鉴权+所有权）→ 事务 → PG`。

---

## 2. 问题（Problems）与前端逻辑归类

**方向性问题**

1. **定位冲突**：定价买卖（orders/payments/fee）与新方向「一阶段仅以物换物、不做用户间
   人民币交易」（提示词 §8）冲突。→ **已删除运行时与入口**，schema 不破坏性删除（§43），
   换谷 + 匹配成为唯一交易协作模型。
2. **头号能力（已完成）**：双向 / 三方匹配、公开换谷帖、正式报价与三次反提共同组成换谷工作台。
3. **收藏关系模型（已完成）**：`user_goods` 已支持 `quantity` / `tradable_quantity` /
   愿望优先级（super-want）与 `lit_at`；收藏入柜和扫描点亮是两个独立状态。
4. **社交 / 圈子 / Feed / 关注 / 信用 / 通知**：缺失（P1）。
5. **多端 API**：目前只有 RSC + Server Actions（服务 Web）。未来 Android/iOS 需显式
   `/api/v1` HTTP JSON（统一 envelope），但领域层已干净，可低成本包一层 BFF。

**前端逻辑归类（A–G）**

- **A 必须迁后端**：（基本没有——业务逻辑已在后端）。
- **B 应迁后端**：无重大项。
- **C 可留前端**：表单预校验、收藏卡点亮态、筛选/排序 UI 状态。
- **D 纯 UI**：动画、tab、modal、滚动位置。
- **E 可删历史**：bootstrap 残留（早前已删）、空 `.site-atmosphere` 类。
- **F 重复**：SKU 页旧交换 composer 与人民币市场 composer 已删除；公开换谷帖统一进入 `/matches` 领域，不维护两套规则。
- **G 安全风险**：帖子与识别上传均校验 MIME/大小；写入口限流；换谷单按参与者授权读取。

**「用户改前端能否伪造业务结果」自检（§25）**：核心写路径均在 Server Action 服务端重算
（收藏数量、匹配、提案快照、履约状态与评价都由服务端校验），客户端改不了真实业务状态。
匹配分数与换谷合法性始终由服务端计算。

---

## 3. 目标架构（Target Architecture）

**保持 Modular Monolith**（不为微服务而微服务，§27/§44）：

```
Thin Clients: Web (now) · Android/iOS (future, Capacitor 封装同一 Web/API)
        │
   BFF 层: Next.js Server Actions (Web)  +  app/api/v1/* HTTP JSON (多端, 统一 envelope)
        │
   Application 层: server/**/actions.ts  (Intent → Result, 编排)
        │
   Domain 层:   lib/**（纯业务：matching / fees / condition / order-status / policy）
        │
   Repository:  server/data/**（Drizzle 查询, server-only）
        │
   PostgreSQL（+ 未来 Redis 缓存 / 队列做异步匹配、通知、图片）
```

**原则**：一套 Domain / Service，Web 用 Server Actions 调用，未来多端用 `/api/v1` 调用同一
Service——**One Backend, One Business Logic, Multiple Clients**。

**统一返回 envelope**（供未来 `/api/v1`）：`{ success, data, error, meta }`，错误含
`code / message / 用户可显示信息`，**绝不**外泄 stack / SQL / secret / 内部路径（§9/§54）。

**新增领域（按优先级）**：Matching（匹配）· Exchange（独立换谷单与状态机）·
Social（关注 / 圈子 / Feed）· Notification · Reputation · Safety/Policy。

---

## 4. 领域模型（目标）

| 实体                                               | 状态      | 说明                                                                               |
| -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| IP / Character / Series / Collectible(goods)       | ✅ 已有   | 图鉴底座；已加 `official_type` / `verification_status` / `manufacturer` / `region` |
| UserCollectible(user_goods)                        | ✅ 已完成 | 数量、可换数量、愿望优先级；`lit_at` 保存首次扫描点亮时间                          |
| ExchangeListing                                    | ✅ 已完成 | 无现金公开换谷帖；发布者选择仅收愿望单或开放看看其他谷                             |
| ExchangeOffer / Revision                           | ✅ 已完成 | 初始出价 + 最多 3 次不可变反提；接受后生成履约换谷单                               |
| **Match（派生）**                                  | ✅ 已完成 | 不落库，由匹配引擎计算；direct / reciprocal / 3-party                              |
| Exchange（换谷单 + 状态机）                        | ✅ 已完成 | PROPOSED→ACCEPTED→SHIPPED→COMPLETED + 快照 + 库存预留                              |
| Condition(S/A/B/C/D)                               | ✅ 已有   | 换谷品相作为 Exchange 服务端快照                                                   |
| Reputation / Follow / Circle / Feed / Notification | ✅ 已完成 | 轻社交、站内通知与举报；不扩展为重社交 Feed                                        |
| DirectConversation / DirectMessage                 | ✅ 已完成 | 一对一私信、已读、举报、拉黑；正式条款只以报价修订为准                             |
| listings/orders/payments/market_transactions       | 🅿️ 停用   | 定价市场，一阶段非主流程；不破坏性删除                                             |

---

## 5. 迁移顺序与 MVP 优先级

**P0（必须）**：认证 ✅ · 用户/Profile ✅ · IP/角色/系列/Collectible 图鉴 ✅ · 公共谷库 ✅ ·
收藏入柜 / 扫描点亮 ✅ · 想要/愿意交换 ✅ · 双向匹配 ✅ · 换谷帖 / 报价 / 状态机 ✅ · 通知 ✅ ·
后台基础 ✅ · 响应式 ✅ · Migration ✅ · 测试 ✅。

**P1（尽量）**：三方匹配 ✅ · 角色收藏圈 ✅ · 关注 ✅ · Feed ✅ · 举报 ✅ · 信用 ✅ ·
蹲谷 ✅ · 私信 / 拉黑 ✅。会员只保留 P2 接口，不实现产品能力。

**P2（仅架构预留）**：安心换 · 鉴定 · 高级物流 · Push · 高级订阅 · 品牌后台 · 复杂多边匹配 · AI 推荐。

---

## 6. 已完成增量（上一轮，需重定位）

定价市场曾作为实验增量实现。按新方向 §8，人民币挂单、订单、模拟支付及其 UI/服务端运行时
已经下线；历史 schema 与迁移不做破坏性删除，旧开放记录由兼容迁移统一关闭。`0018` 起只重新
启用**不含现金**的公开换谷帖，并由正式报价、最多三次反提、库存预留与履约状态机承接成交。

---

## 7. 本轮增量：匹配引擎 MVP（P0 头号能力）

在**现有 `user_goods` 数据**上构建，零 schema 迁移、零风险：

- `OFFER(u,g)` = `user_goods.status='exchange'`（愿意交换）；`WANT(u,g)` = `status='wanted'`。
- **双向匹配**：A 想要的里有 B 愿换的，且 B 想要的里有 A 愿换的 → 互惠换谷。
- **可解释 MatchScore(0–100)**：愿望匹配 / 交换平衡 / 互惠深度（地域、信用为后续预留，不虚构）。
- **三方循环 MVP**：A→B→C→A（A 想要 B 愿换的、B 想要 C 愿换的、C 想要 A 愿换的）。
- 纯函数打分与图算法（`lib/matching/*`，可单测）；服务端取数（`server/data/matching.ts`）；
  `/matches`（换谷）页薄客户端渲染；导航加「换谷」。
- 测试覆盖：A⇄B 直接匹配、A→B→C→A 三方循环、打分边界。

---

## 8. 验收标准

- **核心闭环（§49）**：注册 → 浏览公共谷库 → 收藏入柜（灰色）→ 相机扫描确认并点亮 → 标记可换 → 加愿望单 →
  匹配引擎发现对方 → 查看匹配原因 → 发起换谷 → 接受 → 沟通 → 确认 → 发货 → 完成 → 评价 → 信用变化。
- **§25 自检**：用户改前端也无法伪造服务端认定的业务状态。
- 每阶段跑 `typecheck / lint / test / build`，全绿方进入下一阶段。

---

## 9. 明确不做 / 暂缓

一阶段不做：用户钱包 / 余额 / 平台币 / 提现 / C2C 人民币订单 / 竞价 / 拍卖 / 投资 /
证券化（§8）；不为微服务而微服务；不滥用 WebSocket；不把业务逻辑塞前端；不留假完成的
Mock 冒充真实功能。Push、物流、鉴定、订阅和推荐只保留 Adapter；不保留支付、实名 Mock。

---

## 10. 本轮执行结果

P0 核心闭环与 P1 轻社交能力已落地：

- 收藏数量、可换数量、超想要 → 双向/三方匹配 → 双向换谷提案与服务端快照。
- 双方独立确认寄出和收货；取消边界、并发重复、跳步和终态修改由服务端状态机拦截。
- 发布者可选择「仅收愿望单」或「也看其他谷」；初始出价不计议价，整条双方协商链最多反提 3 次。
- 正式条款使用不可变报价修订保存，接受时原子重验并预留双方库存，避免同一件谷重复成交。
- 一对一私信支持上下文入口、未读、举报与拉黑；聊天内容不会暗改正式换谷条款。
- 完成后双方独立评价，公开主页聚合信誉摘要。
- 三方循环支持协调提案、参与者确认与取消，不扩展为复杂多边物流。
- 资料可见性、关注计数与列表、分页 Feed、角色收藏圈分页及关注入口。
- 帖子与换谷单举报，以及统一后台处理状态和处理通知。
- SKU 蹲谷订阅在新增可换供给时生成站内通知。
- `/api/v1` 提供认证后的收藏、匹配、换谷单和通知读取接口，统一 envelope。
- Push、物流、鉴定、会员、推荐只保留接口与禁用配置说明，不连接外部服务。
- `0011`–`0021` 连续迁移、幂等三账号种子、点亮不变式与 RLS 验证脚本已补齐。
- 全局入口收拢为谷库、点亮、换谷、我的；关注网络、协调提案和安全队列合并到对应中心页。
- 旧人民币市场、独立订单及重复入口的运行时代码已删除；公开换谷帖是 `/matches` 下的正式核心能力。

本机缺少可连接的 PostgreSQL 服务时，应用继续使用既有空数据降级；迁移、种子与
`pnpm db:verify-rls` 必须在配置 `DATABASE_URL` 且数据库服务可用的环境执行。此降级不以
Mock 数据冒充真实数据库结果。

---

## 11. 公共谷库与扫描点亮（已完成）

- `/search` 是统一公共谷库，所有已发布 SKU 都可浏览；不为相同数据维护第二套路由。
- 未点亮 SKU 的公共缩略图统一灰阶显示，悬停不会恢复彩色；SKU 详情页始终展示完整高清彩图。
- 「收进谷柜」只创建未点亮的 `owned` 关系，不增加完成度、成就、收藏圈或换谷资格。
- 每次识别由服务端创建 15 分钟有效的 `recognition_attempts`；确认只接收
  `requestId + candidateId`，服务端锁行并解析可信 SKU，客户端不能提交 `goodsId` 伪造点亮。
- 只有真实 `camera + embedding-search` 候选可以点亮；上传图片和 Mock 结果只能查看彩色详情。
- 完成度、成就、角色收藏圈、匹配、发布换谷和报价库存统一要求 `owned.lit_at IS NOT NULL`。
- 收到换谷物只自动入柜，仍需扫描实物后点亮；首次点亮时间保留，重复/并发确认幂等。
- Web 无法证明画面一定来自实物或具备活体性；V1 保证的是不可绕过服务端真实识别流程，
  不承诺防翻拍或鉴定真伪。

---

## 12. SKU 分享谷卡（已完成）

- SKU 标题区提供公开「分享谷卡」入口，不要求登录，也不与收藏/点亮状态混在一起。
- 服务端按公开 SKU 数据生成固定 1080 × 1440 PNG：完整商品图、IP/系列、名称、类型、角色与 SKU 编号；不写入用户昵称或收藏隐私。
- 弹窗复用同一个预生成 `File` 做预览、下载和系统分享，未打开弹窗时不加载大图。
- 支持系统文件分享、高清 PNG 下载与 canonical 链接复制；不支持文件分享时降级为链接分享或下载。
- 普通 Web 无法指定或静默发布到微信、抖音；页面只承诺唤起操作系统分享目标，平台未出现时提示先下载图片再发布。
- 分享路由只允许可信同源静态图，拒绝任意远程 URL 的服务端抓取；slug 有长度/格式边界。
- 分享 PNG 使用 5 分钟 ISR/HTTP 缓存；SKU metadata 使用真实标题、描述、canonical 与分享卡 Open Graph 图片。
- 生产必须配置 server-only 的公开 HTTPS `APP_URL` 纯 origin；本地开发未配置时回退到 loopback。
