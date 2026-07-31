/**
 * Joint frames, limits and gripper linkage for the Kinova Gen3 6-DOF
 * (no-vision) with a Robotiq 2F-85.
 *
 * Two independent sources agree on every number here. Kinova's published URDF
 * gives the joint frames; the vendor STEP in /cad was then measured to confirm
 * them, by Hough-voting each surface normal along its own line, where cylinder
 * axes appear as sharp peaks and flat faces never concentrate. The measurement
 * notes at the bottom record what came back.
 *
 * What matters most is the thing a single source would not have caught: the
 * pitch joints turn about CAD **Y**, not X, and adjacent links mate on a shared
 * cylinder about that axis (radius 42 mm at the shoulder and elbow, 34 mm at
 * the wrist). Rotate about anything else and those two housings stop being
 * concentric, so the arm visibly saws itself apart at the seam as it moves,
 * even though it still looks correct in the assembled zero pose.
 */

/** CAD millimetres to scene units. Puts the gripper tip at ~4.5. */
export const MM = 1 / 300;

export type JointKey =
  | "baseRoll"
  | "shoulderPitch"
  | "elbowPitch"
  | "wristRoll"
  | "wristPitch"
  | "toolRoll";

export interface JointFrame {
  /** A point on the joint axis, in CAD coordinates, mm. */
  origin: [number, number, number];
  /**
   * Axis direction in CAD coordinates.
   *
   * Only two occur, alternating up the arm: the three roll joints turn about
   * CAD Z (the arm's own length at the zero pose) and the three pitch joints
   * about CAD Y. Nothing here can express a third, which is deliberate.
   */
  axis: "y" | "z";
  /** Hardware travel, radians. Continuous joints are unbounded. */
  limit: [number, number];
}

/**
 * Joint axes in CAD millimetres, in the STEP's own zero pose (arm straight up).
 *
 * Origins are points ON each axis, not link boundaries. The distinction bit
 * once already: the wrist pitch sits at z = 1009, while the wrist-1 link's
 * geometry ends at z = 1044, and taking the boundary put that joint 35 mm too
 * far up the arm.
 *
 * For a roll joint, where the origin sits along its own axis makes no
 * difference to the rotation, so only the (x, y) of those matters. For a pitch
 * joint it is the (x, z) that matters.
 *
 * Limits are Kinova's URDF values. The user guide quotes marginally wider
 * travel (128.9, 147.8 and 120.3 degrees); the tighter pair is the one the
 * driver enforces.
 */
export const JOINT_FRAMES: Record<JointKey, JointFrame> = {
  baseRoll: {
    origin: [0, 0, 156.43],
    axis: "z",
    limit: [-Infinity, Infinity],
  },
  shoulderPitch: {
    origin: [0, -5.375, 284.81],
    axis: "y",
    limit: [-2.24, 2.24],
  },
  elbowPitch: {
    origin: [0, -5.375, 694.81],
    axis: "y",
    limit: [-2.57, 2.57],
  },
  wristRoll: {
    origin: [0, 1.0, 903.24],
    axis: "z",
    limit: [-Infinity, Infinity],
  },
  wristPitch: {
    origin: [0, 1.175, 1009.17],
    axis: "y",
    limit: [-2.09, 2.09],
  },
  toolRoll: {
    origin: [0, 1.35, 1115.1],
    axis: "z",
    limit: [-Infinity, Infinity],
  },
};

export const JOINT_ORDER: JointKey[] = [
  "baseRoll",
  "shoulderPitch",
  "elbowPitch",
  "wristRoll",
  "wristPitch",
  "toolRoll",
];

/**
 * Distal face of the interface module, CAD mm. The gripper bolts here.
 *
 * Measured off the STEP rather than taken from the URDF, whose end-effector
 * frame sits 2.9 mm inside the physical face. The face is 37.4 mm in radius and
 * the 2F-85's coupling is 75 mm across, so the two mate flush.
 */
export const TOOL_FACE_Z = 1179.5;

/**
 * Travel of each idle channel, radians.
 *
 * This is NOT a self-collision-free region of the whole joint space, and no
 * per-joint box could be: whether the forearm reaches the base depends on the
 * shoulder and elbow together, so any box wide enough to be useful contains
 * poses that collide. Trying to express it as limits would either be a lie or
 * would shrink the arm's motion to nothing.
 *
 * What this box is instead is the exact reachable set of the idle animation.
 * Every channel oscillates inside its own range independently of the others, so
 * the animation can never leave the box, and sweeping the box therefore covers
 * every frame the hero can ever show. scripts/check-gen3-glb.mjs does that
 * sweep and fails if any two non-neighbouring links come within touching
 * distance. Widen a range here and the check has to be re-run.
 *
 * For poses that do not come from the idle animation (the lab's sliders, say),
 * use lib/gen3-collision directly: it tests the geometry rather than trusting a
 * range.
 */
export const IDLE_RANGE: Record<JointKey, [number, number]> = {
  baseRoll: [-0.34, 0.38],
  shoulderPitch: [0.14, 0.5],
  elbowPitch: [0.58, 1.12],
  wristRoll: [-0.55, 0.5],
  wristPitch: [0.24, 0.82],
  toolRoll: [-0.9, 0.85],
};

export function clampJoint(key: JointKey, value: number): number {
  const [lo, hi] = JOINT_FRAMES[key].limit;
  return value < lo ? lo : value > hi ? hi : value;
}

/**
 * Robotiq 2F-85 linkage, in the gripper STEP's own coordinates (mm).
 *
 * The gripper CAD has +Y along the approach direction, +/-X as the opening
 * direction, and every pivot parallel to Z. Its body is centred on z = 93.45
 * rather than zero, so the build recentres it.
 *
 * Each side is a four-bar: the outer knuckle is driven, the outer finger is
 * bolted rigidly to it, the inner finger counter-rotates by the same angle to
 * hold the pad parallel, and the inner knuckle closes the loop off its own
 * palm pivot. Pivots below are the left side (x < 0); the right side is the
 * exact mirror.
 *
 * Cross-check on the numbers: driving THETA_MAX through this chain moves each
 * pad 42.7 mm inward (85.4 mm total, the published stroke) and raises the tip
 * from 149 mm to 162.6 mm (the published closed height). Both fall out of the
 * measurements rather than being fitted.
 */
export const GRIPPER = {
  /** Centre of the coupling cylinder along CAD Z. */
  axisZ: 93.45,
  /** Mount plane in CAD Y. Seats flush on the arm's tool face. */
  mountY: 0,
  /** Palm pivot of the driven outer knuckle. */
  outerKnuckle: [-30.5, 54.64] as [number, number],
  /** Outer knuckle to outer finger. Rigid, no relative rotation. */
  outerFinger: [-62.0, 50.89] as [number, number],
  /** Outer finger to inner finger. Counter-rotates. */
  innerFinger: [-67.87, 98.32] as [number, number],
  /** Palm pivot of the passive inner knuckle. */
  innerKnuckle: [-12.7, 61.45] as [number, number],
  /** Full stroke, radians. Closes the 85 mm gap exactly. */
  thetaMax: 0.8,
} as const;

/**
 * Yaw of the gripper about the tool axis, radians.
 *
 * Free choice: the 2F-85 bolts on in any of the coupling's orientations. This
 * one puts the opening plane across the arm's own pitch plane so both jaws stay
 * visible as the wrist swings.
 */
export const GRIPPER_YAW = Math.PI / 2;

/*
 * Measurement notes, for anyone re-deriving these.
 *
 * The pitch joints, found with normals perpendicular to CAD Y. Each one shows
 * up twice, once in each of the two links it joins, and the two fits agree:
 * that is the mating cylinder, the surface that has to stay concentric for the
 * joint to turn at all.
 *
 *   joint 2   shoulder (z 284.80, x  0.08) r 42.8, 24/24 coverage
 *             bicep    (z 284.92, x -0.11) r 42.0, 23/24
 *   joint 3   bicep    (z 694.67, x  0.14) r 42.3, 24/24
 *             forearm  (z 694.67, x -0.13) r 43.9, 22/24
 *   joint 5   wrist1   (z 1009.10, x -0.12) r 34.3, 24/24
 *             wrist2   (z 1009.28, x -0.12) r 34.2, 24/24
 *
 * The roll joints, from the link housings with normals perpendicular to CAD Z:
 *
 *   joint 1   base                        (x  0.20, y 0.25)
 *   joint 4   forearm distal / wrist1     (x -1.12, y 1.87) / (x 0.15, y 1.13)
 *   joint 6   wrist2 distal / interface   (x  0.13, y 1.48) / (x 0.10, y 1.46)
 *
 * A false lead worth recording: searching for bores parallel to CAD X finds
 * strong 24/24 peaks at (y -12.60, z 285.05) and (y -12.60, z 695.05), exactly
 * at both pitch-joint heights. They are not the joint axes, they are features
 * on the actuator housings, and building the arm around them is what put the
 * pitch plane 90 degrees out. Fit the mating cylinder, not the nearest bore.
 */
