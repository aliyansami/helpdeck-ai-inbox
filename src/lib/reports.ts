import type { Agent, HistoryTicket } from "./types";

const DAY = 86_400_000;

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const noEditRate = (h: HistoryTicket[]) => (h.length ? h.filter((t) => t.fromDraft && !t.edited).length / h.length : 0);
const satisfied = (h: HistoryTicket[]) => {
  const rated = h.filter((t) => t.rating);
  return rated.length ? rated.filter((t) => t.rating! >= 4).length / rated.length : 0;
};

/** Everything the reports page shows, computed from resolved tickets in [now - days, now]. */
export function buildReport(history: HistoryTicket[], agents: Agent[], days: number, now = new Date()) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY;
  const start = end - days * DAY;
  const prevStart = start - days * DAY;
  const inRange = (t: HistoryTicket, a: number, b: number) => {
    const x = new Date(t.resolvedAt).getTime();
    return x >= a && x < b;
  };
  const current = history.filter((t) => inRange(t, start, end));
  const previous = history.filter((t) => inRange(t, prevStart, start));
  const rated = current.filter((t) => t.rating);

  const perDay = Array.from({ length: days }, (_, i) => {
    const a = start + i * DAY;
    const day = current.filter((t) => inRange(t, a, a + DAY));
    return { date: new Date(a).toISOString().slice(0, 10), fromDraft: day.filter((t) => t.fromDraft).length, agent: day.filter((t) => !t.fromDraft).length };
  });

  const topicCounts = new Map<string, number>();
  for (const t of current) topicCounts.set(t.topic, (topicCounts.get(t.topic) ?? 0) + 1);
  const topics = [...topicCounts.entries()]
    .map(([topic, n]) => ({ topic, share: current.length ? n / current.length : 0 }))
    .sort((a, b) => (a.topic === "Other" ? 1 : b.topic === "Other" ? -1 : b.share - a.share));

  const team = agents
    .map((a) => {
      const mine = current.filter((t) => t.agentId === a.id);
      return { agent: a, resolved: mine.length, medianReply: median(mine.map((t) => t.firstReplySeconds)), satisfaction: satisfied(mine) };
    })
    .sort((a, b) => b.resolved - a.resolved);

  return {
    resolved: current.length,
    resolvedChange: previous.length ? (current.length - previous.length) / previous.length : 0,
    medianReply: median(current.map((t) => t.firstReplySeconds)),
    previousMedianReply: median(previous.map((t) => t.firstReplySeconds)),
    noEdit: noEditRate(current),
    noEditChange: noEditRate(current) - noEditRate(previous),
    rating: rated.length ? rated.reduce((s, t) => s + t.rating!, 0) / rated.length : 0,
    ratings: rated.length,
    perDay,
    topics,
    team,
  };
}
