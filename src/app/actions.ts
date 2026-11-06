"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateDraft, sendReply } from "@/lib/service";
import { getStore } from "@/lib/store";
import type { Article, ConversationStatus, Guardrails, Rule, Tone, WidgetSettings } from "@/lib/types";

const refresh = () => revalidatePath("/", "layout");

// ---- Inbox ----

export async function ensureDraftAction(conversationId: string) {
  const store = await getStore();
  const c = await store.conversation(conversationId);
  if (c && !c.draft && c.status === "open") {
    await generateDraft(conversationId);
    refresh();
  }
}

export async function regenerateDraftAction(conversationId: string, tone: Tone) {
  await generateDraft(conversationId, { tone, regenerate: true });
  refresh();
}

export async function sendReplyAction(conversationId: string, body: string) {
  await sendReply(conversationId, body);
  refresh();
}

export async function assignAction(conversationId: string, agentId: string | null) {
  const store = await getStore();
  await store.updateConversation(conversationId, { assigneeId: agentId ?? undefined });
  refresh();
}

export async function setStatusAction(conversationId: string, status: ConversationStatus) {
  const store = await getStore();
  await store.updateConversation(conversationId, { status, updatedAt: new Date().toISOString() });
  refresh();
}

// ---- Knowledge ----

export async function saveArticleAction(formData: FormData) {
  const store = await getStore();
  const id = String(formData.get("id") || "") || `a-${randomUUID().slice(0, 8)}`;
  const existing = (await store.articles()).find((a) => a.id === id);
  const workspace = await store.workspace();
  const agent = (await store.agents()).find((a) => a.id === workspace.currentAgentId);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title || !body) throw new Error("Title and body are required");
  const article: Article = {
    id,
    title,
    body,
    category: String(formData.get("category") || "General").trim(),
    kind: formData.get("kind") === "internal" ? "internal" : "help",
    status: formData.get("status") === "draft" ? "draft" : "published",
    updatedAt: new Date().toISOString(),
    updatedBy: agent?.name.split(" ")[0],
    timesCited: existing?.timesCited ?? 0,
  };
  await store.saveArticle(article);
  refresh();
  redirect("/knowledge");
}

export async function deleteArticleAction(id: string) {
  const store = await getStore();
  await store.deleteArticle(id);
  refresh();
  redirect("/knowledge");
}

/** Bulk import: each "# Heading" starts a new article. */
export async function importArticlesAction(formData: FormData) {
  const store = await getStore();
  const text = String(formData.get("text") || "");
  const category = String(formData.get("category") || "General").trim() || "General";
  const sections = text.split(/^#\s+/m).map((s) => s.trim()).filter(Boolean);
  for (const section of sections) {
    const [title, ...rest] = section.split("\n");
    const body = rest.join("\n").trim();
    if (!title.trim() || !body) continue;
    await store.saveArticle({
      id: `a-${randomUUID().slice(0, 8)}`, title: title.trim(), body, category, kind: "help", status: "published",
      updatedAt: new Date().toISOString(), updatedBy: "Import", timesCited: 0,
    });
  }
  refresh();
  redirect("/knowledge");
}

/** Turn unanswered questions into draft articles for an agent to finish. */
export async function draftGapArticlesAction() {
  const store = await getStore();
  const gaps = await store.gaps();
  for (const g of gaps) {
    await store.saveArticle({
      id: `a-${randomUUID().slice(0, 8)}`,
      title: g.question.replace(/\?$/, ""),
      body: `Customers asked “${g.question}” ${g.count} times this week. Write the answer here, then publish so Helpdeck can use it.`,
      category: "Unsorted", kind: "help", status: "draft", updatedAt: new Date().toISOString(), timesCited: 0,
    });
  }
  await store.clearGaps();
  refresh();
}

// ---- Automations ----

export async function toggleRuleAction(id: string, enabled: boolean) {
  const store = await getStore();
  const rule = (await store.rules()).find((r) => r.id === id);
  if (!rule) return;
  const workspace = await store.workspace();
  const agent = (await store.agents()).find((a) => a.id === workspace.currentAgentId);
  await store.saveRule({
    ...rule, enabled,
    pausedBy: enabled ? undefined : agent?.name.split(" ")[0],
    pausedAt: enabled ? undefined : new Date().toISOString(),
  });
  refresh();
}

export async function saveRuleAction(rule: Omit<Rule, "runs"> & { runs?: number }) {
  const store = await getStore();
  const existing = (await store.rules()).find((r) => r.id === rule.id);
  if (!rule.name.trim() || rule.actions.length === 0) throw new Error("A rule needs a name and at least one action");
  await store.saveRule({ ...existing, ...rule, id: rule.id || `r-${randomUUID().slice(0, 8)}`, runs: existing?.runs ?? 0 });
  refresh();
}

export async function deleteRuleAction(id: string) {
  const store = await getStore();
  await store.deleteRule(id);
  refresh();
  redirect("/automations");
}

export async function saveGuardrailsAction(guardrails: Guardrails) {
  const store = await getStore();
  await store.updateWorkspace({ guardrails });
  refresh();
}

// ---- Channels ----

export async function saveWidgetAction(widget: WidgetSettings) {
  const store = await getStore();
  await store.updateWorkspace({ widget });
  refresh();
}
