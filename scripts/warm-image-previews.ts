import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { IMAGE_WIDTHS } from '../lib/image-variants';
import { warmImagePreviews } from '../server/image-variants';

async function main() {
  const directories = process.argv.slice(2);
  if (!directories.length) {
    throw new Error(
      'Pass explicit asset directories. Originals are never modified.',
    );
  }
  let count = 0;
  for (const directory of directories) {
    const path = resolve(directory);
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (!entry.isFile() || !/^[a-f0-9]{64}\.webp$/.test(entry.name)) continue;
      await warmImagePreviews(join(path, entry.name), IMAGE_WIDTHS);
      count++;
      if (count % 50 === 0) console.log(`Prepared ${count} images`);
    }
  }
  console.log(`Prepared ${count} images; originals unchanged.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
