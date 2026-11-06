"use client";

import { useTransition } from "react";
import { assignAction, setStatusAction } from "@/app/actions";
import { buttonClass, cx } from "@/components/ui";
import type { ConversationStatus } from "@/lib/types";

export function ConversationActions({ id, status, assigneeId, agents }: {
  id: string; status: ConversationStatus; assigneeId?: string; agents: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const assignee = agents.find((a) => a.id === assigneeId);
  return (
    <div className="flex items-center gap-2">
      <label className={cx(buttonClass("secondary"), "relative cursor-pointer")}>
        {assignee ? assignee.name.split(" ")[0] : "Assign"} <span className="text-[10px]">▼</span>
        <select
          aria-label="Assign conversation"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={assigneeId ?? ""}
          disabled={pending}
          onChange={(e) => start(() => assignAction(id, e.target.value || null))}
        >
          <option value="">Unassigned</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      {status === "resolved" ? (
        <button className={buttonClass("secondary")} disabled={pending} onClick={() => start(() => setStatusAction(id, "open"))}>Reopen</button>
      ) : (
        <>
          {status !== "snoozed" && (
            <button className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50" title="Snooze" aria-label="Snooze" disabled={pending} onClick={() => start(() => setStatusAction(id, "snoozed"))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M5 3 2 6M19 3l3 3" /></svg>
            </button>
          )}
          <button className={buttonClass("secondary")} disabled={pending} onClick={() => start(() => setStatusAction(id, "resolved"))}>Close</button>
        </>
      )}
    </div>
  );
}
