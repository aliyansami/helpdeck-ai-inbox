import { boolean, integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { Action, Condition, Draft, OrderEvent, OrderItem, Workspace } from "@/lib/types";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const workspace = pgTable("workspace", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").$type<Workspace>().notNull(),
});

export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  color: text("color").notNull(),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  color: text("color").notNull(),
  since: text("since").notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  placedAt: ts("placed_at").notNull(),
  total: real("total").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  carrier: text("carrier").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  events: jsonb("events").$type<OrderEvent[]>().notNull(),
  expectedDelivery: ts("expected_delivery"),
  discountCode: text("discount_code"),
  charges: integer("charges"),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  number: integer("number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  orderId: text("order_id"),
  subject: text("subject").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  assigneeId: text("assignee_id"),
  priority: text("priority").notNull(),
  queue: text("queue"),
  autoSendBlocked: boolean("auto_send_blocked"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  draft: jsonb("draft").$type<Draft>(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  at: ts("at").notNull(),
  attachments: integer("attachments"),
});

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  body: text("body").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  updatedAt: ts("updated_at").notNull(),
  updatedBy: text("updated_by"),
  timesCited: integer("times_cited").notNull().default(0),
});

export const rules = pgTable("rules", {
  id: text("id").primaryKey(),
  position: serial("position"),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull(),
  trigger: text("trigger").notNull(),
  conditions: jsonb("conditions").$type<Condition[]>().notNull(),
  actions: jsonb("actions").$type<Action[]>().notNull(),
  runs: integer("runs").notNull().default(0),
  lastRunAt: ts("last_run_at"),
  pausedBy: text("paused_by"),
  pausedAt: ts("paused_at"),
});

export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  at: ts("at").notNull(),
  ruleId: text("rule_id").notNull(),
  ruleName: text("rule_name").notNull(),
  ticket: text("ticket").notNull(),
  result: text("result").notNull(),
  tone: text("tone").notNull(),
});

export const gaps = pgTable("knowledge_gaps", {
  question: text("question").primaryKey(),
  count: integer("count").notNull().default(1),
});

export const history = pgTable("ticket_history", {
  id: text("id").primaryKey(),
  resolvedAt: ts("resolved_at").notNull(),
  firstReplySeconds: integer("first_reply_seconds").notNull(),
  topic: text("topic").notNull(),
  agentId: text("agent_id").notNull(),
  fromDraft: boolean("from_draft").notNull(),
  edited: boolean("edited").notNull(),
  rating: integer("rating"),
});
