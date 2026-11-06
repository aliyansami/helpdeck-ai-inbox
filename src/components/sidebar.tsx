"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { Avatar, cx, Logo } from "./ui";

interface Counts { open: number; mine: number; drafts: number; resolved: number }

export function Sidebar({ counts, agent, mode }: { counts: Counts; agent: { name: string; role: string; color: string }; mode: string }) {
  const pathname = usePathname();
  const view = useSearchParams().get("view") ?? "open";
  const aside = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const conversations = [
    { label: "Inbox", view: "open", count: counts.open },
    { label: "Assigned to me", view: "mine", count: counts.mine },
    { label: "AI drafts ready", view: "drafts", count: counts.drafts },
    { label: "Resolved", view: "resolved" },
  ].map((c) => ({ ...c, href: c.view === "open" ? "/inbox" : `/inbox?view=${c.view}`, active: pathname === "/inbox" && view === c.view }));
  const workspace = [
    { label: "Knowledge", href: "/knowledge" },
    { label: "Automations", href: "/automations" },
    { label: "Reports", href: "/reports" },
    { label: "Channels", href: "/channels" },
  ].map((w) => ({ ...w, count: undefined as number | undefined, active: pathname.startsWith(w.href) }));
  const activeKey = [...conversations, ...workspace].find((x) => x.active)?.href;

  // One highlight that slides to the active link.
  useLayoutEffect(() => {
    const el = aside.current?.querySelector<HTMLElement>(`[data-nav="${activeKey}"]`);
    if (!pill.current) return;
    if (!el) {
      gsap.set(pill.current, { autoAlpha: 0 });
      return;
    }
    const to = { y: el.offsetTop, height: el.offsetHeight, autoAlpha: 1 };
    const first = !pill.current.dataset.ready;
    pill.current.dataset.ready = "1";
    if (first || prefersReducedMotion()) gsap.set(pill.current, to);
    else gsap.to(pill.current, { ...to, duration: 0.45, ease: "power3.inOut" });
  }, [activeKey]);

  const item = (active: boolean) =>
    cx("relative z-10 flex items-center justify-between rounded-lg px-3 py-2 text-[15px] transition-colors", active ? "font-bold text-white" : "font-medium text-white/85 hover:bg-white/5 hover:text-white");
  const badge = (active: boolean) => cx("min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold transition-colors", active ? "bg-orange text-white" : "bg-navy-600 text-white");

  return (
    <>
      {/* Phones and tablets: a compact bar with scrollable links. */}
      <div className="sticky top-0 z-30 bg-navy lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/"><Logo dark /></Link>
          <span className="ml-auto truncate text-[11px] text-white/50">{mode}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {[...conversations, ...workspace].map((x) => (
            <Link key={x.href} href={x.href} className={cx("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", x.active ? "bg-navy-700 font-bold text-white" : "text-white/80")}>
              {x.label}
              {x.count !== undefined && <span className={badge(x.active)}>{x.count}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <aside ref={aside} className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-navy px-4 pb-6 pt-6 lg:flex">
        <span ref={pill} className="pointer-events-none absolute left-4 right-4 top-0 rounded-lg bg-navy-700 opacity-0" aria-hidden />
        <Link href="/" className="px-2"><Logo dark /></Link>
        <p className="mt-10 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Conversations</p>
        <nav className="mt-2 flex flex-col gap-1">
          {conversations.map((c) => (
            <Link key={c.view} href={c.href} data-nav={c.href} className={item(c.active)}>
              {c.label}
              {c.count !== undefined && <span className={badge(c.active)}>{c.count}</span>}
            </Link>
          ))}
        </nav>
        <p className="mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Workspace</p>
        <nav className="mt-2 flex flex-col gap-1">
          {workspace.map((w) => (
            <Link key={w.href} href={w.href} data-nav={w.href} className={item(w.active)}>{w.label}</Link>
          ))}
        </nav>
        <div className="mt-auto">
          <p className="mb-3 px-3 text-[11px] text-white/45">{mode}</p>
          <div className="flex items-center gap-3 rounded-lg bg-navy-700 px-3 py-2.5">
            <Avatar name={agent.name} color={agent.color} size={34} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[15px] font-bold text-white">{agent.name}</p>
              <p className="text-sm text-white/80">{agent.role}</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-label="Online" />
          </div>
        </div>
      </aside>
    </>
  );
}
