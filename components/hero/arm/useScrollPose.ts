"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion, useScroll, useSpring, type MotionValue } from "framer-motion";
import { poseAt } from "@/lib/arm-choreography";
import { createArmPose, type ArmPose } from "./Gen3Arm";

/**
 * Drives the arm from the page's scroll position.
 *
 * Scroll maps straight onto progress through the choreography, so the arm is
 * wherever the reader put it, and scrolling back up runs the move in reverse.
 * That is the point of driving it from scroll rather than triggering a timeline
 * at a threshold: it stays reversible and never plays a move the reader is not
 * asking for.
 *
 * The spring in between is what stops it feeling like a scrubbing handle.
 * Wheel and trackpad scroll arrives in coarse jumps, and mapped directly those
 * land as the arm teleporting between poses; the spring gives it mass and lets
 * it overshoot and settle. poseAt clamps, so overshoot past either end parks at
 * the pose rather than running off the end of the table.
 */
export function useScrollPose(enabled = true): ArmPose {
  const pose = useMemo(() => createArmPose(), []);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll();
  // Reduced motion still follows the scroll, it just does not add momentum of
  // its own on top of it.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: reduced ? 1000 : 90,
    damping: reduced ? 100 : 26,
    mass: 0.6,
  }) as MotionValue<number>;

  useFrame(() => {
    if (!enabled) return;
    poseAt(smoothed.get(), pose as unknown as Record<string, number>);
  });

  return pose;
}
