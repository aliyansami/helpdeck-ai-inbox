import { notFound } from "next/navigation";
import { RuleEditor } from "@/components/automations/rule-editor";
import { PageHeader } from "@/components/page-header";
import { getStore } from "@/lib/store";

export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const [rules, agents, workspace] = await Promise.all([store.rules(), store.agents(), store.workspace()]);
  const rule = id === "new" ? undefined : rules.find((r) => r.id === id);
  if (id !== "new" && !rule) notFound();
  return (
    <>
      <PageHeader title={rule ? "Edit rule" : "New rule"} />
      <div className="p-8"><RuleEditor rule={rule} agents={agents} guardrails={workspace.guardrails} /></div>
    </>
  );
}
