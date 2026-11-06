import type { DraftContext } from "@/lib/ai/grounding";
import { buildSeed } from "@/lib/seed";
import type { Message } from "@/lib/types";

export const NOW = new Date("2026-11-05T10:00:00Z"); // a Thursday

/** Draft context for a seeded conversation, optionally replacing the customer's message. */
export function contextFor(conversationId: string, overrides: { text?: string; subject?: string } = {}): DraftContext {
  const seed = buildSeed(NOW);
  const conversation = seed.conversations.find((c) => c.id === conversationId)!;
  if (overrides.subject) conversation.subject = overrides.subject;
  let messages: Message[] = seed.messages.filter((m) => m.conversationId === conversationId);
  if (overrides.text) {
    messages = [{ id: "x", conversationId, author: "customer", authorName: "Test", body: overrides.text, at: NOW.toISOString() }];
  }
  const customer = seed.customers.find((c) => c.id === conversation.customerId)!;
  return {
    conversation, messages, customer,
    order: seed.orders.find((o) => o.id === conversation.orderId),
    orders: seed.orders.filter((o) => o.customerId === customer.id),
    articles: seed.articles, agentName: "Sara Malik", storeName: "North & Oak",
    tone: "friendly", attempt: 0, now: NOW,
  };
}
