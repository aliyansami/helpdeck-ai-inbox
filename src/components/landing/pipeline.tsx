"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

const STEPS = [
  ["Tag", "Each email or chat is classified by topic and linked to the customer's latest order."],
  ["Retrieve", "BM25 finds the help articles that answer it. With an OpenAI key, embeddings re-rank them."],
  ["Draft", "The reply uses only those articles, the order and internal notes, and lists every source."],
  ["Guard", "No article? A holding reply and a hand-off. Refunds and cancellations always need a person."],
  ["Approve", "Your agent sends, edits or regenerates. Rules can auto-send only what guardrails allow."],
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * The help centre as a drifting constellation (node network adapted from
 * ThreeUI's "Constellation Field", MIT). Every few seconds one node becomes an
 * incoming question and its nearest articles light up in orange.
 */
function Constellation() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = false;
    let nodes: Node[] = [];
    let query = -1;
    let hits: number[] = [];
    let pulseAt = 0;
    const pointer = { x: -1000, y: -1000 };
    const LINK = 150;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      width = r.width;
      height = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 768 ? 40 : 90;
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 1.4,
      }));
      query = -1;
      draw(0);
    };

    const pickQuery = () => {
      query = Math.floor(Math.random() * nodes.length);
      const q = nodes[query];
      hits = nodes
        .map((n, i) => ({ i, d: Math.hypot(n.x - q.x, n.y - q.y) }))
        .filter((x) => x.i !== query)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .map((x) => x.i);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#b7c0d4";
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < LINK) {
            ctx.globalAlpha = (1 - d / LINK) * 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      // The current query's links to its nearest neighbours.
      const glow = query >= 0 ? Math.min(1, (t - pulseAt) / 500) : 0;
      if (query >= 0) {
        ctx.strokeStyle = "#f26b3a";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = glow * 0.9;
        for (const h of hits) {
          ctx.beginPath();
          ctx.moveTo(nodes[query].x, nodes[query].y);
          ctx.lineTo(nodes[h].x, nodes[h].y);
          ctx.stroke();
        }
      }
      nodes.forEach((n, i) => {
        const isQuery = i === query;
        const isHit = hits.includes(i) && query >= 0;
        ctx.globalAlpha = isQuery || isHit ? 0.25 * glow : 0.12;
        ctx.fillStyle = isQuery ? "#f26b3a" : "#14213d";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (isQuery ? 5 : isHit ? 3.6 : 2.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = isQuery || isHit ? 1 : 0.7;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (isQuery ? 1.9 : isHit ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const tick = (t: number) => {
      if (!visible) return;
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        if (Math.hypot(n.x - pointer.x, n.y - pointer.y) < 200) {
          n.x -= (n.x - pointer.x) * 0.004;
          n.y -= (n.y - pointer.y) * 0.004;
        }
      }
      if (t - pulseAt > 2600) {
        pulseAt = t;
        pickQuery();
      }
      draw(t);
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !reduced;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

export function Pipeline() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 60%" } });
        tl.from("[data-head]", { y: 30, autoAlpha: 0, stagger: 0.1, duration: 1 })
          .from("[data-line]", { scaleX: 0, duration: 1.4, ease: "power2.inOut" }, "-=0.6")
          .from("[data-dot]", { scale: 0, stagger: 0.18, duration: 0.5, ease: "back.out(3)" }, "<")
          .from("[data-stepcard]", { y: 26, autoAlpha: 0, stagger: 0.18, duration: 0.8 }, "<+=0.1");
      });
    },
    { scope: root },
  );

  return (
    <section id="how" ref={root} className="relative flex min-h-[100svh] items-center overflow-hidden bg-white py-24">
      <Constellation />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.92)_25%,rgba(255,255,255,0.2)_75%)]" />
      <div className="relative mx-auto w-full max-w-[1408px] px-4 sm:px-6">
        <p data-head className="text-[13px] font-bold uppercase tracking-[0.14em] text-orange">Under the hood</p>
        <h2 data-head className="mt-4 max-w-[760px] text-[clamp(32px,3.4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-navy">
          From message to approved reply in five steps.
        </h2>
        <div className="relative mt-16">
          <span data-line className="absolute left-0 right-0 top-[7px] hidden h-px origin-left bg-navy md:block" />
          <ol className="grid gap-8 md:grid-cols-5 md:gap-6">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="relative">
                <span data-dot className="relative z-10 block h-[15px] w-[15px] rounded-full border-2 border-navy bg-white" />
                <div data-stepcard className="mt-6">
                  <p className="text-[13px] font-bold text-orange">0{i + 1}</p>
                  <p className="mt-1 text-[24px] font-bold text-navy">{title}</p>
                  <p className="mt-2 text-[15px] leading-[1.6] text-gray-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
