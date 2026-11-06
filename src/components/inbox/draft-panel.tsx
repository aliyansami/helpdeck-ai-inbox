"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ensureDraftAction, regenerateDraftAction, sendReplyAction } from "@/app/actions";
import { Badge, Button, cx } from "@/components/ui";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
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
  const panel = useRef<HTMLDivElement>(null);

  // A fresh draft writes itself in; the panel is re-keyed on every new draft.
  useGSAP(
    () => {
      if (!draft) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-draft-body]", { type: "words" });
        gsap.timeline()
          .from(split.words, { autoAlpha: 0, y: 4, stagger: 0.008, duration: 0.35, ease: "power2.out" })
          .from("[data-draft-check]", { x: -8, autoAlpha: 0, stagger: 0.06, duration: 0.35 }, "-=0.2");
        return () => split.revert();
      });
    },
    { scope: panel },
  );
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
    <div ref={panel} className={cx("overflow-hidden rounded-xl border", draft ? "border-orange/30 bg-orange-50/60" : "border-line bg-white")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-orange/20 px-[18px] py-3">
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
          <div className={cx("space-y-[25px] text-[15px] leading-[25px] text-gray-800 transition-opacity", pending && "opacity-50")}>
            {/* One element per paragraph: SplitText would otherwise collapse the line breaks. */}
            {draft?.body.split(/\n{2,}/).map((para, i) => <p key={i} data-draft-body className="whitespace-pre-line">{para}</p>)}
          </div>
        )}
        {draft && draft.checks.length > 0 && !editing && (
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-gray-500">
            {draft.checks.map((c) => <li key={c} data-draft-check>✓ {c}</li>)}
          </ul>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-orange/20 px-[18px] py-3">
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
        <span className="ml-auto hidden text-[13px] text-gray-400 sm:inline">⌘ + Enter to send</span>
      </div>
    </div>
  );
}
