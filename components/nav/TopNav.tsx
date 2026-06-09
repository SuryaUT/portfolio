"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SITE } from "@/lib/site-config";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/#about", label: "About" },
  { href: "/experience", label: "Work" },
  { href: "/projects", label: "Projects" },
  { href: "/research", label: "Publications" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-divider bg-bg/90 backdrop-blur-sm">
      <nav className="content-grid flex items-center justify-between py-4">
        <Link
          href="/"
          className="font-jetbrains text-sm font-medium uppercase tracking-widest text-ink transition-colors hover:text-accent"
        >
          {SITE.initials}
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`font-jetbrains text-[0.6875rem] uppercase tracking-widest transition-colors ${
                  (href === "/#about" ? pathname === "/" : pathname.startsWith(href))
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            className="text-ink md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-divider bg-bg md:hidden">
          <ul className="content-grid flex flex-col gap-5 py-6">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`font-jetbrains text-[0.6875rem] uppercase tracking-widest ${
                    (href === "/#about" ? pathname === "/" : pathname.startsWith(href))
                      ? "text-accent"
                      : "text-ink-muted"
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
