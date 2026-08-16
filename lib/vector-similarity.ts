/**
 * Cosine similarity over embedding vectors.
 *
 * goods_image_embeddings.embedding_payload is jsonb, not a pgvector column, so
 * no ANN index can be built over it and ranking happens here rather than in the
 * database. That is a deliberate trade for a catalogue of this size — see
 * docs/recognition-options.md for when it stops being one.
 */

/**
 * Returns a value in [-1, 1], or null when the vectors cannot be compared:
 * mismatched dimensions, empty input, a zero vector (no direction to compare)
 * or any non-finite component. Returning null rather than NaN keeps callers
 * from silently ranking a broken embedding as a weak match.
 */
export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[],
): number | null {
  if (a.length === 0 || a.length !== b.length) {
    return null;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];

    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }

    dot += left * right;
    magnitudeA += left * left;
    magnitudeB += right * right;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return null;
  }

  const similarity = dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));

  // Floating point can push an identical pair a hair past 1.
  return Math.min(1, Math.max(-1, similarity));
}

export type ScoredCandidate<T> = {
  item: T;
  score: number;
};

type RankOptions = {
  /** Drops candidates below this cosine score before limiting. */
  minScore?: number;
  limit?: number;
};

/**
 * Scores each candidate against the query vector and returns the best first.
 * Candidates whose vector cannot be compared are dropped rather than ranked
 * last, so a corrupt stored embedding never surfaces as a suggestion.
 */
export function rankByCosineSimilarity<T>(
  queryVector: readonly number[],
  candidates: readonly { item: T; vector: readonly number[] }[],
  { minScore = 0, limit }: RankOptions = {},
): ScoredCandidate<T>[] {
  const scored: ScoredCandidate<T>[] = [];

  for (const candidate of candidates) {
    const score = cosineSimilarity(queryVector, candidate.vector);

    if (score === null || score < minScore) {
      continue;
    }

    scored.push({ item: candidate.item, score });
  }

  scored.sort((left, right) => right.score - left.score);

  return typeof limit === 'number' ? scored.slice(0, limit) : scored;
}
