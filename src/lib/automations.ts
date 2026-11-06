import { TOPIC_LABEL } from "./ai/topics";
import type { Action, Agent, Channel, Condition, Confidence, Guardrails, Rule, RuleTrigger, Topic } from "./types";

export interface RuleEvent {
  trigger: RuleTrigger;
  channel: Channel;
  text: string;
  tags: string[];
  topic?: Topic;
  confidence?: Confidence;
  lifetimeSpend: number;
  attachments: number;
  hoursSinceLastReply?: number;
  now: Date;
}

export interface RuleMatch {
  rule: Rule;
  result: string;
}

export interface RuleOutcome {
  matches: RuleMatch[];
  tags: string[];
  assigneeId?: string;
  priority?: "normal" | "urgent";
  queue?: string;
  autoSend: boolean;
  autoSendBlockedBy?: string;
  replies: string[];
  requestPhoto: boolean;
  followUp?: { closeAfterDays: number };
}

// A "new chat" also counts as a new message; a message on a brand-new ticket also counts as ticket_created.
function triggerFires(rule: RuleTrigger, event: RuleTrigger): boolean {
  if (rule === event) return true;
  if (rule === "message_received" && (event === "chat_received" || event === "ticket_created")) return true;
  if (rule === "ticket_created" && event === "chat_received") return true;
  return false;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function conditionMatches(c: Condition, e: RuleEvent, tags: string[]): boolean {
  switch (c.type) {
    case "keywords": {
      const text = e.text.toLowerCase();
      return c.any.some((k) => k.trim() && text.includes(k.trim().toLowerCase()));
    }
    case "tag":
      return tags.some((t) => t.toLowerCase() === c.tag.toLowerCase());
    case "topic":
      return e.topic === c.topic;
    case "confidence":
      return !!e.confidence && CONFIDENCE_RANK[e.confidence] >= CONFIDENCE_RANK[c.level];
    case "lifetime_spend_over":
      return e.lifetimeSpend > c.amount;
    case "weekend": {
      const d = e.now.getUTCDay();
      return d === 0 || d === 6;
    }
    case "no_reply_hours":
      return (e.hoursSinceLastReply ?? 0) >= c.hours;
    case "no_attachment":
      return e.attachments === 0;
    case "channel":
      return e.channel === c.channel;
  }
}

export function ruleMatches(rule: Rule, e: RuleEvent, tags: string[] = e.tags): boolean {
  return rule.enabled && triggerFires(rule.trigger, e.trigger) && rule.conditions.every((c) => conditionMatches(c, e, tags));
}

/** Topics/tags that the guardrails always keep away from auto-send. */
function guardrailBlock(e: RuleEvent, tags: string[], g: Guardrails): string | undefined {
  const has = (t: string) => tags.some((x) => x.toLowerCase() === t.toLowerCase());
  if (g.refunds && (e.topic === "refund" || e.topic === "billing" || has("Refund"))) return "Guardrail · refund";
  if (g.cancellations && (e.topic === "cancellation" || has("Cancellation"))) return "Guardrail · cancellation";
  if (g.lowConfidence && (!e.confidence || e.confidence === "low")) return "Guardrail · low confidence";
  return undefined;
}

/**
 * Run every enabled rule, in order, against an event. Rules see tags added by earlier rules.
 * Pure function: callers persist the outcome.
 */
export function evaluateRules(rules: Rule[], e: RuleEvent, guardrails: Guardrails, agents: Agent[] = []): RuleOutcome {
  const out: RuleOutcome = { matches: [], tags: [...e.tags], autoSend: false, replies: [], requestPhoto: false };
  let wantsAutoSend = false;
  let skipAutoSend = false;

  for (const rule of rules) {
    if (!ruleMatches(rule, e, out.tags)) continue;
    const results: string[] = [];
    for (const a of rule.actions) {
      switch (a.type) {
        case "add_tag":
          if (!out.tags.some((t) => t.toLowerCase() === a.tag.toLowerCase())) out.tags.push(a.tag);
          results.push(`Tagged ${a.tag}`);
          break;
        case "assign":
          out.assigneeId = a.agentId;
          results.push(`Assigned to ${agents.find((x) => x.id === a.agentId)?.name ?? a.agentId}`);
          break;
        case "set_priority":
          out.priority = a.priority;
          if (a.priority === "urgent") results.push("Marked Urgent");
          break;
        case "set_queue":
          out.queue = a.queue;
          results.push(`Escalated to ${a.queue}`);
          break;
        case "auto_send":
          wantsAutoSend = true;
          results.push("Sent");
          break;
        case "skip_auto_send":
          skipAutoSend = true;
          results.push("Auto-send skipped");
          break;
        case "reply":
          out.replies.push(a.text);
          results.push("Replied");
          break;
        case "follow_up":
          out.followUp = { closeAfterDays: a.closeAfterDays };
          results.push("Follow-up sent");
          break;
        case "request_photo":
          out.requestPhoto = true;
          results.push("Asked for a photo");
          break;
      }
    }
    out.matches.push({ rule, result: results.join(" · ") });
  }

  if (wantsAutoSend) {
    const blocked = skipAutoSend ? "VIP · skipped auto-send" : guardrailBlock(e, out.tags, guardrails);
    if (blocked) {
      out.autoSendBlockedBy = blocked;
      for (const m of out.matches) {
        if (m.rule.actions.some((a) => a.type === "auto_send")) m.result = `Skipped · ${blocked}`;
      }
    } else {
      out.autoSend = true;
    }
  }
  return out;
}

// ---- Plain-English descriptions for the UI ----

export const TRIGGER_LABEL: Record<RuleTrigger, string> = {
  message_received: "a new email arrives",
  ticket_created: "any ticket is created",
  chat_received: "a new chat arrives",
  waiting_on_customer: "a ticket is waiting on the customer",
};

export function describeConditions(conditions: Condition[]): string {
  if (conditions.length === 0) return "always";
  return conditions
    .map((c) => {
      switch (c.type) {
        case "keywords":
          return `the message mentions ${c.any.map((k) => `“${k}”`).join(" or ")}`;
        case "tag":
          return `the ticket is tagged ${c.tag}`;
        case "topic":
          return `the topic is “${TOPIC_LABEL[c.topic]}”`;
        case "confidence":
          return `the AI confidence is ${c.level[0].toUpperCase()}${c.level.slice(1)}`;
        case "lifetime_spend_over":
          return `lifetime spend is over $${c.amount}`;
        case "weekend":
          return "it's Saturday or Sunday";
        case "no_reply_hours":
          return `there's no reply for ${c.hours} hours`;
        case "no_attachment":
          return "no photo is attached";
        case "channel":
          return `the channel is ${c.channel}`;
      }
    })
    .join(" and ");
}

export function describeActions(actions: Action[], agents: Agent[] = []): string {
  const parts = actions.map((a) => {
    switch (a.type) {
      case "add_tag":
        return `tag it ${a.tag}`;
      case "assign":
        return `assign to ${agents.find((x) => x.id === a.agentId)?.name ?? a.agentId}`;
      case "set_priority":
        return `mark ${a.priority === "urgent" ? "Urgent" : "Normal"}`;
      case "set_queue":
        return `assign to ${a.queue} queue`;
      case "auto_send":
        return "send the AI draft without review";
      case "skip_auto_send":
        return "skip auto-send";
      case "reply":
        return `reply “${a.text.length > 48 ? a.text.slice(0, 46).trimEnd() + "…" : a.text}”`;
      case "follow_up":
        return `send a follow-up, then close after ${a.closeAfterDays} days`;
      case "request_photo":
        return "ask the customer for a photo of the item and box";
    }
  });
  return parts.join(" and ");
}
