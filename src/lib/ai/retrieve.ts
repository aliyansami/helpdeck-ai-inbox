import type { Article } from "../types";

export interface ScoredArticle {
  article: Article;
  score: number;
}

const STOPWORDS = new Set(
  "a an and are as at be but by can could do does for from had has have hi hello hey how i if in is it its just me my of on or our please so that the their them there this to was we were what when where which who why will with would you your yours i'm i've it's can't don't".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9€£$\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// Very small suffix stemmer: enough to match "deliveries" with "delivery", "cancelled" with "cancel".
function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("led")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/**
 * BM25 over published articles. Titles count double.
 * Returns articles sorted by score, highest first, with zero-score articles dropped.
 */
export function bm25(query: string, articles: Article[], k1 = 1.4, b = 0.75): ScoredArticle[] {
  const docs = articles
    .filter((a) => a.status === "published")
    .map((a) => ({ article: a, tokens: [...tokenize(a.title), ...tokenize(a.title), ...tokenize(a.body)] }));
  if (docs.length === 0) return [];
  const avgLen = docs.reduce((s, d) => s + d.tokens.length, 0) / docs.length;
  const df = new Map<string, number>();
  for (const d of docs) for (const term of new Set(d.tokens)) df.set(term, (df.get(term) ?? 0) + 1);

  const qTerms = [...new Set(tokenize(query))];
  return docs
    .map(({ article, tokens }) => {
      const tf = new Map<string, number>();
      for (const term of tokens) tf.set(term, (tf.get(term) ?? 0) + 1);
      let score = 0;
      for (const q of qTerms) {
        const f = tf.get(q);
        if (!f) continue;
        const n = df.get(q) ?? 0;
        const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * tokens.length) / avgLen)));
      }
      return { article, score };
    })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score);
}

/** Minimum BM25 score for an article to count as covering the question. */
export const MIN_GROUNDING_SCORE = 3;

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Hybrid ranking for real mode: BM25 decides which articles qualify (so we never ground a draft on
 * an article that shares no words with the question), embeddings re-order the qualifying ones.
 */
export function rerankWithEmbeddings(
  lexical: ScoredArticle[],
  queryVec: number[],
  articleVecs: Map<string, number[]>,
): ScoredArticle[] {
  const maxLex = lexical[0]?.score || 1;
  return lexical
    .map((s) => {
      const vec = articleVecs.get(s.article.id);
      const sem = vec ? cosine(queryVec, vec) : 0;
      return { ...s, rank: 0.5 * (s.score / maxLex) + 0.5 * sem };
    })
    .sort((x, y) => y.rank - x.rank)
    .map(({ article, score }) => ({ article, score }));
}
