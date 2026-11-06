import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contextFor } from "./helpers";

// A local stand-in for the OpenAI API, so the real-mode code path runs without a key or network.
let server: Server;
let lastPrompt = "";
let reply: Record<string, unknown> = {};

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const json = JSON.parse(body);
      res.setHeader("content-type", "application/json");
      if (req.url?.endsWith("/embeddings")) {
        const inputs: string[] = Array.isArray(json.input) ? json.input : [json.input];
        res.end(JSON.stringify({ data: inputs.map((t, i) => ({ index: i, embedding: [t.length % 7, 1, 0.5] })) }));
      } else {
        lastPrompt = json.messages.map((m: { content: string }) => m.content).join("\n");
        res.end(JSON.stringify({ id: "x", object: "chat.completion", created: 0, model: json.model, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(reply) } }] }));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(() => {
  server.close();
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
});

describe("OpenAI drafting (stubbed API)", () => {
  it("sends only retrieved sources and the order, and keeps cited ids that exist", async () => {
    const { openaiDraft } = await import("@/lib/ai/openai");
    reply = { reply: "Hi Laura, it's at the Leeds depot.\n\nSara", used_source_ids: ["a-late", "made-up-id"], covered: true, confidence: "high", checks: ["Checked live tracking"] };
    const draft = await openaiDraft(contextFor("t-9931"));
    expect(lastPrompt).toContain("[a-late] Late deliveries: what we do");
    expect(lastPrompt).not.toContain("Wholesale and bulk orders");
    expect(lastPrompt).toContain('"number":"48213"');
    expect(draft.provider).toBe("openai");
    expect(draft.sources.map((s) => s.id)).toEqual(["48213", "a-late"]);
    expect(draft.body).toContain("Leeds depot");
  });

  it("never lets the model raise confidence or skip the human for refunds", async () => {
    const { openaiDraft } = await import("@/lib/ai/openai");
    reply = { reply: "Refunded!", used_source_ids: ["a-replace"], covered: true, confidence: "high", checks: [] };
    const draft = await openaiDraft(contextFor("t-9928"));
    expect(draft.needsAgent).toBe(true);
  });

  it("drops to low confidence when the model says the sources don't cover it", async () => {
    const { openaiDraft } = await import("@/lib/ai/openai");
    reply = { reply: "I'm checking with the team.", used_source_ids: [], covered: false, confidence: "high", checks: [] };
    const draft = await openaiDraft(contextFor("t-9927"));
    expect(draft.confidence).toBe("low");
    expect(draft.needsAgent).toBe(true);
  });
});
