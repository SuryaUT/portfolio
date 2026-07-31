"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";

/**
 * Next resets the window scroll on navigation, but Lenis keeps its own internal
 * scroll position and re-applies it on the next frame, so a new page can open
 * part-way down. Snap Lenis back to the top whenever the route changes.
 *
 * Skipped when the URL carries a hash, so anchor navigation (see ScrollToHash)
 * still lands on its section.
 */
export default function ScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    if (window.location.hash) return;

    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname, lenis]);

  return null;
}
