import { describe, expect, it } from "vitest";
import { describeConditions, evaluateRules, type RuleEvent } from "@/lib/automations";
import { buildSeed } from "@/lib/seed";
import type { Rule } from "@/lib/types";

const seed = buildSeed(new Date("2026-11-05T10:00:00Z"));
const guardrails = { refunds: true, cancellations: true, lowConfidence: true };
const event = (over: Partial<RuleEvent>): RuleEvent => ({
  trigger: "message_received", channel: "email", text: "", tags: [], lifetimeSpend: 0, attachments: 0,
  now: new Date("2026-11-05T10:00:00Z"), ...over,
});

describe("automation matching", () => {
  it("auto-tags refund requests", () => {
    const out = evaluateRules(seed.rules, event({ text: "Can I get my money back for this?" }), guardrails);
    expect(out.tags).toContain("Refund");
    expect(out.matches.map((m) => m.rule.id)).toContain("r-refund-tag");
  });

  it("matches keywords case-insensitively and requires every condition", () => {
    const rule = seed.rules.find((r) => r.id === "r-double")!;
    expect(evaluateRules([rule], event({ text: "I was CHARGED TWICE", tags: ["Billing"] }), guardrails).queue).toBe("Finance");
    expect(evaluateRules([rule], event({ text: "I was charged twice", tags: [] }), guardrails).matches).toHaveLength(0);
  });

  it("lets later rules see tags added by earlier rules", () => {
    const tagger: Rule = { id: "t", name: "Tag billing", enabled: true, trigger: "message_received", conditions: [{ type: "keywords", any: ["invoice"] }], actions: [{ type: "add_tag", tag: "Billing" }], runs: 0 };
    const escalate: Rule = { id: "e", name: "Escalate billing", enabled: true, trigger: "message_received", conditions: [{ type: "tag", tag: "billing" }], actions: [{ type: "set_queue", queue: "Finance" }], runs: 0 };
    expect(evaluateRules([tagger, escalate], event({ text: "Where's my invoice?" }), guardrails).queue).toBe("Finance");
  });

  it("ignores paused rules", () => {
    const weekend = seed.rules.find((r) => r.id === "r-weekend")!;
    const saturday = event({ trigger: "chat_received", channel: "chat", now: new Date("2026-11-07T10:00:00Z") });
    expect(evaluateRules([weekend], saturday, guardrails).replies).toHaveLength(0);
    expect(evaluateRules([{ ...weekend, enabled: true }], saturday, guardrails).replies).toHaveLength(1);
  });

  it("auto-sends confident order-status replies", () => {
    const out = evaluateRules(seed.rules, event({ text: "Where is my order?", topic: "where_is_my_order", confidence: "high" }), guardrails);
    expect(out.autoSend).toBe(true);
  });

  it("never auto-sends at medium confidence", () => {
    const out = evaluateRules(seed.rules, event({ text: "Where is my order?", topic: "where_is_my_order", confidence: "medium" }), guardrails);
    expect(out.autoSend).toBe(false);
  });

  it("guardrails block auto-send for refunds whatever the rules say", () => {
    const sendAll: Rule = { id: "all", name: "Send everything", enabled: true, trigger: "message_received", conditions: [], actions: [{ type: "auto_send" }], runs: 0 };
    const out = evaluateRules([sendAll, ...seed.rules], event({ text: "I want a refund", topic: "refund", confidence: "high" }), guardrails);
    expect(out.autoSend).toBe(false);
    expect(out.autoSendBlockedBy).toMatch(/refund/);
    expect(out.matches[0].result).toMatch(/^Skipped/);
  });

  it("VIP customers skip auto-send and go to Sara", () => {
    const out = evaluateRules(seed.rules, event({ trigger: "ticket_created", text: "Where is my order?", topic: "where_is_my_order", confidence: "high", lifetimeSpend: 750 }), guardrails, seed.agents);
    expect(out.autoSend).toBe(false);
    expect(out.assigneeId).toBe("sara");
  });

  it("describes conditions in plain English", () => {
    expect(describeConditions(seed.rules[0].conditions)).toBe("the AI confidence is High and the topic is “Where is my order?”");
  });
});
