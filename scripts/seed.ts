/**
 * Seed Postgres with the North & Oak demo workspace.
 * Usage: DATABASE_URL=... npm run db:seed   (run `npm run db:push` first)
 */
import { sql } from "drizzle-orm";
import * as s from "../src/db/schema";
import { buildSeed } from "../src/lib/seed";
import { bootstrap } from "../src/lib/service";
import { createDb, PostgresStore } from "../src/lib/store/postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (see .env.example)");
  const db = createDb(url);
  const d = buildSeed(new Date());

  await db.execute(sql`truncate workspace, agents, customers, orders, conversations, messages, articles, rules, activity, knowledge_gaps, ticket_history cascade`);
  await db.insert(s.workspace).values({ id: 1, data: d.workspace });
  await db.insert(s.agents).values(d.agents);
  await db.insert(s.customers).values(d.customers);
  await db.insert(s.orders).values(d.orders.map((o) => ({ ...o, expectedDelivery: o.expectedDelivery ?? null, discountCode: o.discountCode ?? null, charges: o.charges ?? null })));
  await db.insert(s.conversations).values(d.conversations.map((c) => ({ ...c, orderId: c.orderId ?? null, assigneeId: c.assigneeId ?? null, queue: c.queue ?? null, draft: null })));
  await db.insert(s.messages).values(d.messages.map((m) => ({ ...m, attachments: m.attachments ?? null })));
  await db.insert(s.articles).values(d.articles.map((a) => ({ ...a, updatedBy: a.updatedBy ?? null })));
  for (const r of d.rules) await db.insert(s.rules).values({ ...r, lastRunAt: r.lastRunAt ?? null, pausedBy: r.pausedBy ?? null, pausedAt: r.pausedAt ?? null });
  await db.insert(s.activity).values(d.activity);
  await db.insert(s.gaps).values(d.gaps);
  for (let i = 0; i < d.history.length; i += 500) {
    await db.insert(s.history).values(d.history.slice(i, i + 500).map((h) => ({ ...h, rating: h.rating ?? null })));
  }

  // Topic tags, rule effects and (without an OpenAI key) mock drafts, same as demo mode.
  await bootstrap(new PostgresStore(db));
  console.log(`Seeded ${d.conversations.length} conversations, ${d.articles.length} articles, ${d.history.length} resolved tickets.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
