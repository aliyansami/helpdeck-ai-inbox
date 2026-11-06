import Link from "next/link";
import { ConversationActions } from "@/components/inbox/conversation-actions";
import { DraftPanel } from "@/components/inbox/draft-panel";
import { Thread } from "@/components/inbox/thread";
import { PageHeader } from "@/components/page-header";
import { Avatar, Badge, Card, cx, tagTone } from "@/components/ui";
import { clock, dayDate, money, monthYear, shortDate, timeAgo } from "@/lib/format";
import { conversationDetail, inboxCounts, type InboxView, listConversations } from "@/lib/service";
import type { Order } from "@/lib/types";

const VIEWS: InboxView[] = ["open", "waiting", "snoozed", "resolved", "mine", "drafts"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const view = (VIEWS.includes(sp.view as InboxView) ? sp.view : "open") as InboxView;
  const channel = sp.channel === "email" || sp.channel === "chat" ? sp.channel : undefined;
  const [counts, all] = await Promise.all([inboxCounts(), listConversations(view, sp.q)]);
  const list = channel ? all.filter((c) => c.channel === channel) : all;
  const selectedId = sp.c && list.some((c) => c.id === sp.c) ? sp.c : list[0]?.id;
  const detail = selectedId ? await conversationDetail(selectedId) : undefined;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view: view === "open" ? undefined : view, q: sp.q, channel, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/inbox?${s}` : "/inbox";
  };

  return (
    <>
      <PageHeader title="Inbox" defaultQuery={sp.q}>
        <details className="relative">
          <summary className="flex h-[38px] cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm font-bold">
            {channel ? `Filter: ${channel}` : "Filter"} <span className="text-[10px]">▼</span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-line bg-white py-1 shadow-lg">
            {[undefined, "email", "chat"].map((ch) => (
              <Link key={ch ?? "all"} href={qs({ channel: ch, c: undefined })} className={cx("block px-3 py-1.5 text-sm hover:bg-gray-50", ch === channel && "font-bold")}>
                {ch ? `${ch[0].toUpperCase()}${ch.slice(1)} only` : "All channels"}
              </Link>
            ))}
          </div>
        </details>
      </PageHeader>

      <div className="grid grid-cols-[370px_minmax(0,1fr)_290px] gap-5 p-8" style={{ height: "calc(100vh - 68px)" }}>
        {/* Conversation list */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex gap-2 border-b border-line p-[18px]">
            {(["open", "waiting", "snoozed"] as const).map((v) => (
              <Link key={v} href={v === "open" ? "/inbox" : `/inbox?view=${v}`}
                className={cx("rounded-lg border px-4 py-1.5 text-sm font-bold", view === v ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:bg-gray-50")}>
                {v[0].toUpperCase() + v.slice(1)} {counts[v]}
              </Link>
            ))}
          </div>
          {view !== "open" && view !== "waiting" && view !== "snoozed" && (
            <p className="border-b border-line bg-gray-50 px-5 py-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {view === "mine" ? "Assigned to me" : view === "drafts" ? "AI drafts ready" : "Resolved"}
            </p>
          )}
          {sp.q && <p className="border-b border-line px-5 py-2 text-sm text-muted">Results for “{sp.q}” · <Link href={qs({ q: undefined })} className="font-bold text-orange">clear</Link></p>}
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {list.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <Link href={qs({ c: c.id })} className={cx("flex gap-3 border-b border-line py-4 pl-[18px] pr-5", active ? "border-l-[3px] border-l-orange bg-orange-50 pl-[15px]" : "hover:bg-gray-50")}>
                    <Avatar name={c.customerName} color={c.customerColor} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[15px] font-bold">{c.customerName}</p>
                        <span className="text-[13px] text-gray-400">{timeAgo(c.updatedAt)}</span>
                      </div>
                      <p className="truncate text-sm text-gray-700">{c.subject}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.priority === "urgent" && <Badge tone="red">Urgent</Badge>}
                        {c.tags.filter((t) => t !== "Refund" || !c.tags.includes("Billing")).map((t) => <Badge key={t} tone={tagTone(t)}>{t}</Badge>)}
                        {c.status === "open" && (c.draft ? (c.draft.needsAgent ? <Badge>Needs agent</Badge> : <Badge tone="green">AI draft</Badge>) : <Badge>Drafting…</Badge>)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            {list.length === 0 && <li className="p-8 text-center text-sm text-muted">Nothing here.</li>}
          </ul>
        </Card>

        {/* Conversation */}
        {detail ? (
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
              <h2 className="min-w-0 truncate text-[17px] font-bold">{detail.conversation.subject}</h2>
              {detail.conversation.tags.slice(0, 1).map((t) => <Badge key={t} tone={tagTone(t)}>{t}</Badge>)}
              {detail.conversation.queue && <Badge tone="red">{detail.conversation.queue} queue</Badge>}
              <div className="ml-auto">
                <ConversationActions
                  id={detail.conversation.id}
                  status={detail.conversation.status}
                  assigneeId={detail.conversation.assigneeId}
                  agents={detail.agents.map((a) => ({ id: a.id, name: a.name }))}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <Thread messages={detail.messages} customer={detail.customer} agents={detail.agents} draft={detail.conversation.draft} channel={detail.conversation.channel} />
            </div>
            {detail.conversation.status !== "resolved" && (
              <div className="px-6 pb-6">
                <DraftPanel key={`${detail.conversation.id}:${detail.conversation.draft?.generatedAt ?? "none"}`} conversationId={detail.conversation.id} draft={detail.conversation.draft} status={detail.conversation.status} />
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex items-center justify-center text-sm text-muted">Select a conversation</Card>
        )}

        {/* Customer context */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          {detail && (
            <>
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={detail.customer.name} color={detail.customer.color} />
                  <div className="min-w-0 leading-tight">
                    <p className="text-[17px] font-bold">{detail.customer.name}</p>
                    <p className="truncate text-sm text-muted">{detail.customer.email}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-[15px]">
                  <div className="flex justify-between"><dt className="text-gray-700">Customer since</dt><dd className="font-bold">{monthYear(detail.customer.since)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-700">Orders</dt><dd className="font-bold">{detail.orderCount}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-700">Lifetime spend</dt><dd className="font-bold">{money(detail.lifetimeSpend)}</dd></div>
                </dl>
              </Card>
              {detail.order && <OrderCard order={detail.order} />}
              <Card className="p-5">
                <p className="text-[16px] font-bold">Sources used</p>
                {detail.conversation.draft?.sources.length ? (
                  <ul className="mt-3 space-y-2.5 text-[15px] text-gray-800">
                    {detail.conversation.draft.sources.map((s) => (
                      <li key={`${s.kind}-${s.id}`} className="flex items-center gap-2">
                        <span aria-hidden>{s.kind === "tracking" || s.kind === "order" ? "📦" : s.kind === "note" ? "🔒" : "📄"}</span>
                        {s.kind === "article" || s.kind === "note" ? <Link href={`/knowledge/${s.id}`} className="hover:underline">{s.title}</Link> : s.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">{detail.conversation.draft ? "No article covers this question, so the draft doesn't cite one." : "Sources appear with the next AI draft."}</p>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const upcoming = order.events.find((e) => !e.done);
  return (
    <Card className="p-5">
      <p className="text-[16px] font-bold">Order #{order.id}</p>
      <p className="text-sm text-muted">Placed {shortDate(order.placedAt)} · {money(order.total, order.currency)}</p>
      <ul className="mt-3 space-y-3">
        {order.events.length === 0 && (
          <li className="text-sm text-gray-700">{order.status === "processing" ? "Not dispatched yet" : order.status.replace(/_/g, " ")}{order.discountCode && ` · code ${order.discountCode}`}</li>
        )}
        {order.events.map((e) => (
          <li key={e.label} className="flex gap-2.5">
            <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", e.done ? "bg-emerald-700" : "border-2 border-orange bg-white")} />
            <div className="leading-tight">
              <p className="text-[15px] font-bold">{e.label}</p>
              <p className="text-[13px] text-gray-400">
                {e === upcoming ? `Expected ${dayDate(e.at)}` : e.label === "Dispatched" ? `${shortDate(e.at)} · ${e.detail}` : `${dayDate(e.at)}, ${clock(e.at)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {(order.charges ?? 0) > 1 && <p className="mt-3 rounded-md bg-red-50 px-2.5 py-1.5 text-[13px] font-bold text-red-700">Card charged {order.charges} times</p>}
    </Card>
  );
}
