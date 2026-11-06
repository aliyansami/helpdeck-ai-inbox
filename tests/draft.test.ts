import { describe, expect, it } from "vitest";
import { ground } from "@/lib/ai/grounding";
import { mockDraft } from "@/lib/ai/mock";
import { bm25 } from "@/lib/ai/retrieve";
import { buildSeed } from "@/lib/seed";
import { contextFor, NOW } from "./helpers";

describe("retrieval", () => {
  const { articles } = buildSeed(NOW);

  it("ranks the shipping article first for a shipping question", () => {
    expect(bm25("Do you ship to Ireland? How much is delivery?", articles)[0].article.id).toBe("a-shipping");
  });

  it("never returns draft (unpublished) articles", () => {
    const ids = bm25("change my delivery address", articles).map((s) => s.article.id);
    expect(ids).not.toContain("a-address");
  });
});

describe("draft grounding", () => {
  it("grounds a late-delivery reply on tracking and the late-delivery policy", () => {
    const draft = mockDraft(contextFor("t-9931"));
    expect(draft.topic).toBe("delivery_delay");
    expect(draft.sources.map((s) => s.id)).toEqual(expect.arrayContaining(["48213", "a-late"]));
    expect(draft.sources[0]).toMatchObject({ kind: "tracking", title: "Courier tracking API" });
    expect(draft.body).toContain("#48213");
    expect(draft.body).toContain("Leeds depot");
    expect(draft.body).toMatch(/replacement by next-day delivery/);
    expect(draft.confidence).toBe("high");
    expect(draft.needsAgent).toBe(false);
  });

  it("quotes facts from the article it cites", () => {
    const draft = mockDraft(contextFor("t-9927"));
    expect(draft.sources.map((s) => s.id)).toContain("a-shipping");
    expect(draft.body).toContain("€6.95");
  });

  it("answers from the top article for questions without a template", () => {
    const draft = mockDraft(contextFor("t-9927", { text: "How long does delivery to Spain and the EU take?", subject: "EU delivery" }));
    expect(draft.sources[0].id).toBe("a-shipping");
    expect(draft.body).toContain("4-7 working days");
    expect(draft.body).toContain("€9.95");
  });

  it("refuses to guess when no article covers the question", () => {
    const draft = mockDraft(contextFor("t-9927", { text: "Do you price match other shops?", subject: "Price match" }));
    expect(draft.confidence).toBe("low");
    expect(draft.needsAgent).toBe(true);
    expect(draft.sources).toEqual([]);
    expect(draft.gap).toBe(true);
    expect(draft.body).toMatch(/checking this with the team/);
  });

  it("sends refunds and double charges to a person even when covered", () => {
    const draft = mockDraft(contextFor("t-9928"));
    expect(draft.topic).toBe("billing");
    expect(draft.needsAgent).toBe(true);
    expect(draft.sources.map((s) => s.id)).toContain("a-replace");
    expect(draft.body).not.toMatch(/refunded|have refunded/i);
  });

  it("uses internal notes as sources but keeps their wording out of the reply", () => {
    const ctx = contextFor("t-9928");
    const g = ground(ctx);
    expect(g.articles.some((a) => a.article.kind === "internal")).toBe(true);
    expect(mockDraft(ctx).body).not.toContain("finance queue");
  });

  it("is deterministic, and regenerate changes the wording", () => {
    const a = mockDraft(contextFor("t-9931"));
    const b = mockDraft(contextFor("t-9931"));
    const c = mockDraft({ ...contextFor("t-9931"), attempt: 1 });
    expect(a.body).toBe(b.body);
    expect(c.body).not.toBe(a.body);
    expect(c.sources).toEqual(a.sources);
  });
});

describe("regenerate", () => {
  it.each(["t-9930", "t-9929", "t-9925", "t-9928"])("changes the wording of %s but keeps its sources", (id) => {
    const a = mockDraft(contextFor(id));
    const b = mockDraft({ ...contextFor(id), attempt: 1 });
    expect(b.body).not.toBe(a.body);
    expect(b.body).toMatch(/^Hi \w+, thanks for getting in touch\. [A-Z]/);
    expect(b.sources).toEqual(a.sources);
  });
});
