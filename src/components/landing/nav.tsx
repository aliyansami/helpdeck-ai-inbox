"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cx, LinkButton, Logo } from "@/components/ui";

export function Nav({ github }: { github: string }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cx("fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-300", scrolled ? "border-b border-line bg-white/90 backdrop-blur" : "border-b border-transparent")}>
      <div className="mx-auto flex h-[72px] max-w-[1408px] items-center gap-9 px-4 sm:px-6">
        <Link href="/" aria-label="Helpdeck home"><Logo /></Link>
        <nav className="hidden gap-8 text-[15px] font-medium text-gray-700 md:flex">
          <a href="#watch" className="link-draw">Product</a>
          <a href="#ask" className="link-draw">Try it</a>
          <a href="#how" className="link-draw">How it works</a>
          <a href={github} className="link-draw">Source code</a>
        </nav>
        <div className="ml-auto flex items-center gap-6">
          <Link href="/inbox" className="link-draw hidden text-[15px] font-medium text-gray-700 sm:block">Log in</Link>
          <LinkButton href="/inbox" variant="primary" className="h-[38px]">Open the demo</LinkButton>
        </div>
      </div>
    </header>
  );
}
