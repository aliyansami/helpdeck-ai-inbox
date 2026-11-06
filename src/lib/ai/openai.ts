import OpenAI from "openai";
import type { Article, Confidence, Draft } from "../types";
import { confidenceFor, type DraftContext, ground, latestCustomerText, needsAgentFor, sourcesFor } from "./grounding";
import { bm25, rerankWithEmbeddings, type ScoredArticle } from "./retrieve";

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

let client: OpenAI | null = null;
function openai() {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// Article embeddings, keyed by id + updatedAt so edits are re-embedded.
const embeddingCache = new Map<string, number[]>();

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai().embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return res.data.map((d) => d.embedding);
}

/** Embed every published article (cached) and the query, then return a ranker for `ground()`. */
async function hybridRanker(query: string, articles: Article[]) {
  const published = articles.filter((a) => a.status === "published");
  const key = (a: Article) => `${a.id}:${a.updatedAt}`;
  const missing = published.filter((a) => !embeddingCache.has(key(a)));
  if (missing.length) {
    const vecs = await embed(missing.map((a) => `${a.title}\n${a.body}`));
    missing.forEach((a, i) => embeddingCache.set(key(a), vecs[i]));
  }
  const [queryVec] = await embed([query]);
  const vecs = new Map(published.map((a) => [a.id, embeddingCache.get(key(a))!]));
  return (q: string, list: Article[]): ScoredArticle[] => rerankWithEmbeddings(bm25(q, list), queryVec, vecs);
}

const TONE_HINT = {
  friendly: "warm and human, short sentences, no exclamation marks",
  concise: "very brief, two or three sentences",
  formal: "polite and formal, British English",
};

/** Draft with OpenAI, grounded only on the retrieved articles, the order and internal notes. */
export async function openaiDraft(ctx: DraftContext): Promise<Draft> {
  const rank = await hybridRanker(`${ctx.conversation.subject}\n${latestCustomerText(ctx.messages)}`, ctx.articles);
  const g = ground(ctx, rank);
  let confidence: Confidence = confidenceFor(g);
  const { needsAgent, reason } = needsAgentFor(g, confidence);

  const sourceBlock = g.articles
    .map((s) => `[${s.article.id}] ${s.article.title} (${s.article.kind === "internal" ? "internal, never quote" : "help centre"})\n${s.article.body}`)
    .join("\n\n");
  const order = ctx.order
    ? JSON.stringify({ number: ctx.order.id, status: ctx.order.status, total: ctx.order.total, currency: ctx.order.currency, carrier: ctx.order.carrier, items: ctx.order.items, events: ctx.order.events, expectedDelivery: ctx.order.expectedDelivery, charges: ctx.order.charges, discountCode: ctx.order.discountCode })
    : "none";
  const thread = ctx.messages
    .map((m) => `${m.author === "note" ? "INTERNAL NOTE" : m.author.toUpperCase()} (${m.authorName}, ${m.at}): ${m.body}`)
    .join("\n");

  const system = [
    `You draft customer support replies for ${ctx.storeName}, an online store. An agent reviews every draft before it is sent.`,
    "Use ONLY the facts in SOURCES, ORDER and internal notes. Never invent policies, dates, codes or amounts.",
    "If the sources don't answer the question, write a short holding reply saying you're checking with the team, and set covered to false.",
    "Never promise refunds or cancellations as done; say the team will confirm.",
    `Tone: ${TONE_HINT[ctx.tone]}. Address the customer by first name. Sign off with "${ctx.agentName.split(" ")[0]}".`,
    `Today is ${ctx.now.toUTCString()}.`,
    'Reply as JSON: {"reply": string, "used_source_ids": string[], "covered": boolean, "confidence": "high"|"medium"|"low", "checks": string[] (2-4 short past-tense notes on what you checked, e.g. "Checked live tracking")}',
  ].join("\n");
  const user = `SOURCES:\n${sourceBlock || "none"}\n\nORDER:\n${order}\n\nTHREAD:\n${thread}`;

  const res = await openai().chat.completions.create({
    model: MODEL,
    temperature: ctx.attempt === 0 ? 0.3 : 0.8,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  const raw = JSON.parse(res.choices[0]?.message?.content || "{}") as {
    reply?: string; used_source_ids?: string[]; covered?: boolean; confidence?: Confidence; checks?: string[];
  };

  // The model can lower confidence but never raise it above what retrieval supports.
  const order_: Confidence[] = ["low", "medium", "high"];
  if (raw.confidence && order_.indexOf(raw.confidence) < order_.indexOf(confidence)) confidence = raw.confidence;
  if (raw.covered === false) confidence = "low";
  const valid = (raw.used_source_ids ?? []).filter((id) => g.articles.some((s) => s.article.id === id));

  return {
    body: (raw.reply ?? "").trim(),
    confidence,
    topic: g.topic,
    sources: sourcesFor(ctx, g, valid),
    checks: (raw.checks ?? []).slice(0, 4),
    tone: ctx.tone,
    needsAgent: needsAgent || confidence === "low",
    reason: reason ?? (confidence === "low" ? "The model said the sources don't cover this." : undefined),
    gap: g.articles.length === 0 && !g.covered,
    provider: "openai",
    attempt: ctx.attempt,
    generatedAt: ctx.now.toISOString(),
  };
}
