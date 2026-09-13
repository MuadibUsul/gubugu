import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import sharp from 'sharp';
import { z } from 'zod';

import { type ImageWidth } from '@/lib/image-variants';

const widthSchema = z.enum(['160', '320', '640', '960', '1280']);
const pending = new Map<string, Promise<string>>();
// Bound cold-cache CPU/memory on the small VPS; warm requests never queue.
let queue = Promise.resolve();

async function previewPath(source: string, width: ImageWidth) {
  const directory = join(dirname(source), '.previews-v1');
  const destination = join(directory, `${basename(source)}.${width}.webp`);
  try {
    await stat(destination);
    return destination;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const existing = pending.get(destination);
  if (existing) return existing;
  // Under a cold-cache burst serve the original instead of an unbounded queue.
  if (pending.size >= 16) return source;
  const job = queue.then(async () => {
    await mkdir(directory, { recursive: true });
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      const original = await readFile(source);
      const preview = await sharp(original, { limitInputPixels: 40_000_000 })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 90, smartSubsample: true, effort: 2 })
        .toBuffer();
      // Already-small images must never become larger just to use a preview URL.
      await writeFile(
        temporary,
        preview.length < original.length ? preview : original,
      );
      await rename(temporary, destination);
      return destination;
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  });
  pending.set(destination, job);
  queue = job.then(
    () => undefined,
    () => undefined,
  );
  try {
    return await job;
  } finally {
    pending.delete(destination);
  }
}

export async function warmImagePreviews(
  source: string,
  widths: readonly ImageWidth[] = [160, 320],
) {
  for (const width of widths) await previewPath(source, width);
}

/** Call only AFTER authentication/ownership checks and asset-path validation. */
export async function imageAssetResponse(
  request: Request,
  source: string,
  isPublic = false,
) {
  const requested = new URL(request.url).searchParams.get('w');
  const width = requested === null ? null : widthSchema.safeParse(requested);
  if (width && !width.success) {
    return new Response(null, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  // Deleted originals must not survive through a cached derivative.
  await stat(source);
  let path = source;
  if (width?.success) {
    try {
      path = await previewPath(source, Number(width.data) as ImageWidth);
    } catch {
      // A codec/disk failure must not turn an otherwise readable image blank.
      path = source;
    }
  }
  const bytes = await readFile(/* turbopackIgnore: true */ path);
  const etag = `"${createHash('sha256').update(bytes).digest('hex')}"`;
  const headers = {
    'Cache-Control':
      width?.success && path === source
        ? 'no-store'
        : isPublic
          ? 'public, max-age=31536000, immutable'
          : 'private, no-cache',
    ETag: etag,
    'Content-Type': 'image/webp',
    'X-Content-Type-Options': 'nosniff',
  };
  const matches = request.headers
    .get('if-none-match')
    ?.split(',')
    .some(
      (value) =>
        value.trim().replace(/^W\//, '') === etag || value.trim() === '*',
    );
  if (matches) return new Response(null, { status: 304, headers });
  return new Response(bytes, {
    headers: { ...headers, 'Content-Length': String(bytes.byteLength) },
  });
}
