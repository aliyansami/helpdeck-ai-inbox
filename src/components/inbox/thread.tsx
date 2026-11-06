import { Avatar, cx } from "@/components/ui";
import { clock } from "@/lib/format";
import type { Agent, Channel, Customer, Draft, Message } from "@/lib/types";

function dayLabel(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function checkedLine(draft: Draft) {
  const order = draft.sources.find((s) => s.kind === "tracking" || s.kind === "order");
  const articles = draft.sources.filter((s) => s.kind === "article").length;
  const parts = [
    order && (order.kind === "tracking" ? `tracking for #${order.id}` : `order #${order.id}`),
    articles && `${articles} help article${articles > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return parts.length ? `Helpdeck checked ${parts.join(" and ")}` : "Helpdeck found no help article for this question";
}

export function Thread({ messages, customer, agents, draft, channel }: { messages: Message[]; customer: Customer; agents: Agent[]; draft?: Draft; channel: Channel }) {
  const lastCustomer = messages.findLastIndex((m) => m.author === "customer");
  const color = (m: Message) =>
    m.author === "customer" ? customer.color : m.author === "ai" ? "#F26B3A" : agents.find((a) => a.name === m.authorName)?.color ?? "#2F80ED";
  return (
    <ol className="space-y-6">
      {messages.map((m, i) => (
        <li key={m.id}>
          <div className="flex gap-3">
            <Avatar name={m.author === "ai" ? "Helpdeck" : m.authorName} color={color(m)} />
            <div className={cx(
              "max-w-[495px] flex-1 rounded-xl border px-[18px] py-4 text-[15px] leading-6",
              m.author === "customer" && "border-line bg-gray-50 text-gray-800",
              m.author === "note" && "border-amber-300 bg-amber-50 text-amber-900",
              (m.author === "agent" || m.author === "ai") && "border-line bg-white text-gray-800",
            )}>
              {m.author === "note" && <p className="font-bold">Internal note · {m.authorName}</p>}
              {(m.author === "agent" || m.author === "ai") && (
                <p className="mb-1 text-[13px] font-bold text-gray-500">{m.author === "ai" ? "Helpdeck AI · sent automatically" : m.authorName}</p>
              )}
              <p className="whitespace-pre-line">{m.body}</p>
              <p className={cx("mt-2 text-xs", m.author === "note" ? "text-amber-800/80" : "text-gray-400")}>
                {dayLabel(m.at)} {clock(m.at)} · {m.author === "note" ? "only visible to the team" : m.author === "customer" ? channel : "sent"}
              </p>
            </div>
          </div>
          {draft && i === lastCustomer && <p className="mt-6 text-center text-[13px] text-gray-500">— {checkedLine(draft)} —</p>}
        </li>
      ))}
    </ol>
  );
}
