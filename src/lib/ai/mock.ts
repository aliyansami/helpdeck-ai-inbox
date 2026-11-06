import type { Draft, Order, Tone } from "../types";
import { tokenize } from "./retrieve";
import { confidenceFor, type DraftContext, ground, type Grounding, needsAgentFor, sourcesFor } from "./grounding";

const DAY = 86_400_000;
const weekday = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

function relativeDay(target: Date, now: Date): string {
  const days = Math.round(
    (Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / DAY,
  );
  if (days === 0) return "today";
  if (days === 1) return `tomorrow (${weekday(target)})`;
  return `on ${weekday(target)}`;
}

/** Anonymous chat visitors are greeted as "there". */
export const firstName = (name: string) => (/^website visitor$/i.test(name) ? "there" : name.split(" ")[0]);

const OPENERS: Record<Tone, ((name: string) => string)[]> = {
  friendly: [(n) => `Hi ${n}, sorry about the wait.`, (n) => `Hi ${n}, thanks for flagging this.`],
  concise: [(n) => `Hi ${n},`, (n) => `Hi ${n}, thanks.`],
  formal: [(n) => `Dear ${n}, thank you for getting in touch.`, (n) => `Dear ${n}, thank you for your message.`],
};

// Openers for replies that carry their own apology or thanks.
const PLAIN_OPENERS: Record<Tone, ((name: string) => string)[]> = {
  friendly: [(n) => `Hi ${n},`, (n) => `Hi ${n}, thanks for getting in touch.`],
  concise: [(n) => `Hi ${n},`, (n) => `${n},`],
  formal: [(n) => `Dear ${n},`, (n) => `Dear ${n}, thank you for your message.`],
};

const SIGNOFF: Record<Tone, (agent: string) => string> = {
  friendly: (a) => a,
  concise: (a) => a,
  formal: (a) => `Kind regards,\n${a}`,
};

function opener(tone: Tone, attempt: number, name: string, apology = true) {
  const list = (apology ? OPENERS : PLAIN_OPENERS)[tone];
  return list[attempt % list.length](name);
}

/** Templates continue the opener in lower case; capitalise when the opener ended a sentence. */
const fixCase = (text: string) => text.replace(/^([^\n]*?[.!] )([a-z])/, (_, a: string, b: string) => a + b.toUpperCase());

function lastDoneEvent(order: Order) {
  return [...order.events].reverse().find((e) => e.done);
}

function body(ctx: DraftContext, g: Grounding): { text: string; checks: string[] } {
  const first = firstName(ctx.customer.name);
  const o = ctx.order;
  const t = ctx.tone;
  const n = ctx.attempt;
  switch (g.topic) {
    case "delivery_delay":
    case "where_is_my_order": {
      if (!o) break;
      const last = lastDoneEvent(o);
      const expected = o.expectedDelivery ? new Date(o.expectedDelivery) : undefined;
      const lastLine = last
        ? `the courier scanned it ${last.label.toLowerCase().startsWith("at ") ? last.label.replace(/^At/, "at the") : `as "${last.label.toLowerCase()}"`} on ${weekday(last.at)}`
        : "it's with the courier";
      const when = expected ? ` and it's due out for delivery ${relativeDay(expected, ctx.now)}` : "";
      if (g.topic === "where_is_my_order" || o.status === "out_for_delivery") {
        return {
          text: `${opener(t, n, first, false)} I've checked order #${o.id}: it's out for delivery with ${o.carrier} ${expected ? relativeDay(expected, ctx.now) : "today"}. You'll get a text from the driver with a one-hour window.`,
          checks: ["Checked live tracking", "Kept to your brand tone"],
        };
      }
      const deadlineDate = expected ? new Date(expected.getTime() + DAY) : undefined;
      const deadline = deadlineDate ? weekday(deadlineDate) : "the end of the week";
      // Only promise "before the weekend" when the fallback date is Mon-Thu.
      const beforeWeekend = deadlineDate && deadlineDate.getUTCDay() >= 1 && deadlineDate.getUTCDay() <= 4;
      const offer = t === "concise"
        ? `Not there by ${deadline}? Reply and we'll send a replacement by next-day delivery.`
        : `If it hasn't arrived by ${deadline}, reply here and I'll send a replacement by next-day delivery${beforeWeekend ? " so it's there before the weekend" : ""}.`;
      return {
        text: `${opener(t, n, first)} I've checked order #${o.id}: ${lastLine}${when}.\n\n${offer}`,
        checks: ["Checked live tracking", "Matched the late-delivery policy", "Offered a replacement, not a refund", "Kept to your brand tone"],
      };
    }
    case "exchange":
      if (!o) break;
      return {
        text: `${opener(t, n, first, false)} sorry we sent the wrong size. I can swap order #${o.id} for a medium: I'll email you a free return label now, and we'll send the medium out as soon as the return is scanned. No need to wait for it to reach us.`,
        checks: ["Checked the order items", "Matched the exchange policy", "Kept to your brand tone"],
      };
    case "promo":
      if (!/save15/i.test(g.question)) return answerFromArticle(ctx, g);
      return {
        text: `${opener(t, n, first, false)} SAVE15 ended on the last day of last month, which is why checkout won't accept it. Codes also can't be used on sale items or gift cards. I'm sorry for the confusion. If you spot a current code that fails, clear your basket and add the items again.`,
        checks: ["Matched the discount code policy", "Didn't promise a new code"],
      };
    case "pre_sale":
      if (!/ireland/i.test(g.question)) return answerFromArticle(ctx, g);
      return {
        text: `${opener(t, n, first, false)} yes, we ship to Ireland in 3–5 working days. Delivery is free over €60, otherwise it's €6.95.`,
        checks: ["Matched the shipping policy", "Kept to your brand tone"],
      };
    case "cancellation":
      if (!o) break;
      return {
        text: `${opener(t, n, first, false)} order #${o.id} hasn't been dispatched yet, so it can be cancelled free of charge. I've asked the team to confirm the cancellation and you'll get an email as soon as it's done. You're welcome to place a new order with the right scent in the meantime.`,
        checks: ["Checked the order hasn't shipped", "Matched the cancellation policy", "Left the final cancellation to an agent"],
      };
    case "damage":
      if (!o) break;
      return {
        text: `${opener(t, n, first, false)} I'm sorry the carafe set arrived damaged. Could you reply with a photo of the cracked glass and the box? As soon as we have it, we'll send a replacement straight away, and you don't need to send the damaged one back.`,
        checks: ["Matched the damaged-items policy", "Asked for a photo before replacing"],
      };
    case "billing":
    case "refund":
      return {
        text: `${opener(t, n, first, false)} I'm sorry about the ${o?.charges && o.charges > 1 ? "duplicate charge" : "trouble"}${o ? ` on order #${o.id}` : ""}. I've passed this to our finance team, who handle refunds for duplicate charges. Once they approve it, the money goes back to your original payment method within 3–5 working days.`,
        checks: ["Checked the payment record", "Matched the refund policy", "Didn't promise a refund date"],
      };
  }
  if (g.covered) return answerFromArticle(ctx, g);
  return {
    text: `${opener(t, n, first, false)} thanks for your message. I want to make sure you get the right answer, so I'm checking this with the team and will come back to you today.`,
    checks: ["No help article covers this, so the draft doesn't guess"],
  };
}

/** Generic grounded answer: the sentences of the top article that best overlap the question. */
export function answerFromArticle(ctx: DraftContext, g: Grounding): { text: string; checks: string[] } {
  const first = firstName(ctx.customer.name);
  const top = g.articles.find((a) => a.article.kind === "help")?.article;
  if (!top) return { text: `Hi ${first}, thanks for your message. I'm checking this with the team and will come back to you today.`, checks: [] };
  const q = new Set(tokenize(g.question));
  const sentences = top.body.split(/(?<=[.!?])\s+/);
  const best = sentences
    .map((s, i) => ({ s: s.trim(), i, score: tokenize(s).filter((w) => q.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 2)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  return {
    text: `${opener(ctx.tone, ctx.attempt, first, false)}\n\n${best.join(" ")}`,
    checks: [`Answered from "${top.title}"`],
  };
}

/** Deterministic draft built from templates and the retrieved sources. Used when no OpenAI key is set. */
export function mockDraft(ctx: DraftContext): Draft {
  const g = ground(ctx);
  const confidence = confidenceFor(g);
  const { needsAgent, reason } = needsAgentFor(g, confidence);
  const { text, checks } = body(ctx, g.covered ? g : { ...g, topic: "other" });
  return {
    body: `${fixCase(text)}\n\n${SIGNOFF[ctx.tone](ctx.agentName.split(" ")[0])}`,
    confidence,
    topic: g.topic,
    sources: g.covered ? sourcesFor(ctx, g) : [],
    checks,
    tone: ctx.tone,
    needsAgent,
    reason,
    gap: g.articles.length === 0 && !g.covered,
    provider: "mock",
    attempt: ctx.attempt,
    generatedAt: ctx.now.toISOString(),
  };
}
