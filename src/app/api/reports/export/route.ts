import { buildReport } from "@/lib/reports";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("range")) || 21));
  const store = await getStore();
  const since = new Date(Date.now() - (2 * days + 1) * 86_400_000).toISOString();
  const r = buildReport(await store.history(since), await store.agents(), days);
  const csv = ["date,sent_from_ai_draft,written_by_agent,total", ...r.perDay.map((d) => `${d.date},${d.fromDraft},${d.agent},${d.fromDraft + d.agent}`)].join("\n");
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="helpdeck-tickets-${days}d.csv"` },
  });
}
