"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Avatar, cx, Logo } from "./ui";

interface Counts { open: number; mine: number; drafts: number; resolved: number }

export function Sidebar({ counts, agent, mode }: { counts: Counts; agent: { name: string; role: string; color: string }; mode: string }) {
  const pathname = usePathname();
  const view = useSearchParams().get("view") ?? "open";
  const conversations = [
    { label: "Inbox", view: "open", count: counts.open },
    { label: "Assigned to me", view: "mine", count: counts.mine },
    { label: "AI drafts ready", view: "drafts", count: counts.drafts },
    { label: "Resolved", view: "resolved" },
  ];
  const workspace = [
    { label: "Knowledge", href: "/knowledge" },
    { label: "Automations", href: "/automations" },
    { label: "Reports", href: "/reports" },
    { label: "Channels", href: "/channels" },
  ];
  const item = (active: boolean) =>
    cx("flex items-center justify-between rounded-lg px-3 py-2 text-[15px] font-medium", active ? "bg-navy-700 font-bold text-white" : "text-white/90 hover:bg-white/5");

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col bg-navy px-4 pb-6 pt-6">
      <Link href="/" className="px-2"><Logo dark /></Link>
      <p className="mt-10 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Conversations</p>
      <nav className="mt-2 flex flex-col gap-1">
        {conversations.map((c) => {
          const active = pathname === "/inbox" && view === c.view;
          return (
            <Link key={c.view} href={c.view === "open" ? "/inbox" : `/inbox?view=${c.view}`} className={item(active)}>
              {c.label}
              {c.count !== undefined && (
                <span className={cx("min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold", active ? "bg-orange text-white" : "bg-navy-600 text-white")}>{c.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <p className="mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Workspace</p>
      <nav className="mt-2 flex flex-col gap-1">
        {workspace.map((w) => (
          <Link key={w.href} href={w.href} className={item(pathname.startsWith(w.href))}>{w.label}</Link>
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
  );
}
