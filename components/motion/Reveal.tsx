"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from "framer-motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** How far (px) the element starts below its resting position. */
  y?: number;
}

/**
 * Scroll-linked inertial reveal. Each element's translateY + opacity are driven
 * by its own scroll progress (not a one-shot), and a spring makes it lag and
 * keep drifting after you stop scrolling, the inertial feel.
 *
 * The ref sits on a NON-transformed outer wrapper so measuring the element's
 * position (getBoundingClientRect) isn't fed back by its own transform.
 */
export default function Reveal({ children, className, y = 64 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // 0 → 1 as the element rises from the bottom of the viewport toward ~65% up.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 65%"],
  });

  // Spring = the inertial lag / continued drift after scrolling stops.
  const eased = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 18,
    mass: 0.6,
  });

  const translateY = useTransform(eased, [0, 1], [y, 0]);
  const opacity = useTransform(eased, [0, 0.6], [0, 1]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: translateY, opacity }}>{children}</motion.div>
    </div>
  );
}
