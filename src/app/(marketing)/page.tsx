import Link from "next/link";
import { Avatar, Badge, buttonClass, cx, LinkButton, Logo } from "@/components/ui";
import { dayDate, money, shortDate } from "@/lib/format";
import { conversationDetail } from "@/lib/service";

export const dynamic = "force-dynamic";

const GITHUB = "https://github.com/aliyansami/helpdeck-ai-inbox";

export default async function Landing() {
  // The hero shows a real ticket and draft from the demo workspace.
  const d = await conversationDetail("t-9931");
  const draft = d?.conversation.draft;
  const message = d?.messages.find((m) => m.author === "customer");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[83px] max-w-[1408px] items-center gap-9 px-6">
          <Logo />
          <nav className="flex gap-9 text-[16px] font-medium text-gray-700">
            <a href="#how" className="hover:text-ink">Product</a>
            <a href="#integrations" className="hover:text-ink">Integrations</a>
            <a href={GITHUB} className="hover:text-ink">Source code</a>
          </nav>
          <div className="ml-auto flex items-center gap-9">
            <Link href="/inbox" className="text-[16px] font-medium text-gray-700 hover:text-ink">Log in</Link>
            <LinkButton href="/inbox" variant="primary" className="h-[38px]">Try it free</LinkButton>
          </div>
        </div>
      </header>

      <section className="px-6 pt-[84px] text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-2 pr-3.5 text-sm font-bold text-navy">
          <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-white">New</span>
          Drafts now pull live order status from your store
        </p>
        <h1 className="mx-auto mt-8 max-w-[1150px] text-[68px] font-bold leading-[1.06] tracking-[-0.035em] text-navy">
          Answer every customer in minutes,<br />
          <span className="text-orange">without sounding like a bot.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-[830px] text-[21px] leading-[32px] text-gray-600">
          Helpdeck reads each email and chat, checks the order and your help center, and writes a reply your agent can send in one click. Your team stays in control of every word.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Link href="/inbox" className={cx(buttonClass("primary"), "h-[52px] px-7 text-[17px]")}>Open the live demo</Link>
          <a href={GITHUB} className={cx(buttonClass("secondary"), "h-[52px] px-7 text-[17px]")}>View on GitHub</a>
        </div>
      </section>

      {d && draft && message && (
        <section className="mx-auto mt-[60px] max-w-[1360px] px-6">
          <div className="grid grid-cols-[minmax(0,0.84fr)_minmax(0,1fr)] gap-5 rounded-t-[22px] bg-navy px-7 pt-7">
            <div className="rounded-t-xl bg-white p-6 pb-24">
              <div className="flex items-center gap-3">
                <Avatar name={d.customer.name} color={d.customer.color} />
                <div className="leading-tight">
                  <p className="font-bold">{d.customer.name}</p>
                  <p className="text-sm text-gray-500">Order #{d.order?.id} · via email · 4 min ago</p>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-6 text-gray-700">{message.body}</p>
              <div className="mt-4 flex gap-2">
                <Badge tone="yellow">Delivery delay</Badge>
                <Badge>Customer since {new Date(d.customer.since).getUTCFullYear()}</Badge>
                <Badge tone="blue">{d.orderCount - 1} past orders</Badge>
              </div>
              {d.order && (
                <div className="mt-6 rounded-xl border border-line p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">Order #{d.order.id} · {money(d.order.total, d.order.currency)}</p>
                    <Badge tone="yellow">In transit</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {d.order.events.map((e) => (
                      <div key={e.label}>
                        <div className={cx("h-1 rounded-full", e.done ? "bg-emerald-700" : "bg-gray-200")} />
                        <p className="mt-3 text-sm font-bold">{e.label.replace(/^At /, "")}</p>
                        <p className="text-[13px] text-gray-400">{e.label === "Dispatched" ? shortDate(e.at) : dayDate(e.at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-t-xl bg-white p-6 pb-12">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-orange">AI draft · ready to review</p>
                <Badge tone="green">High confidence</Badge>
              </div>
              <p className="mt-4 whitespace-pre-line rounded-xl border border-orange/30 bg-orange-50 px-5 py-4 text-[15px] leading-6 text-gray-800">
                {draft.body.replace(/\n\n\w+$/, "").replace(/\n\n/g, " ")}
              </p>
              <p className="mt-4 text-sm text-gray-500">Used: {draft.sources.map((s) => (s.kind === "article" ? `“${s.title}” article` : s.title.toLowerCase().replace(" api", ""))).join(" · ")}</p>
              <div className="mt-5 flex gap-2.5">
                <Link href="/inbox" className={buttonClass("primary")}>Send</Link>
                <Link href="/inbox" className={buttonClass("secondary")}>Edit</Link>
                <Link href="/inbox" className={buttonClass("secondary")}>Regenerate</Link>
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-y-2 border-t border-line pt-5 text-sm text-gray-600">
                {draft.checks.map((c) => <li key={c}>✓ {c}</li>)}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section id="how" className="bg-grey px-6 py-24">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="text-center text-[40px] font-bold tracking-tight text-navy">How a reply gets written</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-gray-600">Every draft is grounded in your own sources, and nothing reaches a customer unless a person or one of your rules says so.</p>
          <ol className="mt-14 grid grid-cols-4 gap-5">
            {[
              ["1", "Message arrives", "Email or chat lands in one inbox, tagged by topic, with the customer's orders alongside."],
              ["2", "Sources are retrieved", "Helpdeck finds the help articles that answer the question and looks up live order and tracking data."],
              ["3", "A draft is written", "The reply uses only those sources and lists them. If nothing covers it, the ticket goes to an agent."],
              ["4", "Your agent approves", "Send in one click, edit, or regenerate. Refunds and cancellations always need a person."],
            ].map(([n, title, body]) => (
              <li key={n} className="rounded-xl border border-line bg-white p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-sm font-bold text-white">{n}</span>
                <p className="mt-4 text-lg font-bold">{title}</p>
                <p className="mt-2 text-[15px] leading-6 text-gray-600">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="integrations" className="px-6 py-24">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 items-center gap-16">
          <div>
            <h2 className="text-[40px] font-bold leading-tight tracking-tight text-navy">One inbox for email, chat and your store</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">Support email and an embeddable chat widget feed the same queue. Automation rules tag, route and escalate tickets, with guardrails your team sets.</p>
            <div className="mt-8 flex gap-3">
              <LinkButton href="/channels" variant="primary">See channels</LinkButton>
              <LinkButton href="/automations">See automations</LinkButton>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-4">
            {[["✉️", "Support email"], ["💬", "Chat widget"], ["🛒", "Online store"], ["⚙️", "Automation rules"]].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border border-line p-5 font-bold">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-lg" aria-hidden>{icon}</span>{label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8">
        <div className="mx-auto flex max-w-[1408px] items-center justify-between text-sm text-gray-500">
          <Logo />
          <p>A portfolio project by Aliyan Sami · demo data, no real store connected</p>
        </div>
      </footer>
    </div>
  );
}
