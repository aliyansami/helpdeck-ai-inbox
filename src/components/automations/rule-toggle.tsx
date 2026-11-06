"use client";

import { useOptimistic, useTransition } from "react";
import { toggleRuleAction } from "@/app/actions";
import { cx } from "@/components/ui";

export function RuleToggle({ id, enabled, name }: { id: string; enabled: boolean; name: string }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useOptimistic(enabled);
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={`${on ? "Pause" : "Enable"} ${name}`}
      disabled={pending}
      onClick={() => start(async () => {
        setOn(!on);
        await toggleRuleAction(id, !on);
      })}
      className={cx("relative mt-0.5 h-[26px] w-[44px] shrink-0 rounded-full transition-colors", on ? "bg-emerald-700" : "bg-gray-200")}
    >
      <span className={cx("absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[21px]" : "left-[3px]")} />
    </button>
  );
}
