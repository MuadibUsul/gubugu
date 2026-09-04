import 'server-only';

import { z } from 'zod';

import type { ParsedCatalogProduct } from '@/lib/catalog-crawler/parser';

// 面向中文用户：把抓取到的（多为日文）商品清洗并拆分成结构化的简体中文字段。
// 这是「代码做基本清洗+拆分 → LLM 进一步校对+拆分」流水线里的 LLM 环节，
// 尽力而为：缺 key 或调用失败都不抛错，调用方回退到代码基线草稿并标注状态。
//
// 走 OpenAI 兼容的 Chat Completions 接口（默认 DeepSeek），原生 fetch、无 SDK。
// 可用 DEEPSEEK_BASE_URL 换成任何兼容服务。

const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const REQUEST_TIMEOUT_MS = 20_000;

export const enrichmentSchema = z.object({
  /** 商品名（简体中文，去店铺名/营销语，保留版本弹数）。 */
  name: z.string().trim().min(1).max(255),
  /** 作品 / IP 名（官方简体中文译名）；拿不准为 null。 */
  ipName: z.string().trim().max(255).nullable().catch(null),
  /** 系列 / 系列弹名；没有为 null。 */
  seriesName: z.string().trim().max(255).nullable().catch(null),
  /** 涉及角色（官方简体中文译名）。 */
  characterNames: z.array(z.string().trim().min(1).max(120)).max(30).catch([]),
  /** 品类线索（如「徽章」「亚克力立牌」），供类型识别。 */
  goodsType: z.string().trim().max(64).nullable().catch(null),
  /** 简介（简体中文）；没有为 null。 */
  description: z.string().trim().max(4000).nullable().catch(null),
});

export type CatalogEnrichment = z.infer<typeof enrichmentSchema>;

export type EnrichmentResult =
  | { status: 'enriched'; model: string; data: CatalogEnrichment }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

const SYSTEM_PROMPT = `你是二次元谷子（周边）图鉴的编目助手。会给你一条从日文商店抓取的商品数据。请清洗并结构化，全部输出**简体中文**：
- name：商品名（去掉店铺名与「が登場」这类营销语，保留版本/弹数如「第3弹」）
- ipName：作品/IP 名，用**官方简体中文译名**（例：コードギアス 反逆のルルーシュ → 反叛的鲁路修）；拿不准填 null
- seriesName：该商品所属系列/系列弹；没有填 null
- characterNames：涉及角色的官方简体中文译名，数组；没有填 []
- goodsType：品类线索（如「徽章」「亚克力立牌」「挂画」）
- description：简介；没有填 null
专有名词优先官方简体中文译名，音译要前后一致。**只输出一个 JSON 对象**，不要解释、不要代码块围栏。`;

/** 代码侧的基本拆分：从「『IP』其余」里粗抽 IP，给 LLM 一个起点。 */
export function roughSplit(name: string): {
  ipGuess: string | null;
  remainder: string;
} {
  const match = name.match(/^\s*[『「\[【]([^』」\]】]+)[』」\]】]\s*(.*)$/u);
  if (match) {
    return { ipGuess: match[1].trim(), remainder: match[2].trim() };
  }
  return { ipGuess: null, remainder: name.trim() };
}

/** 从模型回复文本里解析出校验通过的结构化结果；解析/校验失败返回 null。 */
export function parseEnrichmentText(text: string): CatalogEnrichment | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  const parsed = enrichmentSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function buildSourcePrompt(product: ParsedCatalogProduct): string {
  const { ipGuess, remainder } = roughSplit(product.name);
  return JSON.stringify({
    原名: product.name,
    代码粗拆_IP线索: ipGuess,
    代码粗拆_其余: remainder,
    原描述: product.description,
    品类线索: product.goodsType,
  });
}

const chatCompletionSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string() }) }))
    .min(1),
});

/**
 * 尽力而为的 LLM 校对/拆分（默认 DeepSeek，OpenAI 兼容）。缺 `DEEPSEEK_API_KEY`
 * → skipped；调用/超时/解析失败 → failed（都不抛错）。模型用 `CATALOG_TRANSLATE_MODEL`
 * 覆盖（默认 `deepseek-chat`），服务地址用 `DEEPSEEK_BASE_URL` 覆盖。
 */
export async function enrichCatalogProduct(
  product: ParsedCatalogProduct,
): Promise<EnrichmentResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { status: 'skipped', reason: '未配置 DEEPSEEK_API_KEY' };
  }

  const model = process.env.CATALOG_TRANSLATE_MODEL ?? DEFAULT_MODEL;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    '',
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildSourcePrompt(product) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: 'failed',
        reason: `LLM 接口返回 HTTP ${response.status}`,
      };
    }

    const body = chatCompletionSchema.safeParse(await response.json());
    if (!body.success) {
      return { status: 'failed', reason: 'LLM 响应结构异常' };
    }

    const data = parseEnrichmentText(body.data.choices[0].message.content);
    if (!data) {
      return { status: 'failed', reason: 'LLM 返回内容无法解析为规定结构' };
    }

    return { status: 'enriched', model, data };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? 'LLM 调用超时'
        : error instanceof Error
          ? error.message.slice(0, 200)
          : 'LLM 调用失败';
    return { status: 'failed', reason };
  } finally {
    clearTimeout(timeout);
  }
}
