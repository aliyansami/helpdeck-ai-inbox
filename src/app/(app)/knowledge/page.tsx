import Link from "next/link";
import { draftGapArticlesAction } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, LinkButton, Td, Th } from "@/components/ui";
import { relativeLong } from "@/lib/format";
import { getStore } from "@/lib/store";
import type { Article } from "@/lib/types";

function lastUpdate(a: Article) {
  if (a.status === "draft") return "Draft · not published";
  if (a.updatedBy) return `Edited by ${a.updatedBy} · ${relativeLong(a.updatedAt)}`;
  return `Synced ${relativeLong(a.updatedAt)}`;
}

export default async function KnowledgePage() {
  const store = await getStore();
  const [articles, gaps, workspace] = await Promise.all([store.articles(), store.gaps(), store.workspace()]);
  const help = articles.filter((a) => a.kind === "help");
  const notes = articles.filter((a) => a.kind === "internal");
  const rows = [...articles].sort((a, b) => b.timesCited - a.timesCited);
  const gapTotal = gaps.reduce((s, g) => s + g.count, 0);

  const sources = [
    { icon: "📚", title: "Help center", sub: `${help.filter((a) => a.status === "published").length} articles · ${workspace.helpCenterUrl}`, status: "Synced" },
    { icon: "🛒", title: "Store orders", sub: "Live order and tracking lookups", status: "Connected" },
    { icon: "📝", title: "Internal notes", sub: `Policies only agents can see · ${notes.length} notes`, status: "Synced" },
  ];

  return (
    <>
      <PageHeader title="Knowledge">
        <LinkButton href="/knowledge/import" className="max-sm:hidden">+ Add source</LinkButton>
        <LinkButton href="/knowledge/new" variant="primary">New article</LinkButton>
      </PageHeader>
      <div className="space-y-5 p-4 sm:p-8">
        <p className="-mt-1 text-[15px] text-gray-700">Drafts are written only from these sources. If something isn&apos;t covered, Helpdeck hands the ticket to an agent instead of guessing.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {sources.map((s) => (
            <Card key={s.title} className="flex min-w-0 items-center gap-3.5 px-5 py-5" data-reveal>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl" aria-hidden>{s.icon}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[17px] font-bold">{s.title}</p>
                <p className="truncate text-sm text-gray-400">{s.sub}</p>
              </div>
              <Badge tone="green">{s.status}</Badge>
            </Card>
          ))}
        </div>

        {gaps.length > 0 && (
          <div data-reveal className="flex flex-wrap items-center gap-4 rounded-xl border border-orange/40 bg-orange-50 px-6 py-5">
            <span className="text-2xl" aria-hidden>💡</span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold">{gaps.length} question{gaps.length > 1 ? "s" : ""} came up {gapTotal} time{gapTotal > 1 ? "s" : ""} this week with no article</p>
              <p className="truncate text-sm text-gray-500">{gaps.slice(0, 4).map((g) => `“${g.question}”`).join(" · ")}</p>
            </div>
            <form action={draftGapArticlesAction}>
              <Button variant="primary">Draft articles</Button>
            </form>
          </div>
        )}

        <Card className="overflow-x-auto" data-reveal>
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line bg-gray-50/60">
              <tr><Th>Article</Th><Th>Category</Th><Th>Last update</Th><Th>Times cited</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} data-reveal-row className="border-b border-line transition-colors last:border-0 hover:bg-gray-50">
                  <Td className="font-bold"><Link href={`/knowledge/${a.id}`} className="hover:underline">{a.title}</Link></Td>
                  <Td><Badge>{a.category}</Badge></Td>
                  <Td className="text-gray-700">{lastUpdate(a)}</Td>
                  <Td className="text-gray-700">{a.timesCited}</Td>
                  <Td>
                    {a.status === "draft" ? <Badge tone="yellow">Draft</Badge> : a.kind === "internal" ? <Badge tone="blue">Agents only</Badge> : <Badge tone="green">Used by AI</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
