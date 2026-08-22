# Architecture

谷布谷采用单仓库模块化单体。SKU 是收藏、社区、识别、匹配、换谷、评价和通知的共同核心实体。

## 请求边界

```text
Server Component / HTTP API
        ↓
server/data（读取）或 Server Action（写入）
        ↓
lib（纯领域规则）
        ↓
Drizzle / PostgreSQL
```

- 页面默认使用 Server Component；仅表单状态、相机和浏览器 API 使用 Client Component。
- 页面读取只能进入 `server/data`，写入只能进入 Server Action 或明确的 Route Handler。
- 所有外部输入使用 Zod；站内回跳统一使用 `lib/internal-path.ts`。
- Server Action 顺序为：输入验证 → 会话/权限 → 领域校验 → 事务写入 → 通知 → 缓存刷新。
- `/api/v1` 只提供认证后的读取能力，使用统一 `{ success, data, error, meta }` envelope。

## 目录职责

- `app/`：路由、元数据、页面边界、loading/error/not-found。
- `components/`：具有明确产品语义的界面组件和少量 UI primitive。
- `lib/`：纯函数、Zod schema、状态机、展示映射和 P2 接口。
- `server/auth/`：Supabase 会话、本地 PostgreSQL 密码账号、签名 Cookie 与管理员角色。
- `server/data/`：批量、分页、仅服务端的数据读取。
- `server/*/actions.ts`：服务端写入与权限校验。
- `drizzle/schema/`：唯一 schema 来源；所有变化必须有 migration。
- `drizzle/seed/`：可重复执行的三账号验收数据。

## 权限层级

- 公开：图鉴、搜索、公开资料、公开社区内容。
- 登录：收藏、识别、匹配、换谷帖/报价/履约、私信、通知、关注、Feed、举报。
- 管理员/审核员：`/admin` 下的内容维护和安全队列。

隐藏入口不是授权。所有受限页面、Action 与 API 都必须在服务端再次校验。资料可见性由 `public / followers / private` 统一决定；private 只允许本人读取。

## 收藏点亮不变式

- `user_goods.status = 'owned'` 只表示 SKU 已进入用户谷柜；`lit_at IS NULL` 是未点亮收藏，只有 `owned + lit_at IS NOT NULL` 才表示已由实物识别确认。
- `recognition_attempts` 保存识别请求所属用户、真实候选 SKU 映射、来源、提供方、有效期和确认结果。确认接口只接受 `requestId + candidateId`，SKU 必须由服务端从该记录解析，不能信任浏览器提交的 SKU。
- 只有未过期的相机 `embedding-search` 结果可以在事务中写入 `lit_at`；mock、普通上传、伪造查询参数和重复确认都不能点亮。
- 完成度、成就、角色收藏圈、拥有数量以及换谷资格统一只统计已点亮 owned；单独存在 owned 或 exchange 行不构成实物拥有证明。
- 换谷匹配、发布、报价和最终库存预留都要求出让方同一 SKU 存在已点亮 owned；接受报价时的事务锁与复验是最终权威。换谷收货新增的 owned 默认未点亮，仍需扫描实物。
- SKU 详情页始终展示完整彩色高清图；公共图鉴缩略图按当前 viewer 的点亮状态渲染，当前用户已点亮时为彩色，否则（包括匿名访问）保持灰色。

## 换谷不变式

- 换谷帖只允许无现金以物换物；发布者明确选择「仅收愿望单」或「也看其他谷」。
- 匹配可直接生成报价，也可对公开换谷帖出价；所有 SKU 和可换数量都由服务端重验。
- 初始出价不计议价，整条双方协商链最多 3 次反提；不可变 revision 冻结双方 SKU、数量、品相、履约方式和说明。
- 接受报价必须在单一事务中锁定双方库存、重验发布策略并创建换谷单；同一库存不能并发重复成交。
- 双方独立确认寄出和收货；数据库条件更新阻止并发重复确认。
- 寄出后不可取消，完成/取消终态不可修改。
- 取消仅恢复一次预留库存；完成会扣除出让方 owned/exchange、增加收到方 owned 并满足 wanted。
- 完成后每位参与者最多提交一次评价；信誉由服务端聚合。
- 三方循环仅包含协调与确认，不包含复杂物流。

## 私信不变式

- 每对用户只有一个规范化会话，读取、发送、已读、举报和拉黑都在 SQL 中重复校验参与者身份。
- 新建普通私信遵守 `public / followers / private`；交易上下文入口只允许对应帖、报价或换谷单参与者。
- 拉黑与发信/出价使用同一用户对事务锁，拉黑提交后不能再漏入消息或报价。
- 收件箱不展示未发送过消息的空会话；通知不复制私信正文。
- 聊天只用于沟通，正式成交条款只认不可变报价修订，避免口头信息覆盖换谷快照。

## 分享边界

- `/goods/[goodsSlug]/share` 只读取公开 SKU，使用 `ImageResponse` 生成 1080 × 1440 PNG；不包含用户身份、收藏状态或私密资料。
- 商品图服务端抓取只允许同源静态样例路径和配置一致的 Supabase public Storage origin/path；任意外部 URL 使用占位图，避免 SSRF。
- 分享弹窗打开后才生成并缓存浏览器 `File`，同一文件用于预览、下载和 Web Share，避免未使用时下载及重复制图。
- 系统文件分享依赖 HTTPS、用户手势与 `navigator.canShare({ files })`；普通 Web 无法选择或确认微信、抖音等目标应用是否完成发布。
- PNG 路由按 SKU 缓存 5 分钟。生产 server-only `APP_URL` 是 canonical 和 Open Graph 的权威公开 origin，必须是无路径、查询参数或片段的 HTTPS origin；本地开发未配置时回退到 loopback。

## 性能边界

- 匹配只加载当前用户的两跳交易邻域，不扫描整张收藏关系图。
- 识别先读取可用图像向量，再在服务端去重为 SKU 候选；角色水合只查询候选 SKU。
- CLIP 模型在长驻进程缓存；生产可用 `RECOGNITION_WARMUP=1` 启动预热。
- 内存限流只适用于单实例 V1；多实例部署时再实现已有 Adapter，而不是提前接入外部服务。

## P2 边界

`lib/integrations/contracts.ts` 只保留 Push、物流、鉴定、订阅和推荐的接口。V1 不实例化任何提供商，不实现支付、钱包、托管、仲裁或原生端。
