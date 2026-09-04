/**
 * 识别阈值的离线校准工具。
 *
 * 阈值不该靠手感定。这个脚本拿一批已知答案的实拍照片跑完整检索链路，然后在一段
 * 阈值区间上扫描，报出每个取值下的误点亮率与漏识别率，供人按
 * 「**误点亮率优先低于漏识别率**」的原则挑值——漏掉一次，用户再拍一张就是了；
 * 错误的自动点亮会把不属于用户的 SKU 写成公开拥有，且用户未必会发现。
 *
 * 样本目录约定（子目录名即该批照片的正确 SKU slug）：
 *
 *   samples/
 *     rio-kisaragi-backstage-pass-holder/
 *       01.jpg
 *       02.jpg
 *     sora-amane-backstage-pass-oversized-tapestry/
 *       01.jpg
 *
 * 用法：
 *   DATABASE_URL=... pnpm tsx scripts/evaluate-recognition.ts ./samples
 *
 * 需要目标库已跑过 `pnpm db:embed`，否则没有可检索的向量。
 */

import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';

for (const path of ['.env.local', '.env']) {
  loadEnv({ path, override: false, quiet: true });
}

type Sample = { expectedSlug: string; file: string };
type Outcome = {
  sample: Sample;
  topSlug: string | null;
  topScore: number | null;
  /** 正确 SKU 在候选列表中的名次，未出现则为 null。 */
  correctRank: number | null;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp)$/i;

async function collectSamples(root: string): Promise<Sample[]> {
  const samples: Sample[] = [];

  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = join(root, entry.name);
    for (const file of await readdir(dir)) {
      if (!IMAGE_PATTERN.test(file)) continue;
      samples.push({ expectedSlug: entry.name, file: join(dir, file) });
    }
  }

  return samples;
}

/**
 * 在给定阈值下统计四类结果。分档逻辑与线上共用 gradeRecognitionScore，避免评估
 * 用一套规则、线上跑另一套。
 */
function summarise(
  outcomes: Outcome[],
  thresholds: { autoLight: number; candidate: number },
  grade: (
    score: number | null | undefined,
    thresholds: { autoLight: number; candidate: number },
  ) => string,
) {
  let autoCorrect = 0;
  let autoWrong = 0;
  let candidateHit = 0;
  let candidateMiss = 0;
  let unidentified = 0;

  for (const outcome of outcomes) {
    const tier = grade(outcome.topScore, thresholds);

    if (tier === 'auto-light') {
      if (outcome.topSlug === outcome.sample.expectedSlug) autoCorrect += 1;
      else autoWrong += 1;
    } else if (tier === 'candidates') {
      if (outcome.correctRank !== null) candidateHit += 1;
      else candidateMiss += 1;
    } else {
      unidentified += 1;
    }
  }

  const autoTotal = autoCorrect + autoWrong;

  return {
    autoCorrect,
    autoWrong,
    candidateHit,
    candidateMiss,
    unidentified,
    /** 自动点亮里点错的比例——这是最该压低的数字。 */
    falseLightRate: autoTotal === 0 ? 0 : autoWrong / autoTotal,
    /** 正确答案既没自动点亮、也没进候选的比例。 */
    missRate:
      outcomes.length === 0
        ? 0
        : (candidateMiss + unidentified) / outcomes.length,
  };
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const root = resolve(process.argv[2] ?? 'samples');

  try {
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`样本目录不存在：${root}`);
    console.error(
      '目录结构见本文件顶部注释：每个子目录名是该批照片的正确 slug。',
    );
    process.exit(1);
  }

  const samples = await collectSamples(root);
  if (samples.length === 0) {
    console.error(`${root} 下没有找到样本图片。`);
    process.exit(1);
  }

  // 动态引入：这些模块会连数据库、加载 CLIP，放在顶层会让参数错误也要等模型加载。
  const [
    { embedImage },
    { findRecognitionCandidates },
    { gradeRecognitionScore },
  ] = await Promise.all([
    import('../server/recognition/embedding'),
    import('../server/data/recognition-search'),
    import('../lib/recognition'),
  ]);

  console.log(`样本 ${samples.length} 张，来自 ${root}\n`);

  const outcomes: Outcome[] = [];

  for (const [index, sample] of samples.entries()) {
    process.stdout.write(`\r检索中 ${index + 1}/${samples.length}`);

    try {
      const vector = await embedImage(sample.file);
      const candidates = await findRecognitionCandidates(vector);
      const correctIndex = candidates.findIndex(
        (candidate) => candidate.goods.slug === sample.expectedSlug,
      );

      outcomes.push({
        sample,
        topSlug: candidates[0]?.goods.slug ?? null,
        topScore: candidates[0]?.score ?? null,
        correctRank: correctIndex >= 0 ? correctIndex + 1 : null,
      });
    } catch (error) {
      console.error(`\n  ${sample.file} 检索失败：`, error);
    }
  }

  process.stdout.write('\r'.padEnd(40) + '\r');

  const candidateFloor = 0.58;
  const sweep = [0.7, 0.75, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.95];

  console.log(`候选门槛固定为 ${candidateFloor}，扫描自动点亮阈值：\n`);
  console.log(
    '  阈值   自动点亮(对/错)  误点亮率   进候选(命中/未中)  未鉴定  漏识别率',
  );
  console.log('  ' + '─'.repeat(72));

  for (const autoLight of sweep) {
    const s = summarise(
      outcomes,
      { autoLight, candidate: candidateFloor },
      (score, thresholds) => gradeRecognitionScore(score, thresholds),
    );

    console.log(
      `  ${autoLight.toFixed(2)}   ` +
        `${String(s.autoCorrect).padStart(4)}/${String(s.autoWrong).padEnd(4)}      ` +
        `${percent(s.falseLightRate).padStart(6)}     ` +
        `${String(s.candidateHit).padStart(4)}/${String(s.candidateMiss).padEnd(5)}     ` +
        `${String(s.unidentified).padStart(4)}   ` +
        `${percent(s.missRate).padStart(6)}`,
    );
  }

  const never = outcomes.filter((outcome) => outcome.correctRank === null);
  if (never.length > 0) {
    console.log(
      `\n以下 ${never.length} 张的正确 SKU 从未进入候选（与阈值无关，属于检索或` +
        `索引问题）：`,
    );
    for (const outcome of never.slice(0, 10)) {
      console.log(
        `  ${outcome.sample.file}  期望 ${outcome.sample.expectedSlug}` +
          `  实际最高分 ${outcome.topScore?.toFixed(4) ?? '无候选'}` +
          ` (${outcome.topSlug ?? '—'})`,
      );
    }
  }

  console.log(
    '\n选阈值时先看「误点亮率」这一列，再在可接受范围内挑漏识别率最低的取值。',
  );
  console.log(
    '定下后写入环境变量 RECOGNITION_AUTO_LIGHT_THRESHOLD / RECOGNITION_CANDIDATE_THRESHOLD。',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
