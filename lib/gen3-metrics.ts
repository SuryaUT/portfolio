/**
 * Measured geometry of the Kinova Gen3 6-DOF (spherical wrist).
 *
 * Every number here was extracted from the vendor STEP file (kept out of the
 * repo, in /cad) by tessellating it with OpenCASCADE and slicing each link
 * along the arm axis. Nothing is eyeballed.
 *
 * The joint origins match Kinova's published DH parameters (0.2848 m base to
 * shoulder, 0.4100 m bicep), which is the cross-check that the extraction is
 * correct.
 *
 * The single most important thing the measurements revealed: the links are
 * WAISTED. Each one is fattest at its joint housings and thinnest around
 * mid-span. An arm built the other way round, swelling in the middle, does not
 * read as a Gen3 at all.
 */

/** CAD millimetres to scene units. Puts the tool flange at ~3.76. */
export const MM = 1 / 300;

export interface LinkMetrics {
  name: string;
  /** Geometry extent along the arm axis, mm, in CAD coordinates. */
  z0: number;
  z1: number;
  /** Outer radius as [t, mm] along the link. Measured, 26 bins, condensed. */
  radius: Array<[number, number]>;
  /** Centreline lateral drift as [t, mm], relative to the link's own start. */
  drift: Array<[number, number]>;
}

/**
 * Joint centres in CAD coordinates, mm.
 *
 * Note these fall INSIDE their links rather than at link boundaries: the
 * bicep's geometry starts 46 mm below its own proximal joint because the
 * housing wraps around the pivot. Butting links end to end is what made the
 * previous attempt look like stacked cylinders.
 */
export const JOINTS = {
  baseRoll: 156.4,
  shoulderPitch: 284.8,
  elbowPitch: 694.8,
  wristRoll: 905.7,
  wristPitch: 1044.2,
  toolRoll: 1112.7,
  flange: 1127.6,
} as const;

export const BASE: LinkMetrics = {
  name: "base",
  z0: 0,
  z1: 170.9,
  radius: [
    [0, 54],
    [0.06, 46],
    [0.22, 52],
    [0.45, 45.5],
    [0.8, 46],
    [1, 46],
  ],
  drift: [
    [0, 0],
    [1, 0],
  ],
};

export const SHOULDER: LinkMetrics = {
  name: "shoulder",
  z0: 156.4,
  z1: 330.8,
  radius: [
    [0, 44],
    [0.1, 46],
    [0.25, 51],
    [0.44, 45.6],
    [0.63, 53.4],
    [0.75, 56.7],
    [0.9, 50.4],
    [1, 37.2],
  ],
  drift: [
    [0, 0],
    [0.44, 29.6],
    [0.65, 12.4],
    [1, 11],
  ],
};

export const BICEP: LinkMetrics = {
  name: "bicep",
  z0: 238.8,
  z1: 740.8,
  radius: [
    [0, 41.4],
    [0.1, 50.1],
    [0.21, 38.9],
    [0.44, 32.4],
    [0.6, 33.8],
    [0.79, 39.5],
    [0.9, 55.9],
    [1, 45.3],
  ],
  drift: [
    [0, 0],
    [0.44, 3],
    [1, 8],
  ],
};

export const FOREARM: LinkMetrics = {
  name: "forearm",
  z0: 648.8,
  z1: 915.7,
  radius: [
    [0, 34.2],
    [0.17, 50.9],
    [0.33, 39.3],
    [0.44, 28.1],
    [0.6, 31.2],
    [0.83, 35.4],
    [1, 35],
  ],
  drift: [
    [0, 0],
    [0.37, 11],
    [0.7, -2],
    [1, -18],
  ],
};

export const WRIST1: LinkMetrics = {
  name: "wrist1",
  z0: 903.2,
  z1: 1044.2,
  radius: [
    [0, 33.2],
    [0.29, 38.3],
    [0.37, 31.4],
    [0.52, 36.6],
    [0.71, 47.2],
    [0.83, 45.9],
    [1, 31.8],
  ],
  drift: [
    [0, 0],
    [0.37, -20],
    [0.7, -17],
    [1, -14],
  ],
};

export const WRIST2: LinkMetrics = {
  name: "wrist2",
  z0: 974.2,
  z1: 1127.6,
  radius: [
    [0, 24.4],
    [0.25, 41.4],
    [0.44, 34.9],
    [0.56, 31.7],
    [0.67, 37.9],
    [0.83, 35],
    [1, 33.2],
  ],
  drift: [
    [0, 0],
    [0.25, 6],
    [0.6, -7],
    [1, -21],
  ],
};

/** Link length in scene units. */
export const lengthOf = (l: LinkMetrics) => (l.z1 - l.z0) * MM;

/** Where a CAD-absolute joint centre falls within a link, as scene-unit offset. */
export const offsetIn = (l: LinkMetrics, jointZ: number) => (jointZ - l.z0) * MM;

/** Normalised position of a CAD-absolute height within a link. */
export const tOf = (l: LinkMetrics, jointZ: number) =>
  (jointZ - l.z0) / (l.z1 - l.z0);

/** Smoothstep interpolation across [t, value] control points. */
function smoothAt(stops: Array<[number, number]>, t: number): number {
  if (t <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    const [t1, v1] = stops[i];
    if (t <= t1) {
      const [t0, v0] = stops[i - 1];
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (u * u * (3 - 2 * u));
    }
  }
  return last[1];
}

/**
 * Lateral offset of a link's centreline at a given joint height, scene units.
 *
 * Child joints have to inherit this, otherwise each link would hang off its
 * parent's nominal axis instead of the parent's actual centreline, and the
 * chain would visibly kink at every joint.
 */
export const driftAt = (l: LinkMetrics, jointZ: number) =>
  smoothAt(l.drift, tOf(l, jointZ)) * MM;
