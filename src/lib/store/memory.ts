import type { SeedData } from "../seed";
import type { Store } from "./types";

const clone = <T>(v: T): T => structuredClone(v);

/** In-process store for demo mode. State lives until the server restarts. */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  constructor(private d: SeedData) {}

  async workspace() { return clone(this.d.workspace); }
  async updateWorkspace(patch: Partial<SeedData["workspace"]>) { this.d.workspace = { ...this.d.workspace, ...patch }; }
  async agents() { return clone(this.d.agents); }

  async customers() { return clone(this.d.customers); }
  async customerByEmail(email: string) {
    return clone(this.d.customers.find((c) => c.email.toLowerCase() === email.toLowerCase()));
  }
  async createCustomer(c: SeedData["customers"][number]) { this.d.customers.push(clone(c)); }

  async orders() { return clone(this.d.orders); }

  async conversations() { return clone(this.d.conversations); }
  async conversation(id: string) { return clone(this.d.conversations.find((c) => c.id === id)); }
  async createConversation(c: SeedData["conversations"][number]) { this.d.conversations.push(clone(c)); }
  async updateConversation(id: string, patch: Partial<SeedData["conversations"][number]>) {
    const i = this.d.conversations.findIndex((c) => c.id === id);
    if (i >= 0) this.d.conversations[i] = { ...this.d.conversations[i], ...clone(patch) };
  }
  async nextTicketNumber() { return Math.max(0, ...this.d.conversations.map((c) => c.number)) + 1; }

  async messages(conversationId: string) {
    return clone(this.d.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.at.localeCompare(b.at)));
  }
  async addMessage(m: SeedData["messages"][number]) { this.d.messages.push(clone(m)); }

  async articles() { return clone(this.d.articles); }
  async saveArticle(a: SeedData["articles"][number]) {
    const i = this.d.articles.findIndex((x) => x.id === a.id);
    if (i >= 0) this.d.articles[i] = clone(a);
    else this.d.articles.push(clone(a));
  }
  async deleteArticle(id: string) { this.d.articles = this.d.articles.filter((a) => a.id !== id); }
  async bumpCitations(ids: string[]) {
    for (const a of this.d.articles) if (ids.includes(a.id)) a.timesCited += 1;
  }

  async rules() { return clone(this.d.rules); }
  async saveRule(r: SeedData["rules"][number]) {
    const i = this.d.rules.findIndex((x) => x.id === r.id);
    if (i >= 0) this.d.rules[i] = clone(r);
    else this.d.rules.push(clone(r));
  }
  async deleteRule(id: string) { this.d.rules = this.d.rules.filter((r) => r.id !== id); }

  async activity(limit = 20) {
    return clone([...this.d.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit));
  }
  async addActivity(a: SeedData["activity"][number]) { this.d.activity.push(clone(a)); }

  async gaps() { return clone(this.d.gaps); }
  async recordGap(question: string) {
    const q = question.trim();
    const g = this.d.gaps.find((x) => x.question.toLowerCase() === q.toLowerCase());
    if (g) g.count += 1;
    else this.d.gaps.push({ question: q, count: 1 });
  }
  async clearGaps() { this.d.gaps = []; }

  async history(sinceIso: string) { return this.d.history.filter((h) => h.resolvedAt >= sinceIso); }
  async addHistory(h: SeedData["history"][number]) { this.d.history.push(clone(h)); }
}
