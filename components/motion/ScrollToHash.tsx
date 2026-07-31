"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

const HEADER_OFFSET = -57;

/**
 * When the home page loads with a #hash in the URL (e.g. arriving from a nav
 * click on another page), smooth-scroll to that section once layout settles.
 */
export default function ScrollToHash() {
  const lenis = useLenis();

  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) return;

    const timer = setTimeout(() => {
      const target = document.getElementById(hash);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { offset: HEADER_OFFSET });
      else target.scrollIntoView();
    }, 150);

    return () => clearTimeout(timer);
  }, [lenis]);

  return null;
}
