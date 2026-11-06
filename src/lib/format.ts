const MIN = 60_000;

export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MIN) return "now";
  if (diff < 60 * MIN) return `${Math.floor(diff / MIN)}m`;
  if (diff < 24 * 60 * MIN) return `${Math.floor(diff / (60 * MIN))}h`;
  return `${Math.floor(diff / (24 * 60 * MIN))}d`;
}

export function relativeLong(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MIN) return "just now";
  if (diff < 60 * MIN) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < 24 * 60 * MIN) return `${Math.floor(diff / (60 * MIN))}h ago`;
  const days = Math.floor(diff / (24 * 60 * MIN));
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "UTC" }).replace(/(\d+) (\w+)/, "$2 $1");

export const dayDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).replace(/,/g, "").replace(/(\w+) (\d+) (\w+)/, "$1 $3 $2");

export const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export function duration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
