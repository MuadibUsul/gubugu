import { describe, expect, it } from 'vitest';

import { wrapTitle, type TextMeasurer } from './render-card';

// 卡面宽 1080、左右各留 70，所以可用宽度是 940。这里用「每个字符固定 20px」的假
// 量测，于是一行正好放 47 个字符——折行边界因此是确定的，不依赖运行环境的字体。
const CHAR_WIDTH = 20;
const CHARS_PER_LINE = 47;

const measure: TextMeasurer = async (text) => ({
  width: text.length * CHAR_WIDTH,
  height: 40,
});

function repeat(length: number) {
  return '谷'.repeat(length);
}

describe('wrapTitle', () => {
  it('keeps a title that fits on one line', async () => {
    const title = repeat(10);

    await expect(wrapTitle(title, 58, measure)).resolves.toEqual([title]);
  });

  it('keeps a title that exactly fills the line intact', async () => {
    const title = repeat(CHARS_PER_LINE);

    await expect(wrapTitle(title, 58, measure)).resolves.toEqual([title]);
  });

  it('breaks a longer title onto a second line without losing characters', async () => {
    const title = repeat(CHARS_PER_LINE + 10);
    const lines = await wrapTitle(title, 58, measure);

    expect(lines).toHaveLength(2);
    expect(lines.join('')).toBe(title);
    expect(lines[0]).toHaveLength(CHARS_PER_LINE);
  });

  // 超过两行的部分不能直接截断丢弃——要留下省略号，读者才知道名字还没完。
  it('ellipsizes what does not fit in the last line', async () => {
    const title = repeat(CHARS_PER_LINE * 3);
    const lines = await wrapTitle(title, 58, measure);

    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines[1].length).toBeLessThanOrEqual(CHARS_PER_LINE);
  });

  it('returns nothing for an empty title instead of looping', async () => {
    await expect(wrapTitle('', 58, measure)).resolves.toEqual([]);
  });

  // 单个字符就超宽时二分会收敛到 fit=1，必须仍然前进，否则外层循环空转。
  it('makes progress even when a single character overflows', async () => {
    const wide: TextMeasurer = async (text) => ({
      width: text.length * 5000,
      height: 40,
    });
    const lines = await wrapTitle(repeat(4), 58, wide);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('谷');
  });
});
