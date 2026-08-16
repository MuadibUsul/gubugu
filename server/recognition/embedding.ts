// Deliberately not marked `server-only`: the offline `pnpm db:embed` job is a
// plain Node process and has to import this. The server-only guard sits on the
// request-path modules that consume it.
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
} from '@huggingface/transformers';

/**
 * CLIP image embeddings, generated in-process. No Python service, no API calls
 * and no model training — the boundary AGENTS.md section 8 sets.
 *
 * Measured on the reference machine: the first load takes about 140 seconds
 * including the model download, then each image embeds in 60–90ms. That gap is
 * the whole architecture. The model must live in a long-running process, so
 * catalogue images are embedded by the offline `pnpm db:embed` job and only the
 * single uploaded image is embedded on the request path. Putting this in a
 * serverless function would pay the cold start on every invocation.
 */

export const embeddingProvider = 'transformers-js';
export const embeddingModel = 'Xenova/clip-vit-base-patch32';
export const embeddingDimensions = 512;

type Pipeline = {
  processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
  model: Awaited<
    ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>
  >;
};

const globalForEmbedding = globalThis as typeof globalThis & {
  __gubuguEmbeddingPipeline?: Promise<Pipeline>;
};

// Cached as the promise, not the resolved value, so concurrent callers during
// the ~140s cold load share one download instead of starting several.
function getPipeline() {
  if (!globalForEmbedding.__gubuguEmbeddingPipeline) {
    globalForEmbedding.__gubuguEmbeddingPipeline = (async () => ({
      processor: await AutoProcessor.from_pretrained(embeddingModel),
      model: await CLIPVisionModelWithProjection.from_pretrained(
        embeddingModel,
        { dtype: 'fp32' },
      ),
    }))();
  }

  return globalForEmbedding.__gubuguEmbeddingPipeline;
}

/** Warms the model so the first real request does not pay for the load. */
export async function warmEmbeddingPipeline() {
  await getPipeline();
}

type EmbeddableImage = Parameters<typeof RawImage.read>[0];

/**
 * Accepts anything RawImage.read handles — a Blob from an upload, a URL, or a
 * local path for the batch job.
 */
export async function embedImage(input: EmbeddableImage) {
  const { processor, model } = await getPipeline();

  const image = await RawImage.read(input);
  const inputs = await processor(image);
  const { image_embeds: imageEmbeds } = await model(inputs);

  const vector = Array.from(imageEmbeds.data as Iterable<number>).map(Number);

  if (vector.length === 0 || !vector.every(Number.isFinite)) {
    throw new Error('CLIP 返回了无效的向量。');
  }

  return vector;
}
