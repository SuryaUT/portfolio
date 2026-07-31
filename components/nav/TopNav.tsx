"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useLenis } from "lenis/react";
import { Menu, X } from "lucide-react";
import { SITE } from "@/lib/site-config";
import ThemeToggle from "./ThemeToggle";

// Section links scroll to home-page anchors; page links (Resume) navigate.
const links = [
  { href: "/#about", label: "About", id: "about" },
  { href: "/#work", label: "Experience", id: "work" },
  { href: "/#projects", label: "Projects", id: "projects" },
  { href: "/#contact", label: "Contact", id: "contact" },
  { href: "/resume", label: "Resume" },
];

const SECTION_IDS = ["about", "work", "projects", "contact"];

export default function TopNav() {
  const pathname = usePathname();
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  // Scroll-spy: highlight the section currently near the top of the viewport.
  useEffect(() => {
    if (pathname !== "/") {
      setActive("");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  function handleClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    link: (typeof links)[number],
  ) {
    setOpen(false);
    if (!link.id) return; // page link (Resume), let it navigate

    // On the home page, intercept and smooth-scroll to the section.
    if (pathname === "/") {
      e.preventDefault();
      const target = document.getElementById(link.id);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { offset: -57 });
      else target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${link.id}`);
    }
    // Otherwise let the Link navigate to "/#id"; ScrollToHash scrolls on load.
  }

  function isActive(link: (typeof links)[number]) {
    if (link.id) return pathname === "/" && active === link.id;
    return pathname.startsWith(link.href);
  }

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
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={(e) => handleClick(e, link)}
                className={`font-jetbrains text-[0.6875rem] uppercase tracking-widest transition-colors ${
                  isActive(link) ? "text-accent" : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
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
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={(e) => handleClick(e, link)}
                  className={`font-jetbrains text-[0.6875rem] uppercase tracking-widest ${
                    isActive(link) ? "text-accent" : "text-ink-muted"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
