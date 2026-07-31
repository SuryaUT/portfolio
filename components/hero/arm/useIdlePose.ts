"use client";

import { useEffect, useMemo } from "react";
import { animate, createTimeline } from "animejs";
import { IDLE_RANGE, type JointKey } from "@/lib/gen3-kinematics";
import { createArmPose, type ArmPose } from "./Gen3Arm";

/**
 * Drives the arm's idle motion with anime.js.
 *
 * anime.js owns the choreography by tweening a plain JS pose object; the
 * component's useFrame reads that pose and writes the joint rotations. Letting
 * anime.js write Object3D rotations directly (via animejs/adapters/three)
 * would also mean fighting over units, since that adapter's rotateX/Y/Z are in
 * degrees while three.js stores radians.
 */

/**
 * How long each channel takes to cross its range, milliseconds.
 *
 * The travel itself comes from IDLE_RANGE, so the box that gets swept for
 * self-collisions is the same box the animation actually uses rather than a
 * copy of it that can drift out of date.
 *
 * The periods are mutually non-harmonic on purpose: six channels sharing no
 * common multiple never line back up, so the combined motion does not visibly
 * repeat. A single timeline would loop every few seconds.
 */
const PERIOD: Record<JointKey, number> = {
  baseRoll: 9400,
  shoulderPitch: 6200,
  elbowPitch: 5300,
  wristRoll: 7700,
  wristPitch: 4100,
  toolRoll: 4900,
};

export function useIdlePose(enabled = true): ArmPose {
  const pose = useMemo(() => createArmPose(), []);

  useEffect(() => {
    if (!enabled) return;

    const drift = Object.entries(IDLE_RANGE).map(([prop, [from, to]]) =>
      animate(pose, {
        [prop]: { from, to },
        duration: PERIOD[prop as JointKey],
        ease: "inOutSine",
        loop: true,
        alternate: true,
      }),
    );

    // Periodic gripper cycle: a fast snap closed, then a springy release. The
    // elastic overshoot would drive grip past 1, which the component clamps.
    const flex = createTimeline({ loop: true })
      .add(pose, { grip: 0.92, duration: 260, ease: "outExpo" }, 3200)
      .add(pose, { grip: 0.16, duration: 900, ease: "outElastic(1, .4)" }, "+=640");

    return () => {
      drift.forEach((a) => a.revert());
      flex.revert();
    };
  }, [enabled, pose]);

  return pose;
}
