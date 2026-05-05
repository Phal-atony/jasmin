"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CurrencyToggle from "./CurrencyToggle";

const NAV = [
  { href: "/", label: "ទំព័រដើម" },
  { href: "/#games", label: "ហ្គេម" },
  { href: "/order", label: "តាមដានការបញ្ជាទិញ" },
  { href: "/#faq", label: "FAQ" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b-2 border-pink-200 bg-white/90 backdrop-blur-xl shadow-lg shadow-pink-200/40"
          : "border-b-2 border-transparent bg-white/70 backdrop-blur-md"
      }`}
    >
      {/* Pink top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-pink-400 to-transparent opacity-80" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg shadow-pink-300/50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
               style={{ background: "linear-gradient(135deg,#E91E8C,#FF6EB4)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="currentColor"/>
            </svg>
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 opacity-50 blur-lg -z-10 transition-opacity duration-300 group-hover:opacity-80" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-extrabold tracking-tight text-pink-800">
              JASMIN<span className="text-pink-500">TOPUP</span>
            </span>
            <span className="text-[9px] text-pink-400 tracking-widest font-bold uppercase">
              Instant · Secure · 24/7
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border-2 border-pink-200 bg-pink-50/80 px-2 py-1.5 backdrop-blur-md">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href.replace(/#.*/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1.5 text-sm font-bold rounded-full transition-all duration-300 ${
                  active ? "text-white" : "text-pink-700 hover:text-pink-500"
                }`}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full -z-0 shadow-md shadow-pink-300/50"
                        style={{ background: "linear-gradient(135deg,#E91E8C,#FF6EB4)" }} />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <CurrencyToggle className="hidden sm:inline-flex" />
          <Link
            href="/order"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border-2 border-pink-300 bg-white px-4 py-2 text-sm font-bold text-pink-600 transition-all hover:border-pink-500 hover:bg-pink-50 hover:shadow-md hover:shadow-pink-200/60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            តាមដានការបញ្ជាទិញ
          </Link>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-pink-200 bg-white text-pink-600"
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className={`md:hidden overflow-hidden border-t-2 border-pink-200 bg-white/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out ${mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="flex flex-col p-4 gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-pink-700 hover:bg-pink-50 hover:text-pink-500 transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-pink-200 bg-pink-50 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-500">រូបិយប័ណ្ណ</span>
            <CurrencyToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
