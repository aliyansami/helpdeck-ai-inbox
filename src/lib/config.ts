export const hasOpenAI = () => !!process.env.OPENAI_API_KEY;
export const hasDatabase = () => !!process.env.DATABASE_URL;

export function modeLabel() {
  if (hasOpenAI() && hasDatabase()) return "Live";
  if (!hasOpenAI() && !hasDatabase()) return "Demo";
  return hasOpenAI() ? "OpenAI · in-memory data" : "Mock drafts · Postgres";
}
