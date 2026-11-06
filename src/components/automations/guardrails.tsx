"use client";

import { useState, useTransition } from "react";
import { saveGuardrailsAction } from "@/app/actions";
import { Button } from "@/components/ui";
import type { Guardrails } from "@/lib/types";

const LABELS: Record<keyof Guardrails, string> = {
  refunds: "Refunds and payment disputes",
  cancellations: "Cancellations",
  lowConfidence: "Drafts with Low confidence",
};

export function GuardrailsButton({ guardrails }: { guardrails: Guardrails }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(guardrails);
  const [pending, start] = useTransition();
  return (
    <div className="relative">
      <Button onClick={() => setOpen(!open)} aria-expanded={open}>Edit guardrails</Button>
      {open && (
        <div className="absolute bottom-12 right-0 z-20 w-80 rounded-xl border border-line bg-white p-5 shadow-xl">
          <p className="font-bold">Always send to a person</p>
          <p className="mt-1 text-sm text-muted">These override every rule, including auto-send.</p>
          <div className="mt-4 space-y-2.5">
            {(Object.keys(LABELS) as (keyof Guardrails)[]).map((k) => (
              <label key={k} className="flex items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="h-4 w-4 accent-orange" checked={value[k]} onChange={(e) => setValue({ ...value, [k]: e.target.checked })} />
                {LABELS[k]}
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="primary" size="sm" disabled={pending} onClick={() => start(async () => { await saveGuardrailsAction(value); setOpen(false); })}>Save</Button>
            <Button size="sm" onClick={() => { setValue(guardrails); setOpen(false); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
