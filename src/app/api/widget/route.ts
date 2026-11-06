import { randomUUID } from "node:crypto";
import { ingestMessage, widgetMessages } from "@/lib/service";

export const dynamic = "force-dynamic";

// The widget is embedded on the store's own site, so it is called cross-origin.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" };

export function OPTIONS() {
  return new Response(null, { headers: CORS });
}

/** Poll for replies: returns the visible messages of a widget conversation. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("conversationId");
  if (!id) return Response.json({ messages: [] }, { headers: CORS });
  const messages = await widgetMessages(id);
  return Response.json({ messages: messages.map((m) => ({ id: m.id, author: m.author, body: m.body, at: m.at })) }, { headers: CORS });
}

/** A visitor sends a chat message. It runs the full pipeline: draft, rules, instant answer or hand-off. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; conversationId?: string; visitorId?: string; name?: string; email?: string };
  const text = body.text?.trim();
  if (!text || text.length > 2000) return Response.json({ error: "Message is required (max 2000 characters)" }, { status: 400, headers: CORS });
  const visitorId = body.visitorId?.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || randomUUID();
  const result = await ingestMessage({
    channel: "chat",
    text,
    conversationId: body.conversationId,
    name: body.name?.slice(0, 80) || "Website visitor",
    email: body.email?.slice(0, 120) || `visitor-${visitorId}@chat.helpdeck.local`,
  });
  return Response.json({ ...result, visitorId }, { headers: CORS });
}
