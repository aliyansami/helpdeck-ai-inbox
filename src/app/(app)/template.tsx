"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Re-mounted on every navigation inside the app, so each screen enters the same way:
 * blocks rise in, rows follow, bars grow and figures count up. Pages only add data attributes.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        const has = (sel: string) => !!root.current?.querySelector(sel);
        if (has("[data-reveal]")) tl.from("[data-reveal]", { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.05 }, 0);
        if (has("[data-reveal-row]")) tl.from("[data-reveal-row]", { y: 8, autoAlpha: 0, duration: 0.45, stagger: 0.03 }, 0.12);
        if (has("[data-grow]")) tl.from("[data-grow]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, stagger: 0.02, ease: "expo.out" }, 0.2);
        if (has("[data-meter]")) tl.from("[data-meter]", { scaleX: 0, transformOrigin: "0% 50%", duration: 1, stagger: 0.05, ease: "expo.out" }, 0.25);
        root.current?.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          if (!Number.isFinite(target)) return;
          const suffix = el.dataset.suffix ?? "";
          const state = { v: 0 };
          tl.to(state, { v: target, duration: 1.1, ease: "power2.out", onUpdate: () => (el.textContent = `${Math.round(state.v).toLocaleString("en-US")}${suffix}`) }, 0.15);
        });
      });
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
