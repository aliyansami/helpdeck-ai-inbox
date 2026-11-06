"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import type { WidgetSettings } from "@/lib/types";

interface ChatMessage {
  id: string;
  from: "visitor" | "bot" | "agent" | "system";
  body: string;
  source?: string;
}

/**
 * The customer-facing chat widget. Talks to /api/widget, which runs the same pipeline as the inbox:
 * confident answers come back instantly, everything else becomes a ticket for an agent.
 */
export function ChatWidget({ settings, initial = [], apiBase = "", className }: {
  settings: WidgetSettings; initial?: ChatMessage[]; apiBase?: string; className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const visitorId = useRef<string | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Poll for agent replies once a ticket exists.
  useEffect(() => {
    if (!conversationId) return;
    const timer = setInterval(async () => {
      const res = await fetch(`${apiBase}/api/widget?conversationId=${conversationId}`).catch(() => undefined);
      if (!res?.ok) return;
      const { messages: server } = (await res.json()) as { messages: { id: string; author: string; body: string }[] };
      setMessages((current) => {
        const known = new Set(current.map((m) => m.id));
        const fresh = server
          .filter((m) => m.author === "agent" && !known.has(m.id))
          .map((m) => ({ id: m.id, from: "agent" as const, body: m.body }));
        return fresh.length ? [...current, ...fresh] : current;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [conversationId, apiBase]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText("");
    setSending(true);
    setMessages((m) => [...m, { id: `v-${Date.now()}`, from: "visitor", body }]);
    try {
      const res = await fetch(`${apiBase}/api/widget`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body, conversationId, visitorId: visitorId.current }),
      });
      const data = (await res.json()) as { conversationId: string; visitorId: string; answer?: { body: string; source?: string }; error?: string };
      if (!res.ok) throw new Error(data.error);
      visitorId.current = data.visitorId;
      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        data.answer
          ? { id: `b-${Date.now()}`, from: "bot", body: data.answer.body, source: data.answer.source }
          : { id: `s-${Date.now()}`, from: "system", body: "Thanks! A member of the team will reply here shortly." },
      ]);
    } catch {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, from: "system", body: "Sorry, that didn't send. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cx("flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(20,33,61,0.12)]", className)}>
      <div className="px-5 py-4 text-white" style={{ background: settings.color }}>
        <p className="text-[17px] font-bold">{settings.title}</p>
        <p className="text-[13px] text-white/85">{settings.subtitle}</p>
      </div>
      <div ref={scroller} className="flex min-h-[180px] flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cx("flex flex-col", m.from === "visitor" ? "items-end" : "items-start")}>
            <p className={cx(
              "max-w-[85%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm leading-[21px]",
              m.from === "visitor" && "bg-orange text-white",
              (m.from === "bot" || m.from === "agent") && "bg-gray-100 text-ink",
              m.from === "system" && "bg-transparent px-0 text-xs text-gray-500",
            )}>
              {m.body}
            </p>
            {m.source && <p className="mt-2 text-xs text-gray-500">Answered from “{m.source}”</p>}
            {m.from === "agent" && <p className="mt-1 text-xs text-gray-500">From the support team</p>}
          </div>
        ))}
        {sending && <p className="text-xs text-gray-400">Typing…</p>}
      </div>
      <form
        className="mx-[18px] mb-[18px] flex items-center rounded-lg border border-line px-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="h-11 flex-1 bg-transparent text-sm outline-none" aria-label="Message" />
        <button type="submit" disabled={sending || !text.trim()} className="text-lg font-bold text-orange disabled:opacity-40" aria-label="Send">↑</button>
      </form>
    </div>
  );
}
