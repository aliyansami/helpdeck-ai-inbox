"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { buttonClass, cx } from "@/components/ui";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import type { StreamTicket } from "./ticket-stream";

// three.js loads after the page is interactive, so the copy never waits on it.
const TicketStream = dynamic(() => import("./ticket-stream").then((m) => m.TicketStream), { ssr: false });

export function Hero({ tickets, github }: { tickets: StreamTicket[]; github: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        SplitText.create("[data-split]", {
          type: "lines,words",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) => gsap.from(self.words, { yPercent: 110, duration: 1.1, stagger: 0.03, ease: "expo.out", delay: 0.1 }),
        });
        gsap.from("[data-rise]", { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08, delay: 0.5 });
        gsap.to("[data-copy]", {
          yPercent: -16,
          autoAlpha: 0.2,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative min-h-[100svh] overflow-hidden bg-white">
      <div className="relative z-10 mx-auto flex max-w-[1408px] items-center px-4 pt-28 sm:px-6 lg:min-h-[100svh] lg:pt-[72px]">
        <div data-copy className="max-w-[700px] lg:max-w-[50%]">
          <p data-rise className="inline-flex items-center gap-2 rounded-full bg-grey py-1.5 pl-2 pr-3.5 text-[13px] font-bold text-navy">
            <span className="rounded-full bg-orange px-2 py-0.5 text-xs text-white">New</span>
            Drafts now pull live order status
          </p>
          <h1 data-split className="mt-7 text-[clamp(40px,5.4vw,78px)] font-bold leading-[1.03] tracking-[-0.035em] text-navy">
            Answer every customer in minutes, <span className="text-orange">without sounding like a bot.</span>
          </h1>
          <p data-rise className="mt-7 max-w-[540px] text-[clamp(17px,1.4vw,20px)] leading-[1.6] text-gray-600">
            Helpdeck reads each email and chat, checks the order and your help centre, and writes a reply your agent sends in one click.
          </p>
          <div data-rise className="mt-9 flex flex-wrap gap-3">
            <Link href="/inbox" className={cx(buttonClass("primary"), "h-[52px] px-7 text-[16px]")}>Open the live demo</Link>
            <a href="#watch" className={cx(buttonClass("secondary"), "h-[52px] px-7 text-[16px]")}>Watch a reply get written</a>
          </div>
          <p data-rise className="mt-6 text-sm text-gray-400">
            Runs without keys in demo mode · <a href={github} className="link-draw">source on GitHub</a>
          </p>
        </div>
      </div>
      {/* Beside the copy on wide screens, below it on phones. */}
      <div className="relative h-[56svh] lg:absolute lg:bottom-0 lg:left-[48%] lg:right-0 lg:top-[84px] lg:h-auto">
        <TicketStream tickets={tickets} className="absolute inset-0" />
      </div>
      <div data-rise className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-400 lg:flex">
        Scroll
        <span className="block h-10 w-px origin-top animate-[scrollcue_2.4s_ease-in-out_infinite] bg-gray-300" />
      </div>
    </section>
  );
}
