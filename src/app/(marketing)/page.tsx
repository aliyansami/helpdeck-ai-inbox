import { AnswerBloom } from "@/components/landing/answer-bloom";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Pipeline } from "@/components/landing/pipeline";
import { Proof, type ProofData } from "@/components/landing/proof";
import { ReplyChapter, type ReplyData } from "@/components/landing/reply-chapter";
import type { StreamTicket } from "@/components/landing/ticket-stream";
import { Logo } from "@/components/ui";
import { describeActions, describeConditions, TRIGGER_LABEL } from "@/lib/automations";
import { dayDate, money, shortDate, timeAgo } from "@/lib/format";
import { buildReport } from "@/lib/reports";
import { conversationDetail, listConversations } from "@/lib/service";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const GITHUB = "https://github.com/aliyansami/helpdeck-ai-inbox";

export default async function Landing() {
  // Every section is built from the demo workspace's real data.
  const store = await getStore();
  const [open, d, articles, rules, agents, history] = await Promise.all([
    listConversations("open"),
    conversationDetail("t-9931"),
    store.articles(),
    store.rules(),
    store.agents(),
    store.history(new Date(Date.now() - 43 * 86_400_000).toISOString()),
  ]);

  const tickets: StreamTicket[] = open.slice(0, 7).map((c) => ({
    name: c.customerName,
    color: c.customerColor,
    subject: c.subject,
    tag: c.tags.find((t) => t !== "Refund"),
    status: c.draft && !c.draft.needsAgent ? "draft" : "agent",
    ago: timeAgo(c.updatedAt),
    featured: c.id === "t-9931",
  }));

  const draft = d?.conversation.draft;
  const reply: ReplyData | undefined = d && draft && d.order ? {
    customer: { name: d.customer.name, color: d.customer.color, since: String(new Date(d.customer.since).getUTCFullYear()) },
    message: d.messages.find((m) => m.author === "customer")?.body ?? "",
    order: {
      id: d.order.id,
      total: money(d.order.total, d.order.currency),
      events: d.order.events.map((e) => ({ label: e.label.replace(/^At /, ""), when: e.label === "Dispatched" ? shortDate(e.at) : dayDate(e.at), done: e.done })),
    },
    pastOrders: d.orderCount - 1,
    draft: draft.body,
    sources: draft.sources.map((s) => s.title),
    checks: draft.checks,
  } : undefined;

  const r = buildReport(history, agents, 21);
  const proof: ProofData = {
    kpis: [
      { label: "Tickets resolved", value: r.resolved, format: "int", note: `${r.resolvedChange >= 0 ? "+" : "−"}${Math.abs(Math.round(r.resolvedChange * 100))}% vs before` },
      { label: "Median first reply", value: r.medianReply, format: "duration", note: "per ticket" },
      { label: "Sent with no edits", value: r.noEdit * 100, format: "pct", note: "of AI drafts" },
      { label: "Customer rating", value: r.rating, format: "rating", note: `${r.ratings} ratings` },
    ],
    perDay: r.perDay,
    rules: rules.filter((x) => ["r-refund-tag", "r-double", "r-autosend"].includes(x.id)).map((x) => ({
      name: x.name,
      when: TRIGGER_LABEL[x.trigger],
      condition: x.conditions.length ? describeConditions(x.conditions) : "",
      then: describeActions(x.actions, agents),
      enabled: x.enabled,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <Nav github={GITHUB} />
      <Hero tickets={tickets} github={GITHUB} />
      {reply && <ReplyChapter data={reply} />}
      <AnswerBloom articles={articles.filter((a) => a.kind === "help" && a.status === "published")} />
      <Pipeline />
      <Proof data={proof} github={GITHUB} />
      <footer className="border-t border-line px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-[1408px] flex-col gap-4 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <Logo />
          <p>A portfolio project by Aliyan Sami · demo data, no real store connected</p>
          <p className="text-[13px]">
            Motion by <a className="link-draw" href="https://gsap.com">GSAP</a> · particle effects adapted from{" "}
            <a className="link-draw" href="https://github.com/MengTo/threeui">ThreeUI</a> (MIT)
          </p>
        </div>
      </footer>
    </div>
  );
}
