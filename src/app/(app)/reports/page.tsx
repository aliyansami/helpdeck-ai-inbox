import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Avatar, Card, cx, Td, Th } from "@/components/ui";
import { duration } from "@/lib/format";
import { buildReport } from "@/lib/reports";
import { getStore } from "@/lib/store";

const RANGES = [7, 21, 30];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number, unit = "") => `${x >= 0 ? "+" : "−"}${Math.abs(x)}${unit}`;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 21;
  const store = await getStore();
  const since = new Date(Date.now() - (2 * days + 1) * 86_400_000).toISOString();
  const [history, agents] = await Promise.all([store.history(since), store.agents()]);
  const r = buildReport(history, agents, days);
  const maxDay = Math.max(1, ...r.perDay.map((d) => d.fromDraft + d.agent));
  const maxTopic = Math.max(0.01, ...r.topics.map((t) => t.share));

  const kpis = [
    { label: "Tickets resolved", value: r.resolved.toLocaleString("en-US"), note: `${signed(Math.round(r.resolvedChange * 100), "%")} vs previous period`, good: r.resolvedChange >= 0 },
    { label: "Median first reply", value: duration(r.medianReply).replace(" ", ""), note: `was ${duration(r.previousMedianReply)} previous period`, good: r.medianReply <= r.previousMedianReply },
    { label: "Drafts sent with no edits", value: pct(r.noEdit), note: `${signed(Math.round(r.noEditChange * 100))} pts`, good: r.noEditChange >= 0 },
    { label: "Customer rating", value: `${r.rating.toFixed(1)} / 5`, note: `from ${r.ratings} ratings`, good: null },
  ];

  return (
    <>
      <PageHeader title="Reports">
        <details className="relative">
          <summary className="flex h-[38px] cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm font-bold">
            Last {days} days <span className="text-[10px]">▼</span>
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-line bg-white py-1 shadow-lg">
            {RANGES.map((d) => (
              <Link key={d} href={`/reports?range=${d}`} className={cx("block px-3 py-1.5 text-sm hover:bg-gray-50", d === days && "font-bold")}>Last {d} days</Link>
            ))}
          </div>
        </details>
        <a href={`/api/reports/export?range=${days}`} className="flex h-[38px] items-center rounded-lg border border-line bg-white px-4 text-sm font-bold hover:bg-gray-50">Export CSV</a>
      </PageHeader>

      <div className="space-y-5 p-8">
        <div className="grid grid-cols-4 gap-5">
          {kpis.map((k) => (
            <Card key={k.label} className="px-6 py-5">
              <p className="text-sm text-gray-400">{k.label}</p>
              <p className="mt-1 text-[38px] font-bold leading-tight tracking-tight">{k.value}</p>
              <p className={cx("text-[13px] font-bold", k.good === null ? "text-gray-600" : k.good ? "text-emerald-700" : "text-red-600")}>{k.note}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_488px] gap-5">
          <Card className="px-6 py-5">
            <div className="flex items-center">
              <p className="text-[17px] font-bold">Tickets per day</p>
              <div className="ml-auto flex gap-4 text-[13px] text-gray-400">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange" />Sent from AI draft</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#C3CADB]" />Written by agent</span>
              </div>
            </div>
            <div className="mt-6 flex h-[245px] items-end gap-[9px]" role="img" aria-label="Tickets per day, stacked by AI draft and agent-written">
              {r.perDay.map((d) => (
                <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.fromDraft} from AI draft, ${d.agent} by agent`}>
                  <div className="bg-[#C3CADB]" style={{ height: `${(d.agent / maxDay) * 100}%` }} />
                  <div className="bg-orange" style={{ height: `${(d.fromDraft / maxDay) * 100}%` }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="px-6 py-5">
            <p className="text-[17px] font-bold">What customers ask about</p>
            <ul className="mt-3 space-y-[18px]">
              {r.topics.map((t) => (
                <li key={t.topic}>
                  <div className="flex justify-between text-[15px]"><span>{t.topic}</span><span className="font-bold">{pct(t.share)}</span></div>
                  <div className="mt-1.5 h-[7px] rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${(t.share / maxTopic) * 93}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <p className="px-6 pb-3 pt-5 text-[17px] font-bold">Team</p>
          <table className="w-full">
            <thead className="border-y border-line bg-gray-50/60">
              <tr><Th>Agent</Th><Th>Resolved</Th><Th>Median reply</Th><Th>Rating</Th></tr>
            </thead>
            <tbody>
              {r.team.map((t) => (
                <tr key={t.agent.id} className="border-b border-line last:border-0">
                  <Td className="py-4"><span className="flex items-center gap-2.5 font-bold"><Avatar name={t.agent.name} color={t.agent.color} size={28} />{t.agent.name}</span></Td>
                  <Td className="text-gray-700">{t.resolved}</Td>
                  <Td className="text-gray-700">{duration(t.medianReply)}</Td>
                  <Td className="text-gray-700">{pct(t.satisfaction)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
