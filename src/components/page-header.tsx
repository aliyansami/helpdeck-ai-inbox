import type { ReactNode } from "react";

export function PageHeader({ title, children, searchWidth = 320, defaultQuery }: { title: string; children?: ReactNode; searchWidth?: number; defaultQuery?: string }) {
  return (
    <header className="z-10 flex h-[68px] items-center gap-3 border-b border-line bg-white px-4 sm:gap-4 sm:px-8 lg:sticky lg:top-0">
      <h1 className="min-w-0 truncate text-xl font-bold text-navy">{title}</h1>
      <form action="/inbox" className="ml-auto hidden md:block" role="search">
        <label className="flex h-[38px] items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-gray-400" style={{ width: `min(${searchWidth}px, 32vw)` }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input name="q" defaultValue={defaultQuery} placeholder="Search tickets, customers, orders" className="w-full bg-transparent text-ink outline-none placeholder:text-gray-400" aria-label="Search tickets, customers, orders" />
        </label>
      </form>
      <div className="ml-auto flex items-center gap-3 md:ml-0">{children}</div>
    </header>
  );
}
