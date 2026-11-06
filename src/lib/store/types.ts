import type {
  ActivityEntry, Agent, Article, Conversation, Customer, HistoryTicket, KnowledgeGap, Message, Order, Rule, Workspace,
} from "../types";

/** Persistence boundary. `MemoryStore` backs demo mode, `PostgresStore` backs real mode. */
export interface Store {
  readonly kind: "memory" | "postgres";
  workspace(): Promise<Workspace>;
  updateWorkspace(patch: Partial<Workspace>): Promise<void>;
  agents(): Promise<Agent[]>;

  customers(): Promise<Customer[]>;
  customerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(c: Customer): Promise<void>;

  orders(): Promise<Order[]>;

  conversations(): Promise<Conversation[]>;
  conversation(id: string): Promise<Conversation | undefined>;
  createConversation(c: Conversation): Promise<void>;
  updateConversation(id: string, patch: Partial<Conversation>): Promise<void>;
  nextTicketNumber(): Promise<number>;

  messages(conversationId: string): Promise<Message[]>;
  addMessage(m: Message): Promise<void>;

  articles(): Promise<Article[]>;
  saveArticle(a: Article): Promise<void>;
  deleteArticle(id: string): Promise<void>;
  bumpCitations(ids: string[]): Promise<void>;

  rules(): Promise<Rule[]>;
  saveRule(r: Rule): Promise<void>;
  deleteRule(id: string): Promise<void>;

  activity(limit?: number): Promise<ActivityEntry[]>;
  addActivity(a: ActivityEntry): Promise<void>;

  gaps(): Promise<KnowledgeGap[]>;
  recordGap(question: string): Promise<void>;
  clearGaps(): Promise<void>;

  history(sinceIso: string): Promise<HistoryTicket[]>;
  addHistory(h: HistoryTicket): Promise<void>;
}
