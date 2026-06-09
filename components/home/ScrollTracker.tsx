"use client";

import { useEffect } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { scrollState } from "@/lib/scroll-state";

export default function ScrollTracker() {
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const heroHeight =
      typeof window !== "undefined" ? Math.max(window.innerHeight - 57, 400) : 600;
    const raw = Math.max(0, y / heroHeight);
    // Arm animation progress is clamped to [0, 1] (only animates over first heroHeight)
    scrollState.progress = Math.min(raw, 1);
    // Panel position keeps rising past the hero animation so the user can scroll
    // through the rest of the CSS3D content.
    scrollState.panelY = -3.0 + 4.5 * raw;
  });

  useEffect(() => {
    scrollState.progress = 0;
    scrollState.panelY = -3.0;
  }, []);

  return null;
}
