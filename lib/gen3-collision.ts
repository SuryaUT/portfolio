import * as THREE from "three";

/**
 * Conservative self-collision test for the Gen3 arm.
 *
 * Joint limits alone do not keep an arm out of itself. Every pose the actuators
 * allow is reachable, and plenty of them fold the forearm into the base; no box
 * of per-joint ranges can express that, because whether two links touch depends
 * on the combination, not on any one angle. So the ranges in gen3-kinematics
 * cover what the hardware allows, and this covers what the geometry allows.
 *
 * Each link is wrapped in a set of spheres fitted to occupied cells of a coarse
 * voxel grid over its own vertices. The cover is strictly conservative: the
 * union of spheres contains the mesh, so reported clearance is real clearance.
 * The converse does not hold, which is the right way round to be wrong.
 */

export interface SphereSet {
  /** Centres in the geometry's own local space, xyz triples. */
  centres: Float32Array;
  radii: Float32Array;
  /** Bounding sphere of the whole set, for the broad-phase reject. */
  boundCentre: THREE.Vector3;
  boundRadius: number;
}

/** Below this real extent in scene units (~90 mm) a link counts as small. */
const SMALL_LINK = 0.3;

export interface SphereOptions {
  /** Grid resolution along the longest axis. Defaults by link size. */
  cells?: number;
  /**
   * Uniform scale from the geometry's own space to scene units.
   *
   * This is not optional bookkeeping. Quantized geometry lives in a normalized
   * [-1,1] box with the real size carried on the node, so a link's extent read
   * straight off the attribute is about 2 whatever the link actually is, and
   * picking a resolution from it would give every link the same one.
   */
  scale?: number;
}

/**
 * Fits a sphere cover to a geometry.
 *
 * The default resolution is deliberately not one number. Resolution costs
 * sphere count, which costs time quadratically in the inner loop, so the arm's
 * half-metre links get a coarse cover: they only ever need to be told apart
 * from things tens of centimetres away. The gripper's parts are the opposite
 * case. They sit millimetres apart even when nothing is wrong, so a cover
 * coarse enough for the bicep reports the two inner knuckles as permanently
 * interpenetrating. They are small enough that a fine cover is cheap.
 */
export function buildSpheres(
  geometry: THREE.BufferGeometry,
  { cells, scale = 1 }: SphereOptions = {},
): SphereSet {
  const attr = geometry.getAttribute("position");
  const p = new THREE.Vector3();

  const box = new THREE.Box3();
  for (let i = 0; i < attr.count; i++) box.expandByPoint(p.fromBufferAttribute(attr, i));
  const size = new THREE.Vector3();
  box.getSize(size);
  const extent = Math.max(size.x, size.y, size.z);
  const cell = extent / (cells ?? (extent * scale < SMALL_LINK ? 14 : 6)) || 1;

  const nx = Math.max(1, Math.ceil(size.x / cell));
  const ny = Math.max(1, Math.ceil(size.y / cell));
  const nz = Math.max(1, Math.ceil(size.z / cell));

  // Two passes: centroid per occupied cell, then the radius that covers it.
  const sums = new Map<number, [number, number, number, number]>();
  const index = (v: THREE.Vector3) => {
    const ix = Math.min(nx - 1, Math.floor((v.x - box.min.x) / cell));
    const iy = Math.min(ny - 1, Math.floor((v.y - box.min.y) / cell));
    const iz = Math.min(nz - 1, Math.floor((v.z - box.min.z) / cell));
    return (iz * ny + iy) * nx + ix;
  };

  for (let i = 0; i < attr.count; i++) {
    p.fromBufferAttribute(attr, i);
    const k = index(p);
    const s = sums.get(k);
    if (s) {
      s[0] += p.x;
      s[1] += p.y;
      s[2] += p.z;
      s[3]++;
    } else {
      sums.set(k, [p.x, p.y, p.z, 1]);
    }
  }

  const order = [...sums.keys()];
  const slot = new Map(order.map((k, i) => [k, i]));
  const centres = new Float32Array(order.length * 3);
  const radii = new Float32Array(order.length);
  order.forEach((k, i) => {
    const s = sums.get(k)!;
    centres[i * 3] = s[0] / s[3];
    centres[i * 3 + 1] = s[1] / s[3];
    centres[i * 3 + 2] = s[2] / s[3];
  });

  for (let i = 0; i < attr.count; i++) {
    p.fromBufferAttribute(attr, i);
    const j = slot.get(index(p))!;
    const d = Math.hypot(
      p.x - centres[j * 3],
      p.y - centres[j * 3 + 1],
      p.z - centres[j * 3 + 2],
    );
    if (d > radii[j]) radii[j] = d;
  }

  const boundCentre = new THREE.Vector3();
  box.getCenter(boundCentre);
  let boundRadius = 0;
  for (let i = 0; i < radii.length; i++) {
    const d =
      Math.hypot(
        centres[i * 3] - boundCentre.x,
        centres[i * 3 + 1] - boundCentre.y,
        centres[i * 3 + 2] - boundCentre.z,
      ) + radii[i];
    if (d > boundRadius) boundRadius = d;
  }

  return { centres, radii, boundCentre, boundRadius };
}

/**
 * Where each link sits in the chain. Neighbours share a joint housing and are
 * built to interleave, so only links two apart or more are ever tested.
 */
const CHAIN_INDEX: Record<string, number> = {
  base: 0,
  shoulder: 1,
  bicep: 2,
  forearm: 3,
  wrist1: 4,
  wrist2: 5,
  tool: 6,
  palm: 7,
  knuckle: 8,
  innerKnuckle: 8,
  finger: 9,
  tip: 10,
  pad: 11,
};

const sideOf = (key: string) =>
  key.endsWith("L") ? "L" : key.endsWith("R") ? "R" : null;

const indexOf = (key: string) => CHAIN_INDEX[sideOf(key) ? key.slice(0, -1) : key] ?? 0;

const isGripper = (key: string) => key === "palm" || sideOf(key) !== null;

/**
 * Pairs whose clearance depends on the arm's pose.
 *
 * Everything inside the gripper is left out. How a 2F-85 folds up is Robotiq's
 * problem and their answer is already in the CAD: the four-bar's links share
 * pins, the inner knuckle rides in a slot in the inner finger, and the fingers
 * nest against the palm at full close. All of that reads as overlap to a
 * proximity test and none of it is a fault. What is left is the part that was
 * reconstructed by hand, which is the part worth testing: every arm link
 * against every non-neighbouring arm link, and the whole gripper against the
 * arm behind it.
 *
 * Jaw against jaw is a separate question with a separate answer, because it
 * does not depend on the arm at all. See buildJawPairs.
 */
export function buildPairs(keys: string[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const [ka, kb] = [keys[i], keys[j]];
      if (isGripper(ka) && isGripper(kb)) continue;
      if (Math.abs(indexOf(ka) - indexOf(kb)) <= 1) continue;
      pairs.push([i, j]);
    }
  }
  return pairs;
}

/**
 * Pairs of links on opposite jaws.
 *
 * These move only with the grip, so one sweep of that single value settles them
 * for every arm pose there will ever be. That is worth separating out: it turns
 * the most expensive pairs in the set, small parts a few millimetres apart, into
 * a hundred-sample check instead of part of every frame.
 *
 * The pads are excluded. They are supposed to meet at full close, and a
 * proximity test cannot tell meeting from passing through, so
 * scripts/check-gen3-glb.mjs measures that as a signed opening instead.
 */
export function buildJawPairs(keys: string[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = sideOf(keys[i]);
      const b = sideOf(keys[j]);
      if (!a || !b || a === b) continue;
      if (indexOf(keys[i]) === CHAIN_INDEX.pad && indexOf(keys[j]) === CHAIN_INDEX.pad) {
        continue;
      }
      pairs.push([i, j]);
    }
  }
  return pairs;
}

export interface CollisionLink {
  key: string;
  spheres: SphereSet;
  object: THREE.Object3D;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Uniform scale baked into a world matrix, including the dequantization one. */
function scaleOf(object: THREE.Object3D): number {
  _scale.setFromMatrixScale(object.matrixWorld);
  return Math.max(_scale.x, _scale.y, _scale.z);
}

export interface Clearance {
  /** Smallest gap between any tested pair, in scene units. Negative overlaps. */
  gap: number;
  where: string | null;
}

/**
 * Smallest gap between any two links that are not chain neighbours.
 *
 * Assumes world matrices are already up to date. The per-pair bounding-sphere
 * reject is what makes this cheap enough to run every frame: in a normal pose
 * almost every pair is far apart and never reaches the inner loop.
 */
export function minClearance(
  links: CollisionLink[],
  pairs: Array<[number, number]>,
): Clearance {
  let gap = Infinity;
  let where: string | null = null;

  for (const [i, j] of pairs) {
    const la = links[i];
    const lb = links[j];
    const sa = scaleOf(la.object);
    const sb = scaleOf(lb.object);

    _a.copy(la.spheres.boundCentre).applyMatrix4(la.object.matrixWorld);
    _b.copy(lb.spheres.boundCentre).applyMatrix4(lb.object.matrixWorld);
    const coarse =
      _a.distanceTo(_b) - la.spheres.boundRadius * sa - lb.spheres.boundRadius * sb;
    if (coarse >= gap) continue;

    const ca = la.spheres.centres;
    const cb = lb.spheres.centres;
    for (let m = 0; m < la.spheres.radii.length; m++) {
      _a.set(ca[m * 3], ca[m * 3 + 1], ca[m * 3 + 2]).applyMatrix4(la.object.matrixWorld);
      const ra = la.spheres.radii[m] * sa;
      for (let n = 0; n < lb.spheres.radii.length; n++) {
        _b.set(cb[n * 3], cb[n * 3 + 1], cb[n * 3 + 2]).applyMatrix4(lb.object.matrixWorld);
        const d = _a.distanceTo(_b) - ra - lb.spheres.radii[n] * sb;
        if (d < gap) {
          gap = d;
          where = `${la.key} / ${lb.key}`;
        }
      }
    }
  }

  return { gap, where };
}
