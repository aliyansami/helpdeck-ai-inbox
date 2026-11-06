"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRuleAction, saveRuleAction } from "@/app/actions";
import { classifyTopic, TOPIC_LABEL } from "@/lib/ai/topics";
import { describeActions, describeConditions, evaluateRules, TRIGGER_LABEL } from "@/lib/automations";
import { Badge, Button, Card } from "@/components/ui";
import type { Action, Agent, Condition, Confidence, Guardrails, Rule, RuleTrigger, Topic } from "@/lib/types";

const input = "rounded-lg border border-line bg-white px-3 py-2 text-[15px] outline-none focus:border-orange";

const CONDITION_DEFAULTS: Record<Condition["type"], Condition> = {
  keywords: { type: "keywords", any: ["refund"] },
  tag: { type: "tag", tag: "Billing" },
  topic: { type: "topic", topic: "where_is_my_order" },
  confidence: { type: "confidence", level: "high" },
  lifetime_spend_over: { type: "lifetime_spend_over", amount: 500 },
  weekend: { type: "weekend" },
  no_reply_hours: { type: "no_reply_hours", hours: 48 },
  no_attachment: { type: "no_attachment" },
  channel: { type: "channel", channel: "chat" },
};
const CONDITION_LABEL: Record<Condition["type"], string> = {
  keywords: "Message mentions", tag: "Ticket is tagged", topic: "Topic is", confidence: "AI confidence at least",
  lifetime_spend_over: "Lifetime spend over", weekend: "It's the weekend", no_reply_hours: "No reply for",
  no_attachment: "No photo attached", channel: "Channel is",
};

const ACTION_DEFAULTS: Record<Action["type"], Action> = {
  add_tag: { type: "add_tag", tag: "Refund" },
  assign: { type: "assign", agentId: "sara" },
  set_priority: { type: "set_priority", priority: "urgent" },
  set_queue: { type: "set_queue", queue: "Finance" },
  auto_send: { type: "auto_send" },
  skip_auto_send: { type: "skip_auto_send" },
  reply: { type: "reply", text: "Thanks for getting in touch! We'll reply within one working day." },
  follow_up: { type: "follow_up", closeAfterDays: 5 },
  request_photo: { type: "request_photo" },
};
const ACTION_LABEL: Record<Action["type"], string> = {
  add_tag: "Add tag", assign: "Assign to", set_priority: "Set priority", set_queue: "Move to queue",
  auto_send: "Send AI draft without review", skip_auto_send: "Skip auto-send", reply: "Reply with",
  follow_up: "Follow up, then close after", request_photo: "Ask for a photo",
};

export function RuleEditor({ rule, agents, guardrails }: { rule?: Rule; agents: Agent[]; guardrails: Guardrails }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [name, setName] = useState(rule?.name ?? "");
  const [trigger, setTrigger] = useState<RuleTrigger>(rule?.trigger ?? "message_received");
  const [conditions, setConditions] = useState<Condition[]>(rule?.conditions ?? [CONDITION_DEFAULTS.keywords]);
  const [actions, setActions] = useState<Action[]>(rule?.actions ?? [ACTION_DEFAULTS.add_tag]);
  const [sample, setSample] = useState("Hi, I'd like a refund for my order please.");

  const draftRule: Rule = { id: rule?.id ?? "", name, enabled: true, trigger, conditions, actions, runs: rule?.runs ?? 0 };
  const topic = classifyTopic(sample);
  const test = evaluateRules([draftRule], {
    trigger, channel: trigger === "chat_received" ? "chat" : "email", text: sample, tags: topic === "other" ? [] : [TOPIC_LABEL[topic]],
    topic, confidence: "high", lifetimeSpend: 0, attachments: 0, hoursSinceLastReply: 72, now: new Date(),
  }, guardrails, agents);

  const setCondition = (i: number, c: Condition) => setConditions(conditions.map((x, j) => (j === i ? c : x)));
  const setAction = (i: number, a: Action) => setActions(actions.map((x, j) => (j === i ? a : x)));

  const save = () => start(async () => {
    try {
      setError(undefined);
      await saveRuleAction({ ...draftRule, enabled: rule?.enabled ?? true });
      router.push("/automations");
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <div className="grid max-w-6xl grid-cols-[minmax(0,1fr)_360px] gap-5">
      <Card className="space-y-6 p-6">
        <label className="block">
          <span className="text-sm font-bold">Rule name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} mt-1.5 w-full`} placeholder="e.g. Tag refund requests" />
        </label>

        <div>
          <Badge tone="blue">WHEN</Badge>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value as RuleTrigger)} className={`${input} mt-2 block w-full`}>
            {(Object.keys(TRIGGER_LABEL) as RuleTrigger[]).map((t) => <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>)}
          </select>
        </div>

        <div>
          <Badge tone="yellow">IF</Badge> <span className="text-sm text-muted">all of these are true</span>
          <ul className="mt-2 space-y-2">
            {conditions.map((c, i) => (
              <li key={i} className="flex gap-2">
                <select value={c.type} onChange={(e) => setCondition(i, CONDITION_DEFAULTS[e.target.value as Condition["type"]])} className={`${input} w-56`} aria-label="Condition">
                  {(Object.keys(CONDITION_LABEL) as Condition["type"][]).map((t) => <option key={t} value={t}>{CONDITION_LABEL[t]}</option>)}
                </select>
                <ConditionValue c={c} onChange={(v) => setCondition(i, v)} />
                <Button variant="ghost" onClick={() => setConditions(conditions.filter((_, j) => j !== i))} aria-label="Remove condition">✕</Button>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" onClick={() => setConditions([...conditions, CONDITION_DEFAULTS.keywords])}>+ Add condition</Button>
        </div>

        <div>
          <Badge tone="orange">THEN</Badge>
          <ul className="mt-2 space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2">
                <select value={a.type} onChange={(e) => setAction(i, ACTION_DEFAULTS[e.target.value as Action["type"]])} className={`${input} w-56`} aria-label="Action">
                  {(Object.keys(ACTION_LABEL) as Action["type"][]).map((t) => <option key={t} value={t}>{ACTION_LABEL[t]}</option>)}
                </select>
                <ActionValue a={a} agents={agents} onChange={(v) => setAction(i, v)} />
                <Button variant="ghost" onClick={() => setActions(actions.filter((_, j) => j !== i))} aria-label="Remove action">✕</Button>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" onClick={() => setActions([...actions, ACTION_DEFAULTS.add_tag])}>+ Add action</Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2.5 border-t border-line pt-5">
          <Button variant="primary" onClick={save} disabled={pending}>Save rule</Button>
          <Button onClick={() => router.push("/automations")}>Cancel</Button>
          {rule && <Button className="ml-auto text-red-600" disabled={pending} onClick={() => start(() => deleteRuleAction(rule.id))}>Delete rule</Button>}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Reads as</p>
          <p className="mt-2 text-[15px] leading-6 text-gray-700">
            When {TRIGGER_LABEL[trigger]}, if {describeConditions(conditions)}, then {describeActions(actions, agents) || "do nothing"}.
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-gray-400">Test this rule</p>
          <textarea value={sample} onChange={(e) => setSample(e.target.value)} rows={3} className={`${input} mt-2 w-full text-sm`} aria-label="Sample customer message" />
          <p className="mt-2 text-xs text-muted">Detected topic: {TOPIC_LABEL[topic]} · assumes High confidence, no attachments, 72h since last reply</p>
          <div className="mt-3">
            {test.matches.length ? (
              <Badge tone="green">Matches · {test.matches[0].result || "no visible effect"}</Badge>
            ) : (
              <Badge>Doesn&apos;t match</Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConditionValue({ c, onChange }: { c: Condition; onChange: (c: Condition) => void }) {
  switch (c.type) {
    case "keywords":
      return <input className={`${input} flex-1`} value={c.any.join(", ")} onChange={(e) => onChange({ ...c, any: e.target.value.split(",").map((s) => s.trimStart()) })} placeholder="refund, money back" aria-label="Keywords, comma separated" />;
    case "tag":
      return <input className={`${input} flex-1`} value={c.tag} onChange={(e) => onChange({ ...c, tag: e.target.value })} aria-label="Tag" />;
    case "topic":
      return (
        <select className={`${input} flex-1`} value={c.topic} onChange={(e) => onChange({ ...c, topic: e.target.value as Topic })} aria-label="Topic">
          {(Object.keys(TOPIC_LABEL) as Topic[]).map((t) => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}
        </select>
      );
    case "confidence":
      return (
        <select className={`${input} flex-1`} value={c.level} onChange={(e) => onChange({ ...c, level: e.target.value as Confidence })} aria-label="Confidence">
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      );
    case "lifetime_spend_over":
      return <input type="number" className={`${input} flex-1`} value={c.amount} onChange={(e) => onChange({ ...c, amount: Number(e.target.value) })} aria-label="Amount in dollars" />;
    case "no_reply_hours":
      return <input type="number" className={`${input} flex-1`} value={c.hours} onChange={(e) => onChange({ ...c, hours: Number(e.target.value) })} aria-label="Hours" />;
    case "channel":
      return (
        <select className={`${input} flex-1`} value={c.channel} onChange={(e) => onChange({ ...c, channel: e.target.value as "email" | "chat" })} aria-label="Channel">
          <option value="email">Email</option><option value="chat">Chat</option>
        </select>
      );
    default:
      return <span className="flex-1" />;
  }
}

function ActionValue({ a, agents, onChange }: { a: Action; agents: Agent[]; onChange: (a: Action) => void }) {
  switch (a.type) {
    case "add_tag":
      return <input className={`${input} flex-1`} value={a.tag} onChange={(e) => onChange({ ...a, tag: e.target.value })} aria-label="Tag" />;
    case "assign":
      return (
        <select className={`${input} flex-1`} value={a.agentId} onChange={(e) => onChange({ ...a, agentId: e.target.value })} aria-label="Agent">
          {agents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      );
    case "set_priority":
      return (
        <select className={`${input} flex-1`} value={a.priority} onChange={(e) => onChange({ ...a, priority: e.target.value as "normal" | "urgent" })} aria-label="Priority">
          <option value="urgent">Urgent</option><option value="normal">Normal</option>
        </select>
      );
    case "set_queue":
      return <input className={`${input} flex-1`} value={a.queue} onChange={(e) => onChange({ ...a, queue: e.target.value })} aria-label="Queue" />;
    case "reply":
      return <input className={`${input} flex-1`} value={a.text} onChange={(e) => onChange({ ...a, text: e.target.value })} aria-label="Reply text" />;
    case "follow_up":
      return <input type="number" className={`${input} flex-1`} value={a.closeAfterDays} onChange={(e) => onChange({ ...a, closeAfterDays: Number(e.target.value) })} aria-label="Days" />;
    default:
      return <span className="flex-1" />;
  }
}
