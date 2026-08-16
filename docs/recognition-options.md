# 识别功能

## 现状

已实现基于 CLIP 图像向量的候选匹配，替换了原来与图片内容无关的 mock。

符合 `AGENTS.md` 第 8 节的边界：只用预训练模型抽向量做候选匹配，不训练模型、不做标注流水线、不承诺精确识别。

### 组成

| 模块                                | 职责                               |
| ----------------------------------- | ---------------------------------- |
| `server/recognition/embedding.ts`   | 加载 CLIP，把图片转成向量          |
| `lib/vector-similarity.ts`          | 余弦相似度与排序（纯函数，有测试） |
| `server/data/recognition-search.ts` | 读取图鉴向量并排序出候选           |
| `drizzle/embed/index.ts`            | 离线批处理，给图鉴图片建索引       |
| `server/recognition/service.ts`     | 串联上述部分，并在无索引时降级     |

模型为 `Xenova/clip-vit-base-patch32`，通过 `@huggingface/transformers` 在 Node 进程内以 ONNX 推理，无 Python、无外部服务、无 API 调用。

### 实测数据

在开发机上测得：

- **模型冷加载约 142 秒**（含首次下载），之后由进程内单例复用
- 单张图片抽向量 **60–90ms**
- 输出 **512 维**，与 `goods_image_embeddings.dimensions` 一致
- 同一张图经文件路径与 Blob 两条输入路径，向量余弦相似度为 `1.000000`
- 两张不同样例图相似度约 `0.75`

**这两个数字决定了架构。** 142 秒的冷加载意味着模型必须活在常驻进程里；60ms 的热态推理意味着请求路径上处理单张图完全够用。所以图鉴图片由离线任务预先建索引，请求时只对用户上传的那一张抽向量。

## 建立索引

```bash
pnpm db:embed
```

- 幂等：已有 `ready` 且校验和未变的图片会跳过，重跑只处理新增或变更的图片
- `pnpm db:embed --force` 强制重建全部
- 失败的图片会写入 `status: 'failed'` 与 `last_error`，不会静默从检索中消失
- 需要 `DATABASE_URL`；同源相对路径的图片会按 `NEXT_PUBLIC_APP_URL` 解析，因此本地跑之前应用要在运行

### 网络要求

首次运行需要访问 `huggingface.co` 下载模型权重。若环境通过代理出网，Node 的 fetch 默认不读代理环境变量，需要显式开启：

```bash
NODE_USE_ENV_PROXY=1 pnpm db:embed
```

模型下载后会缓存在本地，后续运行不再需要网络。

## 无索引时的行为

图鉴还没建索引、或数据库不可达时，`recognizeGoodsImage` 会降级到占位候选，并且**明确标注**：

- 警告文案说明结果与图片内容无关，并提示运行 `pnpm db:embed`
- 界面上方的来源标签显示「占位结果 · 非真实识别」，而不是伪装成真实匹配
- 响应里 `pipeline.provider` 为 `mock-placeholder`，`embeddingVersion` 为 `null`

真实匹配时来源标签为「图像特征匹配」，`embeddingVersion` 带上 provider 与模型名。

## 部署注意

部署方案为自建服务器上的常驻 Node 进程，模型直接活在主应用里，142 秒的加载只在服务启动时付一次。

**不能改用 serverless。** 那种形态下每次冷启动都要重新加载模型。

建议在服务启动后主动调用 `warmEmbeddingPipeline()` 预热，否则第一个真实请求会等满整个加载时间。进程重启后模型需要重新加载 —— 权重有本地缓存，不必重新下载，但仍需重新载入内存。

## 未来：迁移到 pgvector

`embedding_payload` 目前是 `jsonb`，jsonb 上建不了 ANN 索引，因此排序在应用层做，每次检索会加载全部 `ready` 向量。

在当前图鉴规模下这是有意为之的取舍。当 SKU 数量增长到全量加载不可接受时，迁移路径是：

1. 启用 `vector` 扩展
2. 把 `embedding_payload` 改成 `vector(512)`
3. 建 HNSW 索引（`vector_cosine_ops`）
4. 把 `findRecognitionCandidates` 的排序改为数据库内 ORDER BY

Supabase 免费档即支持 pgvector，不额外收费。

## 已评估但未采用

Supabase 官方的 Image Search with OpenAI CLIP 指南使用 `sentence-transformers` 与 `vecs`，架构清晰且贴合 Supabase 栈，但**是 Python 的**。采用意味着多维护一个服务，与 `AGENTS.md` 中「长期单人维护」的约束冲突。
