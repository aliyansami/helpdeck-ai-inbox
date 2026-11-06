import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { modeLabel } from "@/lib/config";
import { inboxCounts } from "@/lib/service";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  const [counts, workspace, agents] = await Promise.all([inboxCounts(), store.workspace(), store.agents()]);
  const agent = agents.find((a) => a.id === workspace.currentAgentId)!;
  const mode = modeLabel();
  const modeText = mode === "Demo" ? "Demo mode · mock drafts" : mode === "Live" ? "Live · OpenAI + Postgres" : mode;
  return (
    <div className="flex min-h-screen flex-col bg-grey lg:flex-row">
      <Suspense>
        <Sidebar counts={counts} agent={agent} mode={modeText} />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
