import { ChatWidget } from "@/components/chat-widget";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Full-page widget, loaded in an iframe by public/widget.js. */
export default async function WidgetPage() {
  const { widget } = await (await getStore()).workspace();
  return (
    <div className="h-screen bg-transparent p-0">
      <ChatWidget settings={widget} className="h-full rounded-none shadow-none" initial={[{ id: "hello", from: "bot", body: "Hi! Ask us anything about orders, delivery or returns." }]} />
    </div>
  );
}
