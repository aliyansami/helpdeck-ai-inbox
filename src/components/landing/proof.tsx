"use client";

import Link from "next/link";
import { useRef } from "react";
import { Badge, buttonClass, cx } from "@/components/ui";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

export interface ProofData {
  kpis: { label: string; value: number; format: "int" | "pct" | "duration" | "rating"; note: string }[];
  perDay: { fromDraft: number; agent: number }[];
  rules: { name: string; when: string; condition: string; then: string; enabled: boolean }[];
}

function formatValue(v: number, f: ProofData["kpis"][number]["format"]) {
  if (f === "pct") return `${Math.round(v)}%`;
  if (f === "rating") return v.toFixed(1);
  if (f === "duration") return `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, "0")}s`;
  return Math.round(v).toLocaleString("en-US");
}

/** Reports and automations as live fragments, built as the section scrolls in, then the closing line. */
export function Proof({ data, github }: { data: ProofData; github: string }) {
  const root = useRef<HTMLElement>(null);
  const max = Math.max(1, ...data.perDay.map((d) => d.fromDraft + d.agent));

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-panels]", start: "top 70%" } });
        tl.from("[data-head]", { y: 30, autoAlpha: 0, stagger: 0.1, duration: 1 })
          .from("[data-panel]", { y: 50, autoAlpha: 0, stagger: 0.15, duration: 1 }, "-=0.6")
          .from("[data-bar]", { scaleY: 0, transformOrigin: "50% 100%", stagger: 0.025, duration: 0.8, ease: "expo.out" }, "-=0.5")
          .from("[data-rule]", { x: -20, autoAlpha: 0, stagger: 0.12, duration: 0.6 }, "<")
          .from("[data-chip]", { scale: 0.6, autoAlpha: 0, stagger: 0.05, duration: 0.4, ease: "back.out(2.5)" }, "<+=0.2");
        root.current?.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const format = el.dataset.format as ProofData["kpis"][number]["format"];
          const state = { v: 0 };
          tl.to(state, { v: target, duration: 1.4, ease: "power2.out", onUpdate: () => (el.textContent = formatValue(state.v, format)) }, 0.5);
        });

        // The closing statement lights word by word as it scrolls through.
        const split = SplitText.create("[data-statement]", { type: "words" });
        gsap.from(split.words, {
          opacity: 0.15,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: "[data-statement]", start: "top 80%", end: "bottom 45%", scrub: true },
        });
        return () => split.revert();
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-grey">
      <div data-panels className="mx-auto flex min-h-[100svh] w-full max-w-[1408px] flex-col justify-center px-4 py-24 sm:px-6">
        <p data-head className="text-[13px] font-bold uppercase tracking-[0.14em] text-orange">Reports and automations</p>
        <h2 data-head className="mt-4 max-w-[820px] text-[clamp(32px,3.4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-navy">
          See what the drafts are worth, and decide what runs on its own.
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <Link href="/reports" data-panel className="group rounded-2xl border border-line bg-white p-6 transition-transform duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold">Last 21 days</span>
              <span className="text-[13.5px] font-bold text-orange underline-offset-4 group-hover:underline">Open reports →</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.kpis.map((k) => (
                <div key={k.label}>
                  <p className="text-[13px] text-gray-400">{k.label}</p>
                  <p data-count={k.value} data-format={k.format} className="mt-1 text-[clamp(24px,2.2vw,32px)] font-bold leading-tight tracking-tight">{formatValue(k.value, k.format)}</p>
                  <p className="text-[12px] font-bold text-emerald-700">{k.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex h-[150px] items-end gap-[5px]" aria-label="Tickets per day: AI draft and agent-written" role="img">
              {data.perDay.map((d, i) => (
                <div key={i} data-bar className="flex h-full flex-1 flex-col justify-end">
                  <div className="bg-[#C3CADB]" style={{ height: `${(d.agent / max) * 100}%` }} />
                  <div className="bg-orange" style={{ height: `${(d.fromDraft / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[12px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-orange" />Sent from AI draft</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#C3CADB]" />Written by agent</span>
            </div>
          </Link>

          <Link href="/automations" data-panel className="group flex flex-col rounded-2xl border border-line bg-white p-6 transition-transform duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold">Automation rules</span>
              <span className="text-[13.5px] font-bold text-orange underline-offset-4 group-hover:underline">Open automations →</span>
            </div>
            <ul className="mt-4 space-y-3">
              {data.rules.map((r) => (
                <li key={r.name} data-rule className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className={cx("relative h-[22px] w-[38px] shrink-0 rounded-full", r.enabled ? "bg-emerald-700" : "bg-gray-200")}>
                      <span className={cx("absolute top-[3px] h-4 w-4 rounded-full bg-white", r.enabled ? "left-[19px]" : "left-[3px]")} />
                    </span>
                    <p className="font-bold">{r.name}</p>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] text-gray-600">
                    <span data-chip><Badge tone="blue">WHEN</Badge></span> {r.when}
                    {r.condition && <><span data-chip><Badge tone="yellow">IF</Badge></span> {r.condition}</>}
                    <span data-chip><Badge tone="orange">THEN</Badge></span> {r.then}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-4 text-[13px] text-gray-500">🛡️ Refunds, cancellations and low-confidence drafts always go to a person.</p>
          </Link>
        </div>
      </div>

      <div className="mx-auto flex min-h-[80svh] max-w-[1180px] flex-col items-center justify-center px-4 pb-24 text-center sm:px-6">
        <p data-statement className="text-[clamp(34px,5vw,72px)] font-bold leading-[1.08] tracking-[-0.03em] text-navy">
          Helpdeck writes the first draft. <span className="text-orange">Your team stays in control of every word.</span>
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link href="/inbox" className={cx(buttonClass("primary"), "h-[52px] px-7 text-[16px]")}>Open the live demo</Link>
          <a href={github} className={cx(buttonClass("secondary"), "h-[52px] px-7 text-[16px]")}>Read the code</a>
        </div>
      </div>
    </section>
  );
}
