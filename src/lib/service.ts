import { randomUUID } from "node:crypto";
import type { DraftContext } from "./ai/grounding";
import { mockDraft } from "./ai/mock";
import { classifyTopic, TOPIC_LABEL } from "./ai/topics";
import { evaluateRules, type RuleEvent } from "./automations";
import { hasOpenAI } from "./config";
import { getStore, type Store } from "./store";
import type { Channel, Conversation, Draft, Order, Tone } from "./types";

export function lifetimeSpend(orders: Order[], customerId: string) {
  return orders.filter((o) => o.customerId === customerId && o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
}

const topicTag = (text: string) => {
  const topic = classifyTopic(text);
  return topic === "other" || topic === "where_is_my_order" ? undefined : TOPIC_LABEL[topic];
};

async function draftContext(store: Store, conversationId: string, tone: Tone, attempt: number): Promise<DraftContext | undefined> {
  const conversation = await store.conversation(conversationId);
  if (!conversation) return undefined;
  const [messages, customers, orders, articles, workspace, agents] = await Promise.all([
    store.messages(conversationId), store.customers(), store.orders(), store.articles(), store.workspace(), store.agents(),
  ]);
  const customer = customers.find((c) => c.id === conversation.customerId)!;
  return {
    conversation, messages, customer, articles,
    order: orders.find((o) => o.id === conversation.orderId),
    orders: orders.filter((o) => o.customerId === customer.id),
    agentName: agents.find((a) => a.id === workspace.currentAgentId)?.name ?? "Support",
    storeName: workspace.storeName,
    tone, attempt, now: new Date(),
  };
}

async function runDrafter(ctx: DraftContext): Promise<Draft> {
  if (hasOpenAI()) {
    const { openaiDraft } = await import("./ai/openai");
    return openaiDraft(ctx);
  }
  return mockDraft(ctx);
}

/** Generate (or regenerate) the AI draft for a conversation and store it. */
export async function generateDraft(conversationId: string, opts: { tone?: Tone; regenerate?: boolean } = {}) {
  const store = await getStore();
  const existing = (await store.conversation(conversationId))?.draft;
  const tone = opts.tone ?? existing?.tone ?? "friendly";
  const attempt = opts.regenerate ? (existing?.attempt ?? 0) + 1 : 0;
  const ctx = await draftContext(store, conversationId, tone, attempt);
  if (!ctx) throw new Error("Conversation not found");
  const draft = await runDrafter(ctx);
  await store.updateConversation(conversationId, { draft });
  if (draft.gap && !opts.regenerate) {
    const q = ctx.messages.filter((m) => m.author === "customer").at(-1)?.body;
    if (q) await store.recordGap(q.length > 80 ? ctx.conversation.subject : q);
  }
  return draft;
}

/** Seed-time setup for demo mode: topic tags, silent rule effects and mock drafts. */
export async function bootstrap(store: Store) {
  const [conversations, rules, orders, workspace, agents] = await Promise.all([
    store.conversations(), store.rules(), store.orders(), store.workspace(), store.agents(),
  ]);
  for (const c of conversations) {
    const messages = await store.messages(c.id);
    const text = `${c.subject}\n${messages.filter((m) => m.author === "customer").map((m) => m.body).join("\n")}`;
    const tag = topicTag(text);
    const tags = tag && !c.tags.includes(tag) ? [...c.tags, tag] : c.tags;
    const outcome = evaluateRules(rules.filter((r) => r.trigger !== "waiting_on_customer"), {
      trigger: "ticket_created", channel: c.channel, text, tags, topic: classifyTopic(text),
      lifetimeSpend: lifetimeSpend(orders, c.customerId), attachments: 0, now: new Date(),
    }, workspace.guardrails, agents);
    await store.updateConversation(c.id, {
      tags: outcome.tags,
      queue: outcome.queue ?? c.queue,
      priority: outcome.priority ?? c.priority,
    });
    if (c.status === "open" && !hasOpenAI()) {
      const ctx = await draftContext(store, c.id, "friendly", 0);
      if (ctx) await store.updateConversation(c.id, { draft: mockDraft(ctx) });
    }
  }
}

export async function sendReply(conversationId: string, body: string) {
  const store = await getStore();
  const [c, workspace, agents] = await Promise.all([store.conversation(conversationId), store.workspace(), store.agents()]);
  if (!c || !body.trim()) return;
  const agent = agents.find((a) => a.id === workspace.currentAgentId)!;
  const now = new Date();
  await store.addMessage({ id: randomUUID(), conversationId, author: "agent", authorName: agent.name, body: body.trim(), at: now.toISOString() });
  const fromDraft = !!c.draft;
  const edited = fromDraft && c.draft!.body.trim() !== body.trim();
  if (c.draft) await store.bumpCitations(c.draft.sources.filter((s) => s.kind === "article" || s.kind === "note").map((s) => s.id));
  await store.updateConversation(conversationId, { status: "waiting", draft: undefined, updatedAt: now.toISOString() });
  await store.addHistory({
    id: randomUUID(), resolvedAt: now.toISOString(),
    firstReplySeconds: Math.max(30, Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 1000)),
    topic: historyTopic(c.draft?.topic), agentId: agent.id, fromDraft, edited,
  });
}

function historyTopic(topic?: Draft["topic"]) {
  switch (topic) {
    case "delivery_delay": case "where_is_my_order": return "Delivery delay";
    case "exchange": case "damage": case "refund": return "Returns & exchanges";
    case "cancellation": return "Order changes";
    case "promo": case "billing": return "Payments & promo";
    case "pre_sale": return "Product questions";
    default: return "Other";
  }
}

export async function addNote(conversationId: string, body: string) {
  const store = await getStore();
  const [workspace, agents] = await Promise.all([store.workspace(), store.agents()]);
  const agent = agents.find((a) => a.id === workspace.currentAgentId)!;
  await store.addMessage({ id: randomUUID(), conversationId, author: "note", authorName: agent.name, body: body.trim(), at: new Date().toISOString() });
}

export interface IncomingMessage {
  name: string;
  email: string;
  channel: Channel;
  text: string;
  conversationId?: string;
  attachments?: number;
}

export interface IngestResult {
  conversationId: string;
  answer?: { body: string; source?: string };
  handedOff: boolean;
}

/**
 * The full pipeline for a new customer message:
 * store it → tag the topic → draft from articles + order → run automation rules → auto-send or hand to an agent.
 */
export async function ingestMessage(input: IncomingMessage): Promise<IngestResult> {
  const store = await getStore();
  const now = new Date();
  const [workspace, agents, rules, orders] = await Promise.all([store.workspace(), store.agents(), store.rules(), store.orders()]);

  let customer = await store.customerByEmail(input.email);
  if (!customer) {
    customer = { id: `c-${randomUUID().slice(0, 8)}`, name: input.name.trim() || "Website visitor", email: input.email, color: "#0EA5E9", since: now.toISOString() };
    await store.createCustomer(customer);
  }

  let conversation = input.conversationId ? await store.conversation(input.conversationId) : undefined;
  const isNew = !conversation;
  if (!conversation) {
    const number = await store.nextTicketNumber();
    const orderMatch = input.text.match(/\b(4\d{4})\b/)?.[1];
    const customerOrders = orders.filter((o) => o.customerId === customer!.id).sort((a, b) => b.placedAt.localeCompare(a.placedAt));
    conversation = {
      id: `t-${number}`, number, customerId: customer.id,
      orderId: orders.find((o) => o.id === orderMatch && o.customerId === customer!.id)?.id ?? customerOrders[0]?.id,
      subject: subjectFrom(input.text), channel: input.channel, status: "open", tags: [], priority: "normal",
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
    await store.createConversation(conversation);
  }
  await store.addMessage({
    id: randomUUID(), conversationId: conversation.id, author: "customer", authorName: customer.name,
    body: input.text.trim(), at: now.toISOString(), attachments: input.attachments,
  });

  const tag = topicTag(`${conversation.subject}\n${input.text}`);
  const tags = tag && !conversation.tags.includes(tag) ? [...conversation.tags, tag] : conversation.tags;
  await store.updateConversation(conversation.id, { tags, status: "open", updatedAt: now.toISOString() });

  const draft = await generateDraft(conversation.id);
  const event: RuleEvent = {
    trigger: input.channel === "chat" ? "chat_received" : isNew ? "ticket_created" : "message_received",
    channel: input.channel, text: input.text, tags, topic: draft.topic, confidence: draft.confidence,
    lifetimeSpend: lifetimeSpend(orders, customer.id), attachments: input.attachments ?? 0, now,
  };
  const outcome = evaluateRules(rules, event, workspace.guardrails, agents);

  for (const m of outcome.matches) {
    await store.saveRule({ ...m.rule, runs: m.rule.runs + 1, lastRunAt: now.toISOString() });
    await store.addActivity({
      id: randomUUID(), at: now.toISOString(), ruleId: m.rule.id, ruleName: m.rule.name,
      ticket: `#${conversation.number} · ${conversation.subject}`, result: m.result,
      tone: m.result.startsWith("Skipped") ? "neutral" : m.result.startsWith("Sent") || m.result.startsWith("Tagged") ? "success" : "warning",
    });
  }
  await store.updateConversation(conversation.id, {
    tags: outcome.tags,
    assigneeId: outcome.assigneeId ?? conversation.assigneeId,
    priority: outcome.priority ?? conversation.priority,
    queue: outcome.queue ?? conversation.queue,
    autoSendBlocked: !!outcome.autoSendBlockedBy,
  });

  const agent = agents.find((a) => a.id === workspace.currentAgentId)!;
  const postAi = async (body: string) => {
    await store.addMessage({ id: randomUUID(), conversationId: conversation!.id, author: "ai", authorName: "Helpdeck AI", body, at: new Date().toISOString() });
  };

  for (const reply of outcome.replies) await postAi(reply);
  if (outcome.requestPhoto) await postAi(`Hi ${customer.name.split(" ")[0]}, sorry about this. Could you reply with a photo of the item and the box? We'll sort it out as soon as we have it.`);

  // Chat answers instantly when the draft is confident and no guardrail applies; email only via an auto-send rule.
  const guardrailOk = !draft.needsAgent && draft.confidence === "high" && !outcome.autoSendBlockedBy;
  const instantChat = input.channel === "chat" && guardrailOk && !outcome.matches.some((m) => m.rule.actions.some((a) => a.type === "skip_auto_send"));
  if ((outcome.autoSend || instantChat) && draft.body) {
    // Chat answers drop the email-style greeting and sign-off.
    const body = input.channel === "chat"
      ? draft.body.replace(new RegExp(`\\n\\n${agent.name.split(" ")[0]}$`), "").replace(/^Hi there,\s*/, "").replace(/^./, (c) => c.toUpperCase())
      : draft.body;
    await postAi(body);
    await store.updateConversation(conversation.id, { status: "waiting", draft: undefined });
    await store.bumpCitations(draft.sources.filter((s) => s.kind === "article").map((s) => s.id));
    const source = draft.sources.find((s) => s.kind === "article")?.title;
    return { conversationId: conversation.id, answer: { body, source }, handedOff: false };
  }
  return { conversationId: conversation.id, handedOff: true };
}

function subjectFrom(text: string) {
  const first = (text.trim().match(/^[^.?!\n]+\??/)?.[0] ?? "").trim();
  if (!first) return "New message";
  const s = first.length > 48 ? `${first.slice(0, 46).trimEnd()}…` : first;
  return s[0].toUpperCase() + s.slice(1);
}

// ---- Read models for pages ----

export interface ConversationListItem extends Conversation {
  customerName: string;
  customerColor: string;
  customerEmail: string;
}

export async function inboxCounts() {
  const store = await getStore();
  const [conversations, workspace] = await Promise.all([store.conversations(), store.workspace()]);
  const open = conversations.filter((c) => c.status === "open");
  return {
    open: open.length,
    waiting: conversations.filter((c) => c.status === "waiting").length,
    snoozed: conversations.filter((c) => c.status === "snoozed").length,
    resolved: conversations.filter((c) => c.status === "resolved").length,
    mine: open.filter((c) => c.assigneeId === workspace.currentAgentId).length,
    drafts: open.filter((c) => c.draft && !c.draft.needsAgent).length,
  };
}

export type InboxView = "open" | "waiting" | "snoozed" | "resolved" | "mine" | "drafts";

export async function listConversations(view: InboxView, q?: string): Promise<ConversationListItem[]> {
  const store = await getStore();
  const [conversations, customers, workspace] = await Promise.all([store.conversations(), store.customers(), store.workspace()]);
  const needle = q?.trim().toLowerCase();
  const items = conversations
    .filter((c) => {
      switch (view) {
        case "mine": return c.status === "open" && c.assigneeId === workspace.currentAgentId;
        case "drafts": return c.status === "open" && !!c.draft && !c.draft.needsAgent;
        default: return c.status === view;
      }
    })
    .map((c) => {
      const cust = customers.find((x) => x.id === c.customerId)!;
      return { ...c, customerName: cust.name, customerColor: cust.color, customerEmail: cust.email };
    })
    .filter((c) => !needle || [c.customerName, c.customerEmail, c.subject, c.orderId ?? "", `#${c.number}`, ...c.tags].some((f) => f.toLowerCase().includes(needle)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items;
}

export async function conversationDetail(id: string) {
  const store = await getStore();
  const conversation = await store.conversation(id);
  if (!conversation) return undefined;
  const [messages, customers, orders, agents] = await Promise.all([store.messages(id), store.customers(), store.orders(), store.agents()]);
  const customer = customers.find((c) => c.id === conversation.customerId)!;
  const customerOrders = orders.filter((o) => o.customerId === customer.id);
  return {
    conversation, messages, customer, agents,
    order: orders.find((o) => o.id === conversation.orderId),
    orderCount: customerOrders.length,
    lifetimeSpend: lifetimeSpend(orders, customer.id),
  };
}


/** Answer a question the way the chat widget would, without creating a ticket. Used for the widget preview. */
export async function widgetPreview(question: string) {
  const store = await getStore();
  const [articles, workspace] = await Promise.all([store.articles(), store.workspace()]);
  const now = new Date();
  const conversation: Conversation = {
    id: "preview", number: 0, customerId: "preview", subject: question, channel: "chat", status: "open", tags: [],
    priority: "normal", createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  const draft = mockDraft({
    conversation, articles: articles.filter((a) => a.kind === "help"), orders: [], agentName: "", storeName: workspace.storeName,
    customer: { id: "preview", name: "there", email: "", color: "", since: now.toISOString() },
    messages: [{ id: "q", conversationId: "preview", author: "customer", authorName: "Visitor", body: question, at: now.toISOString() }],
    tone: "friendly", attempt: 0, now,
  });
  const body = draft.body.replace(/^Hi there,\s*/, "").trim();
  return {
    body: body[0].toUpperCase() + body.slice(1),
    source: draft.sources.find((s) => s.kind === "article")?.title,
  };
}

export async function widgetMessages(conversationId: string) {
  const store = await getStore();
  return (await store.messages(conversationId)).filter((m) => m.author !== "note");
}
