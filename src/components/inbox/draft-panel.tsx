"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ensureDraftAction, regenerateDraftAction, sendReplyAction } from "@/app/actions";
import { Badge, Button, cx } from "@/components/ui";
import type { ConversationStatus, Draft, Tone } from "@/lib/types";

const CONFIDENCE = {
  high: { label: "High confidence", tone: "green" },
  medium: { label: "Medium confidence", tone: "yellow" },
  low: { label: "Low confidence", tone: "red" },
} as const;

export function DraftPanel({ conversationId, draft, status }: { conversationId: string; draft?: Draft; status: ConversationStatus }) {
  const [editing, setEditing] = useState(!draft && status !== "open");
  const [text, setText] = useState(draft?.body ?? "");
  const [tone, setTone] = useState<Tone>(draft?.tone ?? "friendly");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const drafting = !draft && status === "open";

  useEffect(() => {
    if (drafting) start(() => ensureDraftAction(conversationId).catch((e: Error) => setError(e.message)));
  }, [drafting, conversationId]);

  useEffect(() => {
    if (editing) textarea.current?.focus();
  }, [editing]);

  const send = () => {
    const body = editing ? text : draft?.body ?? "";
    if (!body.trim() || pending) return;
    setError(undefined);
    start(() => sendReplyAction(conversationId, body).catch((e: Error) => setError(e.message)));
  };
  const regenerate = (t: Tone = tone) => {
    setError(undefined);
    setEditing(false);
    start(() => regenerateDraftAction(conversationId, t).catch((e: Error) => setError(e.message)));
  };

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        sendRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (drafting) {
    return (
      <div className="rounded-xl border border-orange/30 bg-orange-50/60 p-5">
        <p className="text-[13px] font-bold uppercase tracking-wider text-orange">AI draft</p>
        <p className="mt-3 text-sm text-gray-600">{error ?? "Reading the order, tracking and help articles…"}</p>
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-3 w-11/12 animate-pulse rounded bg-orange/10" />
          <div className="h-3 w-9/12 animate-pulse rounded bg-orange/10" />
        </div>
      </div>
    );
  }

  return (
    <div className={cx("overflow-hidden rounded-xl border", draft ? "border-orange/30 bg-orange-50/60" : "border-line bg-white")}>
      <div className="flex items-center gap-3 border-b border-orange/20 px-[18px] py-3">
        {draft ? (
          <>
            <p className="text-[13px] font-bold uppercase tracking-wider text-orange">AI draft</p>
            <Badge tone={CONFIDENCE[draft.confidence].tone}>{CONFIDENCE[draft.confidence].label}</Badge>
            {draft.needsAgent && <Badge>Needs agent</Badge>}
            <label className="ml-auto flex items-center gap-1 text-[13px] text-gray-400">
              Tone:
              <select
                value={tone}
                disabled={pending}
                onChange={(e) => {
                  const t = e.target.value as Tone;
                  setTone(t);
                  regenerate(t);
                }}
                className="cursor-pointer bg-transparent text-gray-500 outline-none"
              >
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
                <option value="formal">Formal</option>
              </select>
            </label>
          </>
        ) : (
          <p className="text-[13px] font-bold uppercase tracking-wider text-gray-500">Reply</p>
        )}
      </div>

      {draft?.reason && <p className="border-b border-orange/20 bg-white/60 px-[18px] py-2 text-[13px] text-gray-600">{draft.reason}</p>}

      <div className="px-[18px] py-4">
        {editing ? (
          <textarea
            ref={textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Write a reply…"
            className="w-full resize-y rounded-lg border border-line bg-white p-3 text-[15px] leading-[25px] outline-none focus:border-orange"
            aria-label="Reply"
          />
        ) : (
          <p className={cx("whitespace-pre-line text-[15px] leading-[25px] text-gray-800", pending && "opacity-50")}>{draft?.body}</p>
        )}
        {draft && draft.checks.length > 0 && !editing && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-gray-500">
            {draft.checks.map((c) => <li key={c}>✓ {c}</li>)}
          </ul>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2.5 border-t border-orange/20 px-[18px] py-3">
        <Button variant="primary" onClick={send} disabled={pending}>{pending ? "Working…" : "Send reply"}</Button>
        {draft && (
          <Button
            onClick={() => {
              if (editing) setText(draft.body);
              setEditing(!editing);
            }}
            disabled={pending}
          >
            {editing ? "Discard edits" : "Edit"}
          </Button>
        )}
        {draft && <Button onClick={() => regenerate()} disabled={pending}>Regenerate</Button>}
        <span className="ml-auto text-[13px] text-gray-400">⌘ + Enter to send</span>
      </div>
    </div>
  );
}
