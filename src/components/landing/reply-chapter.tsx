"use client";

import { useRef } from "react";
import { Avatar, Badge, buttonClass } from "@/components/ui";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

export interface ReplyData {
  customer: { name: string; color: string; since: string };
  message: string;
  order: { id: string; total: string; events: { label: string; when: string; done: boolean }[] };
  pastOrders: number;
  draft: string;
  sources: string[];
  checks: string[];
}

const STEPS = [
  ["A message lands", "Laura's parcel hasn't moved in days. Helpdeck tags it Delivery delay and pulls up her order."],
  ["Sources are checked", "Live tracking from the courier, then the help articles that cover late deliveries."],
  ["A reply is drafted", "Written only from those sources, in your tone, with every source listed."],
  ["Your agent sends it", "One click, or edit first. Nothing reaches Laura until a person says so."],
];

/**
 * The product's core loop, replayed in a live app frame and scrubbed by scroll.
 * Pinned only on wide screens with motion allowed; otherwise it renders finished.
 */
export function ReplyChapter({ data }: { data: ReplyData }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-draft]", { type: "words" });
        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=2600", scrub: 0.6, pin: true, anticipatePin: 1 },
        });
        const step = (i: number) =>
          tl.to("[data-step]", { opacity: (j: number) => (j === i ? 1 : 0.28), duration: 0.3 }, ">");

        tl.set("[data-step]", { opacity: (j: number) => (j === 0 ? 1 : 0.28) })
          .from("[data-msg]", { y: 40, autoAlpha: 0, duration: 1 })
          .from("[data-tag]", { scale: 0.6, autoAlpha: 0, stagger: 0.15, duration: 0.5, ease: "back.out(2.5)" }, "-=0.3")
          .from("[data-order]", { y: 30, autoAlpha: 0, duration: 0.8 });
        tl.addLabel("check");
        step(1);
        tl.from("[data-bar]", { scaleX: 0, transformOrigin: "0% 50%", stagger: 0.35, duration: 0.8, ease: "none" })
          .from("[data-checking]", { autoAlpha: 0, duration: 0.4 }, "<")
          .from("[data-source]", { y: 12, autoAlpha: 0, stagger: 0.2, duration: 0.5, ease: "back.out(2)" })
          .to("[data-checking]", { autoAlpha: 0, duration: 0.3 });
        step(2);
        tl.from("[data-draftcard]", { y: 40, autoAlpha: 0, duration: 0.8 }, "<")
          .from(split.words, { opacity: 0.08, stagger: 0.04, duration: 0.3, ease: "none" })
          .from("[data-check]", { x: -10, autoAlpha: 0, stagger: 0.15, duration: 0.4 });
        step(3);
        tl.fromTo("[data-send]", { scale: 1 }, { scale: 1.08, duration: 0.25, yoyo: true, repeat: 1 }, "<")
          .from("[data-sent]", { y: 10, autoAlpha: 0, duration: 0.5 })
          .to({}, { duration: 0.6 });
        return () => split.revert();
      });
    },
    { scope: root },
  );

  return (
    <section id="watch" ref={root} className="relative flex min-h-[100svh] items-center bg-grey py-20 lg:py-0">
      <div className="mx-auto grid w-full max-w-[1408px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(300px,400px)_1fr]">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-orange">One ticket, start to finish</p>
          <h2 className="mt-4 text-[clamp(32px,3.4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-navy">Watch a reply get written.</h2>
          <ol className="mt-10 space-y-6">
            {STEPS.map(([title, body], i) => (
              <li key={title} data-step className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy text-[13px] font-bold text-white">{i + 1}</span>
                <div>
                  <p className="text-[17px] font-bold text-ink">{title}</p>
                  <p className="mt-1 text-[15px] leading-6 text-gray-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[20px] bg-navy p-3 shadow-[0_40px_100px_-40px_rgba(20,33,61,0.55)] sm:p-5">
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <div className="space-y-3 sm:space-y-4">
              <div data-msg className="rounded-xl bg-white p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={data.customer.name} color={data.customer.color} />
                  <div className="leading-tight">
                    <p className="font-bold">{data.customer.name}</p>
                    <p className="text-sm text-gray-500">Order #{data.order.id} · via email · 4 min ago</p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-6 text-gray-700">{data.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span data-tag><Badge tone="yellow">Delivery delay</Badge></span>
                  <span data-tag><Badge>Customer since {data.customer.since}</Badge></span>
                  <span data-tag><Badge tone="blue">{data.pastOrders} past orders</Badge></span>
                </div>
              </div>
              <div data-order className="rounded-xl bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="font-bold">Order #{data.order.id} · {data.order.total}</p>
                  <Badge tone="yellow">In transit</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {data.order.events.map((e) => (
                    <div key={e.label}>
                      <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                        {e.done && <div data-bar className="h-full bg-emerald-700" />}
                      </div>
                      <p className="mt-3 text-sm font-bold">{e.label}</p>
                      <p className="text-[13px] text-gray-400">{e.when}</p>
                    </div>
                  ))}
                </div>
                <p data-checking className="mt-4 text-[13px] font-bold text-orange">Checking courier tracking…</p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3 text-[13px]">
                  <span className="text-gray-400">Sources</span>
                  {data.sources.map((s) => (
                    <span key={s} data-source className="rounded-md bg-gray-100 px-2 py-0.5 font-bold text-gray-700">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div data-draftcard className="flex flex-col rounded-xl bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-orange">AI draft · ready to review</p>
                <Badge tone="green">High confidence</Badge>
              </div>
              <div className="mt-4 space-y-3 rounded-xl border border-orange/30 bg-orange-50 px-5 py-4 text-[15px] leading-6 text-gray-800">
                {data.draft.split(/\n{2,}/).map((para, i) => <p key={i} data-draft className="whitespace-pre-line">{para}</p>)}
              </div>
              <ul className="mt-4 grid gap-y-1.5 text-sm text-gray-600 sm:grid-cols-2">
                {data.checks.map((c) => <li key={c} data-check>✓ {c}</li>)}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-5">
                <span data-send className={buttonClass("primary")}>Send reply</span>
                <span className={buttonClass("secondary")}>Edit</span>
                <span className={buttonClass("secondary")}>Regenerate</span>
                <span data-sent className="ml-auto text-sm font-bold text-emerald-700">✓ Sent by Sara</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
