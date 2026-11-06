import type {
  ActivityEntry,
  Agent,
  Article,
  Conversation,
  Customer,
  HistoryTicket,
  KnowledgeGap,
  Message,
  Order,
  Rule,
  Workspace,
} from "./types";

export interface SeedData {
  workspace: Workspace;
  agents: Agent[];
  customers: Customer[];
  orders: Order[];
  conversations: Conversation[];
  messages: Message[];
  articles: Article[];
  rules: Rule[];
  activity: ActivityEntry[];
  gaps: KnowledgeGap[];
  history: HistoryTicket[];
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Small deterministic PRNG so the demo data is identical on every boot. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const weekday = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });

/** Build the North & Oak demo workspace relative to `now`, so timestamps always look fresh. */
export function buildSeed(now: Date = new Date()): SeedData {
  const t = now.getTime();
  const ago = (ms: number) => new Date(t - ms).toISOString();
  const ahead = (ms: number) => new Date(t + ms).toISOString();

  const agents: Agent[] = [
    { id: "sara", name: "Sara Malik", role: "Support lead", color: "#7C5CFC" },
    { id: "tariq", name: "Tariq Baig", role: "Support agent", color: "#2F80ED" },
    { id: "hannah", name: "Hannah Lee", role: "Support agent", color: "#DB2777" },
    { id: "kofi", name: "Kofi Nyarko", role: "Support agent", color: "#16A34A" },
    { id: "ana", name: "Ana Ruiz", role: "Support agent", color: "#F59E0B" },
  ];

  const customers: Customer[] = [
    { id: "c-laura", name: "Laura Reyes", email: "laura.reyes@mail.com", color: "#0F8B6E", since: "2024-03-12" },
    { id: "c-james", name: "James Okafor", email: "james.okafor@mail.com", color: "#DB2777", since: "2025-01-08" },
    { id: "c-aisha", name: "Aisha Mirza", email: "aisha.m@mail.com", color: "#8B5CF6", since: "2025-06-20" },
    { id: "c-daniel", name: "Daniel Park", email: "dpark@mail.com", color: "#2F80ED", since: "2023-11-02" },
    { id: "c-emma", name: "Emma Walsh", email: "emma.walsh@mail.ie", color: "#F59E0B", since: ago(41 * MIN) },
    { id: "c-rohan", name: "Rohan Kapoor", email: "rohan.k@mail.com", color: "#16A34A", since: "2025-09-14" },
    { id: "c-marta", name: "Marta Bianchi", email: "marta.bianchi@mail.it", color: "#6366F1", since: "2024-08-30" },
    { id: "c-priya", name: "Priya Shah", email: "priya.shah@mail.com", color: "#E11D48", since: "2025-04-03" },
    { id: "c-owen", name: "Owen Hughes", email: "owen.hughes@mail.co.uk", color: "#0EA5E9", since: "2025-02-17" },
  ];

  // Laura's order: dispatched 7 days ago, stuck at the depot for 5 days, out tomorrow.
  const lauraDispatched = new Date(t - 7 * DAY);
  const lauraDepot = new Date(t - 5 * DAY);
  const lauraExpected = new Date(t + 1 * DAY);

  const orders: Order[] = [
    // Laura: 4 orders, $412.60 lifetime
    {
      id: "48213", customerId: "c-laura", placedAt: ago(8 * DAY), total: 86, currency: "USD", status: "in_transit",
      carrier: "Royal Courier",
      items: [{ name: "Merino throw blanket", variant: "Oat", qty: 1, price: 86 }],
      events: [
        { label: "Dispatched", detail: "Royal Courier", at: lauraDispatched.toISOString(), done: true },
        { label: "At Leeds depot", detail: "Sorting delay reported by courier", at: lauraDepot.toISOString(), done: true },
        { label: "Out for delivery", detail: "Expected", at: lauraExpected.toISOString(), done: false },
      ],
      expectedDelivery: lauraExpected.toISOString(),
    },
    { id: "47102", customerId: "c-laura", placedAt: ago(70 * DAY), total: 124.6, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Linen duvet cover", variant: "Double", qty: 1, price: 124.6 }], events: [] },
    { id: "45390", customerId: "c-laura", placedAt: ago(160 * DAY), total: 98, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Stoneware mug set", qty: 1, price: 98 }], events: [] },
    { id: "41877", customerId: "c-laura", placedAt: ago(240 * DAY), total: 104, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Oak serving board", qty: 1, price: 104 }], events: [] },
    // James: wrong size
    {
      id: "48190", customerId: "c-james", placedAt: ago(5 * DAY), total: 64, currency: "USD", status: "delivered", carrier: "Royal Courier",
      items: [{ name: "Waffle robe", variant: "Size S (ordered M)", qty: 1, price: 64 }],
      events: [
        { label: "Dispatched", detail: "Royal Courier", at: ago(4 * DAY), done: true },
        { label: "Delivered", detail: "Left with neighbour", at: ago(1 * DAY), done: true },
      ],
    },
    { id: "46011", customerId: "c-james", placedAt: ago(120 * DAY), total: 58, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Cotton tea towels", qty: 2, price: 29 }], events: [] },
    // Aisha: promo
    {
      id: "48231", customerId: "c-aisha", placedAt: ago(20 * MIN), total: 72, currency: "USD", status: "processing", carrier: "Royal Courier",
      items: [{ name: "Ceramic table lamp", qty: 1, price: 72 }], events: [], discountCode: "SAVE15",
    },
    // Daniel: double charge
    {
      id: "48177", customerId: "c-daniel", placedAt: ago(2 * DAY), total: 149, currency: "USD", status: "dispatched", carrier: "Royal Courier",
      items: [{ name: "Wool rug", variant: "120 x 170", qty: 1, price: 149 }],
      events: [{ label: "Dispatched", detail: "Royal Courier", at: ago(1 * DAY), done: true }],
      charges: 2,
    },
    { id: "44120", customerId: "c-daniel", placedAt: ago(200 * DAY), total: 389, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Oak side table", qty: 1, price: 389 }], events: [] },
    { id: "42008", customerId: "c-daniel", placedAt: ago(320 * DAY), total: 212, currency: "USD", status: "delivered", carrier: "Royal Courier", items: [{ name: "Linen curtains", qty: 1, price: 212 }], events: [] },
    // Rohan: cancel before it ships
    {
      id: "48228", customerId: "c-rohan", placedAt: ago(75 * MIN), total: 54, currency: "USD", status: "processing", carrier: "Royal Courier",
      items: [{ name: "Scented candle trio", qty: 1, price: 54 }], events: [],
    },
    // Marta: damaged
    {
      id: "48150", customerId: "c-marta", placedAt: ago(6 * DAY), total: 118, currency: "USD", status: "delivered", carrier: "Royal Courier",
      items: [{ name: "Glass carafe set", qty: 1, price: 118 }],
      events: [
        { label: "Dispatched", detail: "Royal Courier", at: ago(5 * DAY), done: true },
        { label: "Delivered", detail: "Signed for", at: ago(1 * DAY), done: true },
      ],
    },
    // Owen: where is my order (waiting on customer)
    {
      id: "48201", customerId: "c-owen", placedAt: ago(3 * DAY), total: 46, currency: "USD", status: "out_for_delivery", carrier: "Royal Courier",
      items: [{ name: "Linen napkins", qty: 4, price: 11.5 }],
      events: [
        { label: "Dispatched", detail: "Royal Courier", at: ago(2 * DAY), done: true },
        { label: "Out for delivery", detail: "With driver", at: ago(3 * HOUR), done: true },
      ],
      expectedDelivery: ahead(5 * HOUR),
    },
  ];

  const conv = (
    id: string, number: number, customerId: string, subject: string, minutesAgo: number,
    extra: Partial<Conversation> = {},
  ): Conversation => ({
    id, number, customerId, subject, channel: "email", status: "open", tags: [], priority: "normal",
    createdAt: ago(minutesAgo * MIN), updatedAt: ago(minutesAgo * MIN), ...extra,
  });

  const conversations: Conversation[] = [
    conv("t-9931", 9931, "c-laura", `Parcel stuck since ${weekday(lauraDepot)}`, 4, { orderId: "48213", assigneeId: "sara" }),
    conv("t-9930", 9930, "c-james", "Wrong size sent, need a swap", 12, { orderId: "48190", assigneeId: "sara" }),
    conv("t-9929", 9929, "c-aisha", "Discount code SAVE15 not working", 18, { orderId: "48231", channel: "chat" }),
    conv("t-9928", 9928, "c-daniel", "Charged twice for one order", 26, { orderId: "48177", tags: ["Billing"] }),
    conv("t-9927", 9927, "c-emma", "Do you ship to Ireland?", 41, { channel: "chat" }),
    conv("t-9926", 9926, "c-rohan", "Cancel order before it ships", 62, { orderId: "48228", assigneeId: "sara" }),
    conv("t-9925", 9925, "c-marta", "Item arrived damaged", 70, { orderId: "48150" }),
    conv("t-9921", 9921, "c-owen", "Where is my order?", 6 * 60, { orderId: "48201", status: "waiting" }),
    conv("t-9918", 9918, "c-priya", "Is the waffle robe back in stock soon?", 26 * 60, { status: "snoozed", channel: "chat", assigneeId: "hannah" }),
  ];

  const msg = (id: string, conversationId: string, author: Message["author"], authorName: string, body: string, minutesAgo: number, attachments?: number): Message => ({
    id, conversationId, author, authorName, body, at: ago(minutesAgo * MIN), attachments,
  });

  const depotDay = weekday(lauraDepot);
  const messages: Message[] = [
    msg("m1", "t-9931", "customer", "Laura Reyes", `Hi, my parcel was meant to arrive by now and tracking hasn't moved since ${depotDay}. It's a birthday present for this weekend. Can you check what's going on?`, 4),
    msg("m2", "t-9931", "note", "Tariq Baig", "Courier confirmed a backlog at the Leeds depot this week. Most parcels are going out 2 days late.", 3),
    msg("m3", "t-9930", "customer", "James Okafor", "Hi, I ordered the waffle robe in a medium but the label says small. Can I swap it for a medium? I haven't worn it.", 12),
    msg("m4", "t-9929", "customer", "Aisha Mirza", "Hey, I'm trying to use SAVE15 at checkout on the table lamp and it says the code isn't valid. Is it expired?", 18),
    msg("m5", "t-9928", "customer", "Daniel Park", "I was charged twice for order 48177, $149 each. Can you refund the extra charge please?", 26),
    msg("m6", "t-9927", "customer", "Emma Walsh", "Hi! Do you ship to Ireland, and how much is delivery?", 41),
    msg("m7", "t-9926", "customer", "Rohan Kapoor", "I just placed order 48228 but ordered the wrong scent. Can you cancel it before it ships?", 62),
    msg("m8", "t-9925", "customer", "Marta Bianchi", "My glass carafe set arrived today and one of the glasses is cracked. The box looked fine from the outside.", 70),
    msg("m11", "t-9918", "customer", "Priya Shah", "Hi, is the waffle robe in medium coming back in stock soon? I'd like to order two.", 26 * 60),
    msg("m12", "t-9918", "note", "Hannah Lee", "Restock lands next Wednesday. Snoozed until then so we can reply with a link.", 25 * 60),
    msg("m9", "t-9921", "customer", "Owen Hughes", "Hi, where is my order 48201? I need the napkins for Saturday.", 7 * 60),
    msg("m10", "t-9921", "agent", "Sara Malik", "Hi Owen, your order is out for delivery today with Royal Courier, so you'll have the napkins well before Saturday. Let me know if it doesn't turn up by this evening.\n\nSara", 6 * 60),
  ];

  const article = (
    id: string, title: string, category: string, body: string, timesCited: number,
    extra: Partial<Article> = {},
  ): Article => ({
    id, title, category, body, kind: "help", status: "published", updatedAt: ago(2 * HOUR), timesCited, ...extra,
  });

  const articles: Article[] = [
    article("a-late", "Late deliveries: what we do", "Shipping",
      "Most orders arrive within 2-4 working days of dispatch. If tracking hasn't updated for 3 working days, we check with the courier. If a parcel is more than 2 working days late, we send a free replacement by next-day delivery, or a full refund if you'd rather. Gifts with a date: tell us the date and we'll prioritise.", 412),
    article("a-replace", "Replacements & refunds", "Returns",
      "We replace lost, late or faulty items free of charge. Refunds go back to the original payment method within 3-5 working days once approved. Refunds for duplicate charges are handled by our finance team and need a person to approve them.", 388),
    article("a-exchange", "Exchanging for a different size", "Returns",
      "You can exchange unworn items within 30 days. We send the new size out as soon as we receive a return scan, and the return label is free. Reply with the size you need and we'll email a prepaid label.", 241),
    article("a-shipping", "Shipping countries and costs", "Shipping",
      "We ship to the UK, Ireland and most of the EU. Ireland: 3-5 working days, free over €60, otherwise €6.95. EU: 4-7 working days, €9.95. UK: 1-3 working days, free over £50.", 197),
    article("a-discount", "Using discount codes", "Payments",
      "Codes are case-sensitive and one code applies per order. SAVE15 gives 15% off full-price items and expired on the last day of last month. Codes can't be applied to sale items or gift cards. If a valid code fails, clear your basket and add the items again.", 156,
      { updatedAt: ago(26 * HOUR), updatedBy: "Sara" }),
    article("a-cancel", "Cancelling an order", "Orders",
      "Orders can be cancelled free of charge until they are dispatched, usually within 2 hours on weekdays. Once an order has shipped, it can be returned for a refund instead. Cancellations are confirmed by an agent.", 133),
    article("a-damage", "Damaged or faulty items", "Returns",
      "If something arrives damaged, broken or faulty, send us a photo of the item and the box within 14 days. We'll send a replacement straight away, and you don't need to return the damaged item.", 98),
    article("a-gift", "Gift wrapping and notes", "Orders",
      "Gift wrapping is $4 per item and includes a handwritten note. Add it at checkout. Prices are never shown on the packing slip for gift orders.", 41),
    article("a-address", "Changing your delivery address", "Orders",
      "We can change the delivery address before an order is dispatched. After dispatch, you can redirect the parcel using the courier's tracking page.", 0,
      { status: "draft", updatedAt: ago(5 * HOUR) }),
    article("a-care", "Product care and washing", "Products",
      "Wash linen and cotton at 40°C and line dry. Merino and wool: cool hand wash only. Stoneware is dishwasher safe; glassware should be washed by hand.", 37),
    article("a-klarna", "Paying with Klarna or PayPal", "Payments",
      "We accept cards, PayPal and Klarna (pay in 3). Klarna refunds go back to your Klarna account and adjust any remaining instalments.", 29),
    article("a-wholesale", "Wholesale and bulk orders", "Orders",
      "For orders of 20 or more items, email wholesale@northandoak.com for trade pricing. Lead time is usually 2-3 weeks.", 12),
    article("n-refund", "Refund approval policy", "Internal",
      "Refunds over $50 and any duplicate-charge refund need approval from Sara or the finance queue. Never promise a refund date before finance has confirmed.", 64,
      { kind: "internal" }),
    article("n-courier", "Courier escalation contacts", "Internal",
      "Royal Courier account manager: escalate via the courier portal. Depot backlogs are posted in #ops-shipping.", 22,
      { kind: "internal" }),
  ];

  const rules: Rule[] = [
    {
      id: "r-autosend", name: "Auto-send order status replies", enabled: true, trigger: "message_received",
      conditions: [{ type: "confidence", level: "high" }, { type: "topic", topic: "where_is_my_order" }],
      actions: [{ type: "auto_send" }], runs: 214, lastRunAt: ago(6 * MIN),
    },
    {
      id: "r-double", name: "Escalate double charges", enabled: true, trigger: "message_received",
      conditions: [{ type: "tag", tag: "Billing" }, { type: "keywords", any: ["charged twice", "refund"] }],
      actions: [{ type: "set_queue", queue: "Finance" }, { type: "set_priority", priority: "urgent" }],
      runs: 19, lastRunAt: ago(26 * MIN),
    },
    {
      id: "r-refund-tag", name: "Tag refund requests", enabled: true, trigger: "message_received",
      conditions: [{ type: "keywords", any: ["refund", "money back", "charged twice"] }],
      actions: [{ type: "add_tag", tag: "Refund" }], runs: 57, lastRunAt: ago(26 * MIN),
    },
    {
      id: "r-vip", name: "VIP customers to a person", enabled: true, trigger: "ticket_created",
      conditions: [{ type: "lifetime_spend_over", amount: 500 }],
      actions: [{ type: "skip_auto_send" }, { type: "assign", agentId: "sara" }],
      runs: 41, lastRunAt: ago(2 * HOUR),
    },
    {
      id: "r-chase", name: "Chase quiet tickets", enabled: true, trigger: "waiting_on_customer",
      conditions: [{ type: "no_reply_hours", hours: 48 }],
      actions: [{ type: "follow_up", closeAfterDays: 5 }], runs: 88, lastRunAt: ago(1 * HOUR),
    },
    {
      id: "r-damage", name: "Damage photos", enabled: true, trigger: "message_received",
      conditions: [{ type: "tag", tag: "Damage" }, { type: "no_attachment" }],
      actions: [{ type: "request_photo" }], runs: 23, lastRunAt: ago(1 * HOUR),
    },
    {
      id: "r-weekend", name: "Weekend auto-reply", enabled: false, trigger: "chat_received",
      conditions: [{ type: "weekend" }],
      actions: [{ type: "reply", text: "Thanks for getting in touch! Our team is back Monday 08:00. Most chats are answered within 15 minutes during opening hours." }],
      runs: 12, pausedBy: "Sara", pausedAt: ago(7 * DAY),
    },
  ];

  const activity: ActivityEntry[] = [
    { id: "ac1", at: ago(6 * MIN), ruleId: "r-autosend", ruleName: "Auto-send order status replies", ticket: "#9921 · Where is my order?", result: "Sent", tone: "success" },
    { id: "ac2", at: ago(26 * MIN), ruleId: "r-double", ruleName: "Escalate double charges", ticket: "#9928 · Charged twice for one order", result: "Escalated to Finance", tone: "warning" },
    { id: "ac3", at: ago(42 * MIN), ruleId: "r-autosend", ruleName: "Auto-send order status replies", ticket: "#9912 · Tracking not updating", result: "Skipped · confidence Medium", tone: "neutral" },
  ];

  const gaps: KnowledgeGap[] = [
    { question: "Do you price match?", count: 6 },
    { question: "Can I change the delivery address?", count: 5 },
    { question: "Are your boxes recyclable?", count: 3 },
  ];

  const workspace: Workspace = {
    storeName: "North & Oak",
    helpCenterUrl: "help.northandoak.com",
    supportEmail: "support@northandoak.com",
    currentAgentId: "sara",
    guardrails: { refunds: true, cancellations: true, lowConfidence: true },
    widget: { title: "North & Oak support", subtitle: "Usually replies in under 5 minutes", color: "#14213D" },
  };

  return {
    workspace, agents, customers, orders, conversations, messages, articles, rules, activity, gaps,
    history: buildHistory(now),
  };
}

const TOPIC_WEIGHTS: [string, number][] = [
  ["Delivery delay", 31], ["Returns & exchanges", 24], ["Order changes", 16],
  ["Payments & promo", 14], ["Product questions", 11], ["Other", 4],
];
const AGENT_WEIGHTS: [string, number][] = [["sara", 412], ["tariq", 356], ["hannah", 298], ["kofi", 241], ["ana", 187]];

function pick(rand: () => number, weights: [string, number][]) {
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [k, w] of weights) {
    if ((r -= w) <= 0) return k;
  }
  return weights[weights.length - 1][0];
}

/** 60 days of resolved tickets for the reports page. Deterministic for a given day. */
export function buildHistory(now: Date): HistoryTicket[] {
  const rand = mulberry32(20261106);
  const out: HistoryTicket[] = [];
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let d = 59; d >= 0; d--) {
    const dayStart = startOfToday - d * DAY;
    const dow = new Date(dayStart).getUTCDay();
    const recent = d < 21;
    const base = dow === 0 || dow === 6 ? 32 : 62;
    const count = Math.round(base * (recent ? 1 : 0.84) * (0.8 + rand() * 0.45));
    for (let i = 0; i < count; i++) {
      const fromDraft = rand() < (recent ? 0.66 : 0.55);
      const edited = fromDraft && rand() < (recent ? 0.06 : 0.12);
      out.push({
        id: `h-${d}-${i}`,
        resolvedAt: new Date(dayStart + Math.floor(rand() * DAY * 0.95)).toISOString(),
        firstReplySeconds: Math.round((fromDraft ? 140 : 260) + rand() * (recent ? 180 : 260)),
        topic: pick(rand, TOPIC_WEIGHTS),
        agentId: pick(rand, AGENT_WEIGHTS),
        fromDraft,
        edited,
        rating: rand() < 0.37 ? (rand() < 0.78 ? 5 : rand() < 0.7 ? 4 : 3) : undefined,
      });
    }
  }
  return out;
}
