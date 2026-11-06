import type { Article, Confidence, Conversation, Customer, Message, Order, Source, Tone, Topic } from "../types";
import { bm25, MIN_GROUNDING_SCORE, type ScoredArticle } from "./retrieve";
import { classifyTopic, SENSITIVE_TOPICS, TOPIC_EXPANSION } from "./topics";

export interface DraftContext {
  conversation: Conversation;
  messages: Message[];
  customer: Customer;
  order?: Order;
  orders: Order[];
  articles: Article[];
  agentName: string;
  storeName: string;
  tone: Tone;
  attempt: number;
  now: Date;
}

export interface Grounding {
  topic: Topic;
  question: string;
  articles: ScoredArticle[];
  notes: Message[];
  usesTracking: boolean;
  covered: boolean;
}

const SUPPORTING_SCORE = 4;
const MIN_DIRECT_SCORE = 2;
const HIGH_CONFIDENCE_SCORE = 5;

const ORDER_TOPICS: Topic[] = ["where_is_my_order", "delivery_delay", "exchange", "cancellation", "damage", "billing"];

export function latestCustomerText(messages: Message[]): string {
  const customer = messages.filter((m) => m.author === "customer");
  return customer.map((m) => m.body).slice(-2).join("\n");
}

/** Decide topic, retrieve articles and collect internal notes. Pure: no network. */
export function ground(ctx: DraftContext, rank: (q: string, a: Article[]) => ScoredArticle[] = bm25): Grounding {
  const question = latestCustomerText(ctx.messages) || ctx.conversation.subject;
  const topic = classifyTopic(`${ctx.conversation.subject}\n${question}`);
  const query = [ctx.conversation.subject, question, ...TOPIC_EXPANSION[topic]].join(" ");
  // Expansion terms help ranking, but the question's own words must match the article too,
  // otherwise "Do you price match?" would be "answered" by the shipping article.
  const direct = new Map(rank(`${ctx.conversation.subject} ${question}`, ctx.articles).map((s) => [s.article.id, s.score]));
  const ranked = rank(query, ctx.articles).filter((s) => s.score >= MIN_GROUNDING_SCORE);
  const helpRanked = ranked.filter((s) => s.article.kind === "help");
  const top = helpRanked[0] && (direct.get(helpRanked[0].article.id) ?? 0) >= MIN_DIRECT_SCORE ? helpRanked[0] : undefined;
  // Supporting articles and internal notes only count alongside a directly matching top article.
  const help = top ? [top, ...helpRanked.slice(1).filter((s) => s.score >= SUPPORTING_SCORE).slice(0, 1)] : [];
  const internal = top ? ranked.filter((s) => s.article.kind === "internal" && s.score >= SUPPORTING_SCORE).slice(0, 1) : [];
  const usesTracking = !!ctx.order && ctx.order.events.length > 0 && ["where_is_my_order", "delivery_delay"].includes(topic);
  const needsOrder = ORDER_TOPICS.includes(topic);
  return {
    topic,
    question,
    articles: [...help, ...internal],
    notes: ctx.messages.filter((m) => m.author === "note"),
    usesTracking,
    // Order-status questions are answered from live tracking even without an article.
    covered: (help.length > 0 || (usesTracking && topic === "where_is_my_order")) && (!needsOrder || !!ctx.order),
  };
}

export function sourcesFor(ctx: DraftContext, g: Grounding, usedArticleIds?: string[]): Source[] {
  const sources: Source[] = [];
  if (g.usesTracking && ctx.order) sources.push({ kind: "tracking", id: ctx.order.id, title: "Courier tracking API" });
  else if (ctx.order && ORDER_TOPICS.includes(g.topic)) sources.push({ kind: "order", id: ctx.order.id, title: `Order #${ctx.order.id}` });
  for (const s of g.articles) {
    if (usedArticleIds && !usedArticleIds.includes(s.article.id)) continue;
    sources.push({ kind: s.article.kind === "internal" ? "note" : "article", id: s.article.id, title: s.article.title, score: Number(s.score.toFixed(2)) });
  }
  return sources;
}

export function confidenceFor(g: Grounding): Confidence {
  if (!g.covered) return "low";
  if (g.usesTracking && g.topic === "where_is_my_order") return "high";
  const top = g.articles[0]?.score ?? 0;
  // Without a recognised topic we can still answer from an article, but never with high confidence.
  return top >= HIGH_CONFIDENCE_SCORE && g.topic !== "other" ? "high" : "medium";
}

export function needsAgentFor(g: Grounding, confidence: Confidence): { needsAgent: boolean; reason?: string } {
  if (!g.covered && g.articles.length > 0) return { needsAgent: true, reason: "This needs the customer's order, and none is linked to the ticket." };
  if (!g.covered) return { needsAgent: true, reason: "No help article covers this question, so Helpdeck won't guess." };
  if (SENSITIVE_TOPICS.includes(g.topic)) return { needsAgent: true, reason: "Refunds, charges, damage and cancellations always go to a person." };
  if (confidence === "low") return { needsAgent: true, reason: "Low confidence." };
  return { needsAgent: false };
}
