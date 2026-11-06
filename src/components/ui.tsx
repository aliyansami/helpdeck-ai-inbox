import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export type BadgeTone = "green" | "yellow" | "blue" | "grey" | "red" | "orange";

const BADGE: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-100 text-amber-800",
  blue: "bg-blue-50 text-blue-700",
  grey: "bg-gray-100 text-gray-700",
  red: "bg-red-50 text-red-700",
  orange: "bg-orange-50 text-orange-700",
};

export function Badge({ tone = "grey", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold", BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function tagTone(tag: string): BadgeTone {
  switch (tag.toLowerCase()) {
    case "delivery delay": return "yellow";
    case "exchange": case "cancellation": return "blue";
    case "billing": case "damage": case "refund": return "orange";
    default: return "grey";
  }
}

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost";
const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-orange text-white hover:bg-orange-600 border border-orange",
  secondary: "bg-white text-ink border border-line hover:bg-gray-50",
  dark: "bg-navy text-white border border-navy",
  ghost: "text-ink hover:bg-gray-100 border border-transparent",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: "sm" | "md" = "md") {
  return cx(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
    BUTTON[variant],
  );
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <button {...props} className={cx(buttonClass(variant, size), className)} />;
}

export function LinkButton({ variant = "secondary", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return <Link {...props} className={cx(buttonClass(variant, size), className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-line bg-white", className)}>{children}</div>;
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md bg-orange text-[15px] font-bold text-white">H</span>
      <span className={cx("text-[22px] font-bold tracking-tight", dark ? "text-white" : "text-navy")}>Helpdeck</span>
    </span>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("px-5 py-3.5 text-[15px]", className)}>{children}</td>;
}
