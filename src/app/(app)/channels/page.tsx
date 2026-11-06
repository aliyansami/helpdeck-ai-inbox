import { PageHeader } from "@/components/page-header";
import { Badge, buttonClass, Card } from "@/components/ui";
import { WidgetPreview } from "@/components/widget-preview";
import { widgetPreview } from "@/lib/service";
import { getStore } from "@/lib/store";

const PREVIEW_QUESTION = "Do you ship to Ireland?";

export default async function ChannelsPage() {
  const store = await getStore();
  const workspace = await store.workspace();
  const preview = await widgetPreview(PREVIEW_QUESTION);
  const host = workspace.supportEmail.split("@")[1];

  const channels = [
    { icon: "✉️", title: "Support email", connected: true, body: `${workspace.supportEmail} forwards here. Replies go out from the same address.`, action: "Settings",
      detail: `Forward ${workspace.supportEmail} to inbound@helpdeck.local. In this demo, email is simulated: new tickets come from the seed data and the chat widget.` },
    { icon: "💬", title: "Chat widget", connected: true, body: `Live chat on ${host}. Shows AI answers instantly, hands off to an agent when needed.`, action: "Customise widget", href: "#customise" },
    { icon: "🛒", title: "Online store", connected: true, body: "Pulls orders, tracking and customer history into each ticket.", action: "Settings",
      detail: "Orders and tracking come from a mocked store adapter with seeded data. A real Shopify or WooCommerce adapter would implement the same interface." },
    { icon: "📷", title: "Instagram DMs", connected: false, body: "Answer product questions from your Instagram inbox.", action: "Connect", detail: "Not available in this demo." },
    { icon: "📱", title: "WhatsApp Business", connected: false, body: "Order updates and support over WhatsApp.", action: "Connect", detail: "Not available in this demo." },
    { icon: "🔗", title: "Webhook", connected: false, body: "Send ticket events to your own systems.", action: "Set up", detail: "Not available in this demo." },
  ];

  const hours = [["Mon – Fri", "08:00 – 20:00"], ["Saturday", "10:00 – 16:00"], ["Sunday", "AI answers only"]];

  return (
    <>
      <PageHeader title="Channels" />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-6 p-8">
        <div>
          <p className="-mt-1 text-[15px] text-gray-700">Every message from these channels lands in one inbox, with the customer&apos;s orders next to it.</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {channels.map((c) => (
              <Card key={c.title} className="flex min-h-[232px] flex-col px-6 py-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl" aria-hidden>{c.icon}</span>
                  {c.connected ? <Badge tone="green">Connected</Badge> : <Badge>Not connected</Badge>}
                </div>
                <p className="mt-4 text-[17px] font-bold">{c.title}</p>
                <p className="mt-1 text-sm leading-[21px] text-gray-400">{c.body}</p>
                <div className="mt-auto pt-4">
                  {c.href ? (
                    <a href={c.href} className={buttonClass("secondary")}>{c.action}</a>
                  ) : (
                    <details className="group">
                      <summary className={`${buttonClass("secondary")} cursor-pointer list-none`}>{c.action}</summary>
                      <p className="mt-2 text-[13px] text-gray-600">{c.detail}</p>
                    </details>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-0">
          <WidgetPreview settings={workspace.widget} preview={{ question: PREVIEW_QUESTION, ...preview }} />
          <Card className="mt-[-1px] rounded-t-none border-t-0 px-[22px] py-5">
            <p className="text-[17px] font-bold">Business hours</p>
            <p className="text-[13px] text-gray-400">Europe/London</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {hours.map(([d, h]) => (
                <div key={d} className="flex justify-between"><dt className="text-gray-700">{d}</dt><dd className="font-bold">{h}</dd></div>
              ))}
            </dl>
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-gray-700">First reply target</span><span className="font-bold">15 min</span>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
