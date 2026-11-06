"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { confidenceFor, ground, needsAgentFor } from "@/lib/ai/grounding";
import { tokenize } from "@/lib/ai/retrieve";
import { TOPIC_LABEL } from "@/lib/ai/topics";
import { cx } from "@/components/ui";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import type { Article } from "@/lib/types";

const EXAMPLES = [
  "Do you ship to Ireland, and what does it cost?",
  "My code SAVE15 isn't working at checkout",
  "How should I wash a merino throw?",
  "Do you price match other shops?",
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  target: number;
}

/** Decide what Helpdeck would do with a question, using the same grounding code as the inbox. */
function verdictFor(question: string, articles: Article[]) {
  const now = new Date();
  const g = ground({
    conversation: { id: "q", number: 0, customerId: "v", subject: question, channel: "chat", status: "open", tags: [], priority: "normal", createdAt: now.toISOString(), updatedAt: now.toISOString() },
    messages: [{ id: "m", conversationId: "q", author: "customer", authorName: "Visitor", body: question, at: now.toISOString() }],
    customer: { id: "v", name: "Visitor", email: "", color: "", since: "" },
    orders: [], articles, agentName: "", storeName: "", tone: "friendly", attempt: 0, now,
  });
  const confidence = confidenceFor(g);
  const { needsAgent, reason } = needsAgentFor(g, confidence);
  const article = g.articles.find((a) => a.article.kind === "help");
  return { topic: g.topic, covered: g.covered, confidence, needsAgent, reason, article: article?.article, score: article?.score };
}

/**
 * Retrieval made visible. A liquid particle system (adapted from ThreeUI's
 * "Semantic Bloom", MIT) settles on the words of the help article that
 * answers the visitor's question, lighting them as it arrives.
 */
export function AnswerBloom({ articles }: { articles: Article[] }) {
  const root = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [touched, setTouched] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(prefersReducedMotion()), []);

  const terms = useMemo(() => new Set(tokenize(query)), [query]);
  const termsRef = useRef(terms);
  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);
  const verdict = useMemo(() => verdictFor(query, articles), [query, articles]);
  // The answering article, or nothing: an unrelated "closest" article would only mislead.
  const shown = verdict.article;

  const words = useMemo(() => {
    let i = 0;
    if (!shown) return [];
    return shown.body.split(/(\s+)/).map((w) => ({ w, key: i++, term: /\S/.test(w) ? tokenize(w)[0] : undefined }));
  }, [shown]);

  // Type example questions until the visitor types their own.
  useEffect(() => {
    if (touched || prefersReducedMotion()) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const typeNext = () => {
      i = (i + 1) % EXAMPLES.length;
      const full = EXAMPLES[i];
      let n = 0;
      const step = () => {
        n++;
        setQuery(full.slice(0, n));
        timer = setTimeout(n < full.length ? step : typeNext, n < full.length ? 36 : 4200);
      };
      step();
    };
    timer = setTimeout(typeNext, 4200);
    return () => clearTimeout(timer);
  }, [touched]);

  useEffect(() => {
    const card = cardRef.current;
    const canvas = canvasRef.current;
    if (!card || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const motionOff = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = false;
    let spans: { el: HTMLElement; x: number; y: number; term?: string; on: boolean }[] = [];
    const particles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 400, y: Math.random() * 300, vx: 0, vy: 0, r: 8 + Math.random() * 8, angle: Math.random() * 6.28, target: i,
    }));

    const measure = () => {
      const rect = card.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spans = [...card.querySelectorAll<HTMLElement>("[data-w]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2, term: el.dataset.term, on: false };
      });
    };

    const tick = () => {
      if (!visible) return;
      const matched = spans.filter((s) => s.term && termsRef.current.has(s.term));
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.angle += (Math.random() - 0.5) * 0.3;
        p.vx += Math.cos(p.angle) * 0.35;
        p.vy += Math.sin(p.angle) * 0.35;
        const goal = matched.length ? matched[p.target % matched.length] : null;
        p.vx += ((goal ? goal.x : width / 2) - p.x) * (goal ? 0.006 : 0.0006);
        p.vy += ((goal ? goal.y : height / 2) - p.y) * (goal ? 0.006 : 0.0006);
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;
      }
      ctx.strokeStyle = "#f26b3a";
      ctx.fillStyle = "#f26b3a";
      ctx.lineWidth = 4;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 70) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // A word lights once a particle reaches it, and stays lit while it matches.
      for (const s of spans) {
        const isMatch = !!s.term && termsRef.current.has(s.term);
        if (isMatch && !s.on && particles.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < 26)) {
          s.on = true;
          s.el.dataset.on = "true";
        } else if (!isMatch && s.on) {
          s.on = false;
          s.el.dataset.on = "false";
        }
      }
      frame = requestAnimationFrame(tick);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(card);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !motionOff;
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(tick);
    });
    io.observe(card);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
    };
  }, [words]);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-in]", { y: 40, autoAlpha: 0, stagger: 0.12, duration: 1.1, scrollTrigger: { trigger: root.current, start: "top 70%" } });
      });
    },
    { scope: root },
  );

  const answers = !!verdict.article && !verdict.needsAgent;
  return (
    <section id="ask" ref={root} className="relative flex min-h-[100svh] items-center overflow-hidden bg-navy py-20 text-white">
      <svg className="absolute h-0 w-0" aria-hidden>
        <filter id="helpdeck-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <div className="mx-auto grid w-full max-w-[1408px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(300px,440px)_1fr]">
        <div data-in>
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-orange">Grounded, or handed over</p>
          <h2 className="mt-4 text-[clamp(32px,3.4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em]">Ask like a customer.</h2>
          <p className="mt-5 text-[17px] leading-[1.6] text-white/70">
            Helpdeck only answers from your help centre. Type a question and watch it find the article, or admit there isn&apos;t one.
          </p>
          <label className="mt-8 block">
            <span className="text-[12px] uppercase tracking-[0.14em] text-white/50">Customer question</span>
            <input
              value={query}
              onChange={(e) => {
                setTouched(true);
                setQuery(e.target.value);
              }}
              onFocus={() => setTouched(true)}
              className="mt-2 h-14 w-full rounded-xl border border-white/15 bg-white/5 px-5 text-[17px] text-white outline-none placeholder:text-white/40 focus:border-orange"
              placeholder="Ask about delivery, returns, codes…"
            />
          </label>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5" aria-live="polite">
            <div className="flex items-center gap-2">
              <span className={cx("h-2.5 w-2.5 rounded-full", answers ? "bg-emerald-400" : verdict.article && verdict.covered ? "bg-amber-300" : "bg-white/40")} />
              <p className="font-bold">
                {answers ? "Helpdeck drafts an answer" : verdict.article && verdict.covered ? "Drafted, but a person approves" : "Handed to an agent"}
              </p>
            </div>
            <p className="mt-2 text-[14.5px] leading-6 text-white/65">
              {answers
                ? `From “${verdict.article!.title}” · BM25 ${verdict.score!.toFixed(1)} · ${verdict.confidence} confidence`
                : verdict.reason}
            </p>
            <p className="mt-2 text-[13px] text-white/40">Topic: {TOPIC_LABEL[verdict.topic]}</p>
          </div>
        </div>

        <div data-in>
          <div ref={cardRef} className={cx("relative rounded-2xl px-7 py-7 sm:px-10 sm:py-9", shown ? "bg-white text-ink shadow-[0_40px_120px_-40px_rgba(0,0,0,0.7)]" : "border border-dashed border-white/25")}>
            {/* The liquid sits under the text so words stay readable. */}
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 opacity-25 [filter:url(#helpdeck-goo)]" aria-hidden />
            {shown ? (
              <>
                <div className="relative mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-4">
                  <span className="text-[17px] font-bold">{shown.title}</span>
                  <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{shown.category}</span>
                </div>
                <p className="relative text-[clamp(16px,1.3vw,19px)] leading-[1.8]">
                  {words.map((t) =>
                    t.term ? (
                      <span
                        key={t.key}
                        data-w
                        data-term={t.term}
                        data-on={reduced && terms.has(t.term) ? "true" : "false"}
                        className="rounded-[3px] transition-[background-color,opacity] duration-500 data-[on=true]:bg-[#ffe2d4]"
                        style={{ opacity: terms.size && !terms.has(t.term) ? 0.6 : 1 }}
                      >
                        {t.w}
                      </span>
                    ) : (
                      <span key={t.key} style={{ opacity: terms.size && /\S/.test(t.w) ? 0.6 : 1 }}>{t.w}</span>
                    ),
                  )}
                </p>
                <p className="relative mt-6 text-[13px] text-gray-400">{shown.timesCited} replies have cited this article · help.northandoak.com</p>
              </>
            ) : (
              <div className="relative py-10 text-center text-white">
                <p className="text-[20px] font-bold">No help article covers this question</p>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-white/65">
                  Helpdeck sends a short holding reply, hands the ticket to an agent, and lists the question on the Knowledge page so someone can write the article.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
