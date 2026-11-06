import Link from "next/link";
import { GuardrailsButton } from "@/components/automations/guardrails";
import { RuleToggle } from "@/components/automations/rule-toggle";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, cx, LinkButton, Td, Th } from "@/components/ui";
import { describeActions, describeConditions, TRIGGER_LABEL } from "@/lib/automations";
import { clock, relativeLong, shortDate } from "@/lib/format";
import { getStore } from "@/lib/store";

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "all" } = await searchParams;
  const store = await getStore();
  const [rules, activity, workspace, agents] = await Promise.all([store.rules(), store.activity(8), store.workspace(), store.agents()]);
  const active = rules.filter((r) => r.enabled);
  const shown = tab === "active" ? active : tab === "paused" ? rules.filter((r) => !r.enabled) : rules;
  const tabs = [
    { key: "all", label: `All rules ${rules.length}` },
    { key: "active", label: `Active ${active.length}` },
    { key: "paused", label: `Paused ${rules.length - active.length}` },
  ];
  const g = workspace.guardrails;
  const guarded = [g.refunds && "refunds", g.cancellations && "cancellations", g.lowConfidence && "anything with Low confidence"].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="Automations">
        <LinkButton href="/automations/new" variant="primary">+ New rule</LinkButton>
      </PageHeader>
      <div className="space-y-4 p-8">
        <div className="flex gap-2">
          {tabs.map((t) => (
            <Link key={t.key} href={t.key === "all" ? "/automations" : `/automations?tab=${t.key}`}
              className={cx("rounded-lg border px-4 py-2 text-sm font-bold", tab === t.key ? "border-navy bg-navy text-white" : "border-line bg-white hover:bg-gray-50")}>
              {t.label}
            </Link>
          ))}
        </div>

        {shown.map((r) => (
          <Card key={r.id} className="flex items-start gap-4 px-6 py-5">
            <RuleToggle id={r.id} enabled={r.enabled} name={r.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <Link href={`/automations/${r.id}`} className="text-[17px] font-bold hover:underline">{r.name}</Link>
                <span className="ml-auto shrink-0 text-[13px] text-gray-400">
                  {r.enabled
                    ? `Ran ${r.runs} times${r.lastRunAt ? ` · last ${relativeLong(r.lastRunAt)}` : ""}`
                    : `Paused${r.pausedBy ? ` by ${r.pausedBy}` : ""}${r.pausedAt ? ` · ${shortDate(r.pausedAt)}` : ""}`}
                </span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[15px] text-gray-700">
                <Badge tone="blue">WHEN</Badge> {TRIGGER_LABEL[r.trigger]}
                {r.conditions.length > 0 && <><Badge tone="yellow">IF</Badge> {describeConditions(r.conditions)}</>}
                <Badge tone="orange">THEN</Badge> {describeActions(r.actions, agents)}
              </p>
            </div>
          </Card>
        ))}
        {shown.length === 0 && <Card className="p-8 text-center text-sm text-muted">No rules here.</Card>}

        <Card className="flex items-center gap-3 px-6 py-5">
          <span aria-hidden className="text-lg">🛡️</span>
          <p className="flex-1 text-[15px] text-gray-700">
            <strong className="text-ink">Guardrail:</strong>{" "}
            {guarded.length ? `${guarded.join(", ").replace(/, ([^,]*)$/, " and $1")} always go to a person, whatever the rules say.` : "none. Rules can auto-send anything."}
          </p>
          <GuardrailsButton guardrails={g} />
        </Card>

        <Card className="overflow-hidden">
          <p className="px-6 pb-3 pt-5 text-[17px] font-bold">Recent activity</p>
          <table className="w-full">
            <thead className="border-y border-line bg-gray-50/60">
              <tr><Th className="w-28">Time</Th><Th>Rule</Th><Th>Ticket</Th><Th>Result</Th></tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <Td className="text-gray-700">{clock(a.at)}</Td>
                  <Td className="font-bold">{a.ruleName}</Td>
                  <Td className="text-gray-700">{a.ticket}</Td>
                  <Td><Badge tone={a.tone === "success" ? "green" : a.tone === "warning" ? "orange" : "grey"}>{a.result}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
