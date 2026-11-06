export type Channel = "email" | "chat";
export type ConversationStatus = "open" | "waiting" | "snoozed" | "resolved";
export type Confidence = "high" | "medium" | "low";
export type Tone = "friendly" | "concise" | "formal";

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  color: string;
  since: string; // ISO date
}

export type OrderStatus =
  | "processing"
  | "dispatched"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderEvent {
  label: string;
  detail: string;
  at: string; // ISO
  done: boolean;
}

export interface OrderItem {
  name: string;
  variant?: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string; // store order number, e.g. "48213"
  customerId: string;
  placedAt: string;
  total: number;
  currency: string;
  status: OrderStatus;
  carrier: string;
  items: OrderItem[];
  events: OrderEvent[];
  expectedDelivery?: string;
  discountCode?: string;
  charges?: number; // number of successful card charges, >1 means double charge
}

export type MessageAuthor = "customer" | "agent" | "note" | "ai";

export interface Message {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  at: string;
  attachments?: number;
}

export type SourceKind = "article" | "order" | "tracking" | "note";

export interface Source {
  kind: SourceKind;
  id: string;
  title: string;
  score?: number;
}

export interface Draft {
  body: string;
  confidence: Confidence;
  topic: Topic;
  sources: Source[];
  checks: string[];
  tone: Tone;
  needsAgent: boolean;
  reason?: string;
  /** True when no help article matched at all: shown on the Knowledge page as a gap. */
  gap?: boolean;
  provider: "mock" | "openai";
  attempt: number;
  generatedAt: string;
}

export interface Conversation {
  id: string;
  number: number;
  customerId: string;
  orderId?: string;
  subject: string;
  channel: Channel;
  status: ConversationStatus;
  tags: string[];
  assigneeId?: string;
  priority: "normal" | "urgent";
  queue?: string;
  autoSendBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
  draft?: Draft;
}

export type ArticleKind = "help" | "internal";

export interface Article {
  id: string;
  title: string;
  category: string;
  body: string;
  kind: ArticleKind;
  status: "published" | "draft";
  updatedAt: string;
  updatedBy?: string;
  timesCited: number;
}

export type Topic =
  | "where_is_my_order"
  | "delivery_delay"
  | "exchange"
  | "promo"
  | "billing"
  | "refund"
  | "pre_sale"
  | "cancellation"
  | "damage"
  | "other";

export type RuleTrigger =
  | "message_received"
  | "ticket_created"
  | "chat_received"
  | "waiting_on_customer";

export type Condition =
  | { type: "keywords"; any: string[] }
  | { type: "tag"; tag: string }
  | { type: "topic"; topic: Topic }
  | { type: "confidence"; level: Confidence }
  | { type: "lifetime_spend_over"; amount: number }
  | { type: "weekend" }
  | { type: "no_reply_hours"; hours: number }
  | { type: "no_attachment" }
  | { type: "channel"; channel: Channel };

export type Action =
  | { type: "add_tag"; tag: string }
  | { type: "assign"; agentId: string }
  | { type: "set_priority"; priority: "normal" | "urgent" }
  | { type: "set_queue"; queue: string }
  | { type: "auto_send" }
  | { type: "skip_auto_send" }
  | { type: "reply"; text: string }
  | { type: "follow_up"; closeAfterDays: number }
  | { type: "request_photo" };

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: Condition[];
  actions: Action[];
  runs: number;
  lastRunAt?: string;
  pausedBy?: string;
  pausedAt?: string;
}

export interface Guardrails {
  refunds: boolean;
  cancellations: boolean;
  lowConfidence: boolean;
}

export interface ActivityEntry {
  id: string;
  at: string;
  ruleId: string;
  ruleName: string;
  ticket: string;
  result: string;
  tone: "success" | "warning" | "neutral";
}

export interface KnowledgeGap {
  question: string;
  count: number;
}

export interface HistoryTicket {
  id: string;
  resolvedAt: string;
  firstReplySeconds: number;
  topic: string;
  agentId: string;
  fromDraft: boolean;
  edited: boolean;
  rating?: number; // 1-5
}

export interface WidgetSettings {
  title: string;
  subtitle: string;
  color: string;
}

export interface Workspace {
  storeName: string;
  helpCenterUrl: string;
  supportEmail: string;
  currentAgentId: string;
  guardrails: Guardrails;
  widget: WidgetSettings;
}
