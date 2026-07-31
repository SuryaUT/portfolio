"use client";

import type { ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import "lenis/dist/lenis.css";

/**
 * Global Lenis smooth-scroll provider. Wraps the app so descendants (e.g. the
 * nav) can call `useLenis()` to scroll to sections. Uses `root` so it drives the
 * window scroll without adding wrapper divs.
 *
 * Disabled for users who prefer reduced motion, they get native, instant
 * scrolling, and `useLenis()` returns undefined (callers fall back gracefully).
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1,
        // Offset anchor scrolls by the fixed nav height so targets (e.g. a
        // `#contact` link in the bio) don't tuck under the header. Matches the
        // -57 used by the nav and ScrollToHash.
        anchors: { offset: -57 },
      }}
    >
      {children}
    </ReactLenis>
  );
}
