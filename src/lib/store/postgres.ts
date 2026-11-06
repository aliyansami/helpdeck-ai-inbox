import { asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as s from "@/db/schema";
import type {
  ActivityEntry, Article, Conversation, Customer, HistoryTicket, Message, Order, Rule, Workspace,
} from "../types";
import type { Store } from "./types";

const TS_KEYS = new Set(["placedAt", "expectedDelivery", "createdAt", "updatedAt", "at", "lastRunAt", "pausedAt", "resolvedAt"]);

// "2026-11-06 13:45:12.123+00" -> "2026-11-06T13:45:12.123Z"
const toIso = (pg: string) => new Date(pg.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toISOString();

/** Postgres returns NULL and "YYYY-MM-DD HH:MM:SS+00"; the app uses undefined and ISO strings. */
function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || k === "position") continue;
    out[k] = TS_KEYS.has(k) && typeof v === "string" ? toIso(v) : v;
  }
  return out as T;
}

function toRow<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? null : v;
  return out;
}

export function createDb(url: string) {
  const client = postgres(url, { max: 5 });
  return drizzle(client, { schema: s });
}

export class PostgresStore implements Store {
  readonly kind = "postgres" as const;
  constructor(private db: PostgresJsDatabase<typeof s>) {}

  async workspace() {
    const [row] = await this.db.select().from(s.workspace).where(eq(s.workspace.id, 1));
    if (!row) throw new Error("Database is empty. Run `npm run db:push && npm run db:seed` first.");
    return row.data;
  }
  async updateWorkspace(patch: Partial<Workspace>) {
    const current = await this.workspace();
    await this.db.update(s.workspace).set({ data: { ...current, ...patch } }).where(eq(s.workspace.id, 1));
  }
  async agents() { return this.db.select().from(s.agents); }

  async customers() { return (await this.db.select().from(s.customers)).map((r) => fromRow<Customer>(r)); }
  async customerByEmail(email: string) {
    const [row] = await this.db.select().from(s.customers).where(sql`lower(${s.customers.email}) = ${email.toLowerCase()}`);
    return row ? fromRow<Customer>(row) : undefined;
  }
  async createCustomer(c: Customer) { await this.db.insert(s.customers).values(c); }

  async orders() { return (await this.db.select().from(s.orders)).map((r) => fromRow<Order>(r)); }

  async conversations() {
    return (await this.db.select().from(s.conversations)).map((r) => fromRow<Conversation>(r));
  }
  async conversation(id: string) {
    const [row] = await this.db.select().from(s.conversations).where(eq(s.conversations.id, id));
    return row ? fromRow<Conversation>(row) : undefined;
  }
  async createConversation(c: Conversation) {
    await this.db.insert(s.conversations).values(toRow(c) as typeof s.conversations.$inferInsert);
  }
  async updateConversation(id: string, patch: Partial<Conversation>) {
    await this.db.update(s.conversations).set(toRow(patch)).where(eq(s.conversations.id, id));
  }
  async nextTicketNumber() {
    const [row] = await this.db.select({ max: sql<number>`coalesce(max(${s.conversations.number}), 0)` }).from(s.conversations);
    return Number(row.max) + 1;
  }

  async messages(conversationId: string) {
    const rows = await this.db.select().from(s.messages).where(eq(s.messages.conversationId, conversationId)).orderBy(asc(s.messages.at));
    return rows.map((r) => fromRow<Message>(r));
  }
  async addMessage(m: Message) { await this.db.insert(s.messages).values(toRow(m) as typeof s.messages.$inferInsert); }

  async articles() { return (await this.db.select().from(s.articles)).map((r) => fromRow<Article>(r)); }
  async saveArticle(a: Article) {
    const row = toRow(a) as typeof s.articles.$inferInsert;
    await this.db.insert(s.articles).values(row).onConflictDoUpdate({ target: s.articles.id, set: row });
  }
  async deleteArticle(id: string) { await this.db.delete(s.articles).where(eq(s.articles.id, id)); }
  async bumpCitations(ids: string[]) {
    if (!ids.length) return;
    await this.db.update(s.articles).set({ timesCited: sql`${s.articles.timesCited} + 1` }).where(inArray(s.articles.id, ids));
  }

  async rules() {
    return (await this.db.select().from(s.rules).orderBy(asc(s.rules.position))).map((r) => fromRow<Rule>(r));
  }
  async saveRule(r: Rule) {
    const row = toRow(r) as typeof s.rules.$inferInsert;
    await this.db.insert(s.rules).values(row).onConflictDoUpdate({ target: s.rules.id, set: row });
  }
  async deleteRule(id: string) { await this.db.delete(s.rules).where(eq(s.rules.id, id)); }

  async activity(limit = 20) {
    const rows = await this.db.select().from(s.activity).orderBy(desc(s.activity.at)).limit(limit);
    return rows.map((r) => fromRow<ActivityEntry>(r));
  }
  async addActivity(a: ActivityEntry) { await this.db.insert(s.activity).values(a); }

  async gaps() { return this.db.select().from(s.gaps).orderBy(desc(s.gaps.count)); }
  async recordGap(question: string) {
    await this.db.insert(s.gaps).values({ question: question.trim(), count: 1 })
      .onConflictDoUpdate({ target: s.gaps.question, set: { count: sql`${s.gaps.count} + 1` } });
  }
  async clearGaps() { await this.db.delete(s.gaps); }

  async history(sinceIso: string) {
    const rows = await this.db.select().from(s.history).where(gte(s.history.resolvedAt, sinceIso));
    return rows.map((r) => fromRow<HistoryTicket>(r));
  }
  async addHistory(h: HistoryTicket) { await this.db.insert(s.history).values(toRow(h) as typeof s.history.$inferInsert); }
}
