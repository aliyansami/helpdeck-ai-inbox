"use client";

import { useEffect, useState, useTransition } from "react";
import { saveWidgetAction } from "@/app/actions";
import { ChatWidget } from "@/components/chat-widget";
import { Button } from "@/components/ui";
import type { WidgetSettings } from "@/lib/types";

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange";

export function WidgetPreview({ settings, preview }: { settings: WidgetSettings; preview: { question: string; body: string; source?: string } }) {
  const [value, setValue] = useState(settings);
  const [customising, setCustomising] = useState(false);
  const [pending, start] = useTransition();
  // The "Customise widget" button on the chat channel card links to #customise.
  useEffect(() => {
    const onHash = () => window.location.hash === "#customise" && setCustomising(true);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const origin = typeof window === "undefined" ? "https://your-helpdeck.example" : window.location.origin;

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-start border-b border-line px-[22px] py-4">
        <div className="leading-tight">
          <p className="text-[17px] font-bold">Widget preview</p>
          <p className="text-[13px] text-gray-400">How customers see chat on your site · try it</p>
        </div>
        <button onClick={() => setCustomising(!customising)} className="ml-auto text-[13px] font-bold text-orange hover:underline" id="customise">
          {customising ? "Done" : "Customise"}
        </button>
      </div>
      <div className="bg-gray-50/60 p-5">
        <ChatWidget
          settings={value}
          className="h-[330px]"
          initial={[
            { id: "p1", from: "visitor", body: preview.question },
            { id: "p2", from: "bot", body: preview.body, source: preview.source },
          ]}
        />
      </div>
      {customising && (
        <div className="space-y-3 border-t border-line px-[22px] py-4">
          <label className="block text-sm font-bold">Title<input className={`${input} mt-1`} value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} /></label>
          <label className="block text-sm font-bold">Subtitle<input className={`${input} mt-1`} value={value.subtitle} onChange={(e) => setValue({ ...value, subtitle: e.target.value })} /></label>
          <label className="flex items-center gap-3 text-sm font-bold">
            Header colour
            <input type="color" value={value.color} onChange={(e) => setValue({ ...value, color: e.target.value })} className="h-8 w-12 cursor-pointer rounded border border-line" />
          </label>
          <Button variant="primary" size="sm" disabled={pending} onClick={() => start(() => saveWidgetAction(value))}>{pending ? "Saving…" : "Save widget"}</Button>
          <div>
            <p className="mt-2 text-sm font-bold">Embed on your site</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-navy p-3 text-xs leading-5 text-white/90">{`<script src="${origin}/widget.js" async></script>`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
