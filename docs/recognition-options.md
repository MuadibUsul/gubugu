# 识别功能选型

`server/recognition/service.ts` 当前调用 `buildMockRecognitionCandidates`，结果与图片内容无关。本文整理可用的免费开源方案，供决策使用。**尚未实施任何一项。**

## 边界

`AGENTS.md` 第 8 节限定：只做候选匹配，不做自训练模型、不做标注流水线、不承诺精确自动识别。因此只考虑「用预训练模型抽向量 + 向量近邻检索」这一类方案，不考虑训练。

## 现有资产与障碍

0004 迁移已经建好 `goods_image_embeddings` 表，字段设计（provider / model / model_version / dimensions / source_checksum / status / last_error）说明当初就是按「外部模型抽向量」来设计的，方向正确。

**但有一个必须先解决的问题：`embedding_payload` 是 `jsonb`。**

jsonb 上建不了 ANN 索引（ivfflat / hnsw 都只支持 `vector` 类型）。维持 jsonb 就只能全表扫描 + 应用层算余弦相似度。

两条路：

- **SKU 量在数千以内**：保留 jsonb，在应用层暴力计算。512 维 × 数千行，单次查询几十毫秒量级，完全够用，且零额外依赖。
- **要上规模**：加一个迁移，启用 `vector` 扩展，把列改成 `vector(512)` 并建 HNSW 索引。Supabase 免费档就支持 pgvector，不额外收费。

建议先走第一条，等 SKU 量真的起来再迁移。过早引入 pgvector 只是增加运维面。

## 方案 A：Transformers.js + CLIP（推荐）

在 Node 里直接跑 CLIP，不需要 Python，不需要额外服务。

- 包：`@huggingface/transformers`（v3，HF 官方维护）。旧的 `@xenova/transformers` v2 仍广泛使用但已是遗留版本。
- 模型：`Xenova/clip-vit-base-patch32`（512 维），或 `Xenova/mobileclip_blt` —— 后者更小更快，更适合这个场景。
- 机制：模型转成 ONNX，用 `CLIPVisionModelWithProjection` + `AutoProcessor` 抽图像向量。
- 成本：全免费，模型权重本地加载，无 API 调用。

**要注意的坑：**

- 模型权重几十到上百 MB，冷启动慢。**不适合放在 Vercel 的 serverless function 里** —— 每次冷启动都要加载模型。需要常驻 Node 进程，或者把抽向量做成离线批处理（后台给库存图建索引），只有用户上传的那一张在请求路径上算。
- 后者是更合理的架构：SKU 图库的向量离线建好写进 `goods_image_embeddings`，请求时只对用户拍的这一张抽向量再检索。这也正好对应表里 `status: pending/ready/failed` 的设计。

## 方案 B：Supabase 官方 CLIP 示例

Supabase 文档有现成的 Image Search with OpenAI CLIP 指南，用 `sentence-transformers` 的 `clip-ViT-B-32` 配 `vecs` 客户端。

架构清晰、和现有 Supabase 栈契合，**但它是 Python 的**。采用就意味着要多维护一个 Python 服务，与 `AGENTS.md`「长期单人维护」的约束冲突。除非愿意接受这个成本，否则不建议。

## 方案 C：pgvector + 任意来源的向量

pgvector 只负责存储和检索，不关心向量怎么来。免费档可用，HNSW 索引（`vector_cosine_ops`）适合本场景。

这不是独立方案，是方案 A 的存储层升级选项。

## 建议路径

1. 先用方案 A 抽向量，存进现有的 jsonb 列，应用层算余弦。
2. 把 SKU 图库的向量做成离线批处理脚本（类似现有 `pnpm db:seed` 的形态），避免模型加载进请求路径。
3. 只有用户上传的单张图在请求路径上抽向量。
4. 等 SKU 规模真的需要了，再迁到 `vector(512)` + HNSW。

**在实施之前，界面上应当明确标注识别结果为实验功能。** 当前 UI 把 mock 结果当作真实候选呈现，这是会误导用户的。
