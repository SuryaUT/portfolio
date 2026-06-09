/**
 * 2-bone inverse kinematics solver in a 2D plane.
 *
 * Given a target point (ty, tz) and two segment lengths L1, L2, returns the
 * joint angles that place the end of L2 at the target. Used by the hero arm
 * to track the rising page panel.
 *
 * Convention matches the robot model:
 *   shoulderAngle: rotation around X axis; 0 = upper arm points +Y (straight up).
 *   elbowAngle:    rotation around X axis in the shoulder's local frame;
 *                  0 = forearm continues straight along upper arm direction.
 *
 * The elbow-down solution is selected (shoulder rotates upper arm "above"
 * the line to target by angle beta).
 */
export function solve2BoneIK(
  ty: number,
  tz: number,
  L1: number,
  L2: number,
): { shoulderAngle: number; elbowAngle: number } {
  // Distance to target, clamped to reachable range
  const maxReach = L1 + L2 - 0.001;
  const minReach = Math.abs(L1 - L2) + 0.001;
  let d = Math.hypot(ty, tz);
  d = Math.max(minReach, Math.min(maxReach, d));

  const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));

  // alpha: angle from +Y axis to target line (in YZ plane)
  const alpha = Math.atan2(tz, ty);

  // beta: angle between upper arm and line shoulder→target
  const cosBeta = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const beta = Math.acos(clamp1(cosBeta));

  // gamma: interior angle at elbow
  const cosGamma = (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2);
  const gamma = Math.acos(clamp1(cosGamma));

  return {
    shoulderAngle: alpha - beta,
    elbowAngle: Math.PI - gamma,
  };
}
