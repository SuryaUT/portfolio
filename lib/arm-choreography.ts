import { JOINT_ORDER, clampJoint, type JointKey } from "./gen3-kinematics.ts";

/**
 * The scroll-driven move: a full turn of the base with the whole arm unfurling
 * through it, settling with the gripper pointing at the floor.
 *
 * Authored as poses at points along the scroll rather than as per-joint curves.
 * Every joint moves at once here, so the thing that decides whether a frame
 * looks like a robot or like a tangle is the combination, and combinations are
 * only legible if you can read one down a column.
 *
 * The whole path is swept for self-collision by scripts/check-gen3-glb.mjs.
 * Change a number in this table and re-run `npm run check:arm`.
 */

export interface Keyframe {
  /** Scroll progress, 0 at the top, 1 at the end of the scroll range. */
  at: number;
  pose: Record<JointKey, number> & { grip: number };
}

const DEG = Math.PI / 180;

/**
 * Where the move ends, solved rather than posed by hand.
 *
 * The three pitch joints sum to exactly 180 degrees, which is what puts the
 * tool axis vertical: at the zero pose it points straight up, so half a turn of
 * accumulated pitch points it straight down. Within that constraint this is the
 * combination that lands the fingertip at 125 mm, just under the 171 mm height
 * of the base, reaching 496 mm out from the base axis, with 36 mm of clearance
 * to the nearest link. The wrist roll has to finish on a whole number of turns
 * for the sum to hold, hence the -360 rather than some tidier number.
 */
const LANDING = {
  shoulderPitch: 34 * DEG,
  elbowPitch: 88 * DEG,
  wristPitch: 58 * DEG,
} as const;

/**
 * Final base angle.
 *
 * Slightly over one full turn, and chosen so the arm finishes reaching across
 * the view rather than toward the camera, which foreshortens it to nothing.
 * This is the one number here that is about the shot rather than the robot, so
 * it is the first thing to retune if the camera moves.
 */
const FINAL_YAW = 360 * DEG + 125 * DEG;

export const KEYFRAMES: Keyframe[] = [
  {
    // Home. Reads as at-rest, so the move has somewhere to start from.
    at: 0,
    pose: {
      baseRoll: 0,
      shoulderPitch: 0.32,
      elbowPitch: 0.84,
      wristRoll: 0,
      wristPitch: 0.5,
      toolRoll: 0,
      grip: 0.15,
    },
  },
  {
    // Coil: leans back and coils in as the base starts turning. The grip snaps
    // shut here, which is the beat that makes it read as intent, not drift.
    at: 0.2,
    pose: {
      baseRoll: 1.1,
      shoulderPitch: -0.3,
      elbowPitch: 1.75,
      wristRoll: -1.2,
      wristPitch: 0.15,
      toolRoll: 1.4,
      grip: 0.9,
    },
  },
  {
    // Extend: throws out to near full reach at the far side of the turn.
    at: 0.45,
    pose: {
      baseRoll: 3.3,
      shoulderPitch: 0.85,
      elbowPitch: 0.15,
      wristRoll: -3.1,
      wristPitch: -0.7,
      toolRoll: -1.2,
      grip: 0.2,
    },
  },
  {
    // Fold back through, wrist still rolling, for the second half of the turn.
    at: 0.7,
    pose: {
      baseRoll: 5.6,
      shoulderPitch: -0.1,
      elbowPitch: 1.45,
      wristRoll: -4.9,
      wristPitch: 1.35,
      toolRoll: 2.4,
      grip: 0.75,
    },
  },
  {
    at: 1,
    pose: {
      baseRoll: FINAL_YAW,
      shoulderPitch: LANDING.shoulderPitch,
      elbowPitch: LANDING.elbowPitch,
      // A whole turn of wrist roll, so it spins but lands back where the
      // pitch-sum-to-180 argument needs it.
      wristRoll: -360 * DEG,
      wristPitch: LANDING.wristPitch,
      toolRoll: 4.2,
      grip: 0.15,
    },
  },
];

/** Rest pose, for callers that need somewhere to sit before scrolling starts. */
export const HOME = KEYFRAMES[0].pose;

type Channel = JointKey | "grip";
const CHANNELS: Channel[] = [...JOINT_ORDER, "grip"];

/**
 * Slope of each channel at each keyframe, in units per unit of scroll.
 *
 * This table is the whole reason the move reads as continuous. Easing each
 * segment independently, which is the obvious way to write this, eases OUT at
 * the end of every segment and back IN at the start of the next, so the arm
 * comes to a complete stop at every interior keyframe. Three of them, and it
 * looks like the animation is buffering.
 *
 * Giving each keyframe a single slope shared by the segments either side of it
 * makes the curve C1 continuous: the arm passes through a keyframe without ever
 * reaching zero speed. The slopes are plain finite differences over the
 * neighbouring keyframes, which is a Catmull-Rom spline with the non-uniform
 * keyframe spacing accounted for.
 *
 * The two ends are pinned to zero on purpose. Progress is clamped, so past
 * either end nothing moves at all; arriving there at speed and stopping dead is
 * exactly the jolt this is trying to avoid. So the move eases up from rest and
 * settles into the landing, and runs continuously in between.
 */
const SLOPE: Array<Record<Channel, number>> = KEYFRAMES.map((frame, i) => {
  const slopes = {} as Record<Channel, number>;
  const prev = KEYFRAMES[i - 1];
  const next = KEYFRAMES[i + 1];
  for (const key of CHANNELS) {
    slopes[key] =
      prev && next ? (next.pose[key] - prev.pose[key]) / (next.at - prev.at) : 0;
  }
  return slopes;
});

/**
 * Samples the choreography, writing into `out` rather than allocating.
 *
 * Angles interpolate as plain numbers, deliberately not by shortest arc: the
 * base passing 360 degrees is the move, and a shortest-arc blend would take the
 * short way round and undo it.
 *
 * A cubic through two poses and their two slopes still passes exactly through
 * both, so the landing pose is the authored one to the last decimal and its
 * solved-for geometry holds. Between keyframes the cubic can overshoot; joint
 * limits clamp it, and check 6 sweeps the sampled path rather than the
 * keyframes so any overshoot that mattered would show up there.
 */
export function poseAt(progress: number, out: Record<string, number>) {
  const t = Math.min(1, Math.max(0, progress));

  let i = 1;
  while (i < KEYFRAMES.length - 1 && t > KEYFRAMES[i].at) i++;
  const a = KEYFRAMES[i - 1];
  const b = KEYFRAMES[i];
  const span = b.at - a.at;
  const u = (t - a.at) / span;

  // Cubic Hermite basis.
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  for (const key of CHANNELS) {
    const value =
      h00 * a.pose[key] +
      h10 * span * SLOPE[i - 1][key] +
      h01 * b.pose[key] +
      h11 * span * SLOPE[i][key];
    out[key] =
      key === "grip" ? Math.min(1, Math.max(0, value)) : clampJoint(key, value);
  }
  return out;
}

