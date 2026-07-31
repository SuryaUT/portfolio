import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  GRIPPER,
  GRIPPER_YAW,
  IDLE_RANGE,
  JOINT_FRAMES,
  JOINT_ORDER,
  MM,
  TOOL_FACE_Z,
} from "../lib/gen3-kinematics.ts";
import {
  buildJawPairs,
  buildPairs,
  buildSpheres,
  minClearance,
} from "../lib/gen3-collision.ts";
import { KEYFRAMES, poseAt } from "../lib/arm-choreography.ts";

/**
 * Checks the built arm against the CAD it came from.
 *
 *   node scripts/check-gen3-glb.mjs
 *
 * This rebuilds the kinematic chain from lib/gen3-kinematics.ts rather than
 * importing the React component, so it is a second implementation of the same
 * joint frames. If the two disagree, the numbers below stop lining up with the
 * vendor CAD and the check fails.
 *
 * Five things get verified:
 *
 *   1. Reassembly. Posed at zero, every link driven back through its joint
 *      offsets has to land the assembly exactly on the STEP's own bounding box.
 *      This catches a wrong joint position.
 *   2. Flush joints. Every surface where two links touch has to stay touching
 *      through the joint's whole travel. This catches a wrong joint AXIS, which
 *      check 1 is blind to: at the zero pose a link built around the wrong axis
 *      sits exactly where it should, and only saws itself out of its socket
 *      once it starts turning. That was a real bug, not a hypothetical.
 *   3. Gripper stroke. Driving the 2F-85 from open to closed has to reproduce
 *      Robotiq's published 85 mm stroke and 162 mm closed height.
 *   4. Jaw against jaw, over the whole stroke. Depends only on the grip, so it
 *      is settled once here rather than inside the pose sweep.
 *   5. Self-collision. Sweeping the whole idle envelope, no two links that are
 *      not neighbours in the chain may come within touching distance.
 */

const MODEL = "public/models/gen3.glb";

/** The vendor STEP's own bounding box, CAD millimetres. */
const CAD_BOUNDS = {
  x: [-46.3, 46.4],
  y: [-58.2, 53.8],
  z: [0, 1179.5],
};

/** Tessellation is a chord approximation, so nothing lands on CAD exactly. */
const TOLERANCE_MM = 2.5;

// ---------------------------------------------------------------- load ------

const buffer = fs.readFileSync(MODEL);
const gltf = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    "",
    resolve,
    reject,
  ),
);

const source = new Map();
gltf.scene.traverse((o) => {
  if (o.isMesh) source.set(o.name, o);
});

// ----------------------------------------------------------- build tree -----

const toScene = (x, y, z) => [y * MM, z * MM, x * MM];

function offsetBetween(parent, child) {
  const p = parent ? JOINT_FRAMES[parent].origin : [0, 0, 0];
  const c = child ? JOINT_FRAMES[child].origin : [0, 0, 0];
  return toScene(c[0] - p[0], c[1] - p[1], c[2] - p[2]);
}

const links = new Map();

/** Adds a link mesh, keeping the node transform the dequantization needs. */
function attach(parent, key) {
  const mesh = source.get(key);
  if (!mesh) throw new Error(`glb is missing link "${key}"`);
  const clone = mesh.clone();
  parent.add(clone);
  links.set(key, clone);
  return clone;
}

function group(parent, position, rotation) {
  const g = new THREE.Group();
  g.position.set(...position);
  if (rotation) g.rotation.set(...rotation);
  parent.add(g);
  return g;
}

const root = new THREE.Group();
const joints = {};

attach(root, "base");
joints.baseRoll = group(root, offsetBetween(null, "baseRoll"));
attach(joints.baseRoll, "shoulder");
joints.shoulderPitch = group(joints.baseRoll, offsetBetween("baseRoll", "shoulderPitch"));
attach(joints.shoulderPitch, "bicep");
joints.elbowPitch = group(joints.shoulderPitch, offsetBetween("shoulderPitch", "elbowPitch"));
attach(joints.elbowPitch, "forearm");
joints.wristRoll = group(joints.elbowPitch, offsetBetween("elbowPitch", "wristRoll"));
attach(joints.wristRoll, "wrist1");
joints.wristPitch = group(joints.wristRoll, offsetBetween("wristRoll", "wristPitch"));
attach(joints.wristPitch, "wrist2");
joints.toolRoll = group(joints.wristPitch, offsetBetween("wristPitch", "toolRoll"));
attach(joints.toolRoll, "tool");

const gripper = group(
  joints.toolRoll,
  toScene(0, 0, TOOL_FACE_Z - JOINT_FRAMES.toolRoll.origin[2]),
  [0, GRIPPER_YAW, 0],
);
attach(gripper, "palm");

const v = (p) => [Math.abs(p[0]) * MM, p[1] * MM, 0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], 0];
const G = {
  knuckle: v(GRIPPER.outerKnuckle),
  innerKnuckle: v(GRIPPER.innerKnuckle),
  finger: sub(v(GRIPPER.outerFinger), v(GRIPPER.outerKnuckle)),
  tip: sub(v(GRIPPER.innerFinger), v(GRIPPER.outerFinger)),
};

const jaws = {};
for (const side of [-1, 1]) {
  const s = side === 1 ? "R" : "L";
  const at = (p) => [p[0] * side, p[1], p[2]];
  jaws[`knuckle${s}`] = group(gripper, at(G.knuckle));
  attach(jaws[`knuckle${s}`], `knuckle${s}`);
  const finger = group(jaws[`knuckle${s}`], at(G.finger));
  attach(finger, `finger${s}`);
  jaws[`tip${s}`] = group(finger, at(G.tip));
  attach(jaws[`tip${s}`], `tip${s}`);
  attach(jaws[`tip${s}`], `pad${s}`);
  jaws[`innerKnuckle${s}`] = group(gripper, at(G.innerKnuckle));
  attach(jaws[`innerKnuckle${s}`], `innerKnuckle${s}`);
}

const JAW_SENSE = {
  knuckleL: -1,
  innerKnuckleL: -1,
  tipL: 1,
  knuckleR: 1,
  innerKnuckleR: 1,
  tipR: -1,
};

function setPose(pose) {
  for (const key of JOINT_ORDER) {
    const angle = pose[key] ?? 0;
    if (JOINT_FRAMES[key].axis === "z") joints[key].rotation.y = angle;
    else joints[key].rotation.x = angle;
  }
  const theta = (pose.grip ?? 0) * GRIPPER.thetaMax;
  for (const [key, sense] of Object.entries(JAW_SENSE)) {
    jaws[key].rotation.z = theta * sense;
  }
  root.updateMatrixWorld(true);
}

// -------------------------------------------------- collision primitives ----

const collisionLinks = [...links.entries()].map(([key, object]) => ({
  key,
  object,
  spheres: buildSpheres(object.geometry, { scale: object.scale.x }),
}));
const LINK_KEYS = collisionLinks.map((l) => l.key);
const PAIRS = buildPairs(LINK_KEYS);
const JAW_PAIRS = buildJawPairs(LINK_KEYS);

// -------------------------------------------------------------- checks ------

let failures = 0;
const report = (ok, label, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : " FAIL "} ${label.padEnd(38)} ${detail}`);
};

console.log("\n1. reassembly at zero pose vs vendor STEP bounds\n");
setPose({ grip: 0 });

const armBox = new THREE.Box3();
for (const key of ["base", "shoulder", "bicep", "forearm", "wrist1", "wrist2", "tool"]) {
  armBox.expandByObject(links.get(key));
}
// toScene is the cyclic swap cad(x,y,z) -> scene(y, z, x), so read it back the
// other way round: CAD X is scene Z, CAD Y is scene X, CAD Z is scene Y.
const measured = {
  x: [armBox.min.z / MM, armBox.max.z / MM],
  y: [armBox.min.x / MM, armBox.max.x / MM],
  z: [armBox.min.y / MM, armBox.max.y / MM],
};
for (const axis of ["x", "y", "z"]) {
  for (const end of [0, 1]) {
    const err = Math.abs(measured[axis][end] - CAD_BOUNDS[axis][end]);
    report(
      err < TOLERANCE_MM,
      `cad ${axis}${end ? "max" : "min"}`,
      `${measured[axis][end].toFixed(2)} mm vs ${CAD_BOUNDS[axis][end]} (${err.toFixed(2)} off)`,
    );
  }
}

console.log("\n2. joints stay flush through their travel\n");

/**
 * Checks that a joint's mating surfaces stay in contact as it turns.
 *
 * The idea is to let the geometry say where the joint's bearing surface is,
 * rather than asserting anything about it. At the zero pose, take the child's
 * vertices that are already touching the parent: whatever that surface is, it
 * is what the two links slide on. If the declared axis is the real one, those
 * points sweep along the parent and stay on it. If it is not, they immediately
 * leave, which is the arm pulling out of its own socket.
 *
 * A wrong axis is invisible at the zero pose, so nothing that only inspects the
 * assembled model can catch it. It has to be turned.
 */
const CONTACT = 2 * MM; // what counts as touching
const GRID = 3 * MM;
const FAR = 4 * GRID; // distance query saturates here, which is plenty
/** Interface neighbourhood: how far from the joint counts as near it. */
const NEAR = 70 * MM;

/** Axial and radial coordinates about a joint axis lying on scene X or Y. */
const about = (p, axisIsY) =>
  axisIsY
    ? [p.y, Math.hypot(p.x, p.z)]
    : [p.x, Math.hypot(p.y, p.z)];

const nearJoint = (p, axisIsY) => {
  const [t, r] = about(p, axisIsY);
  return Math.abs(t) < NEAR && r < NEAR;
};

function verticesOf(object, offset, axisIsY) {
  const attr = object.geometry.getAttribute("position");
  const out = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < attr.count; i++) {
    p.fromBufferAttribute(attr, i).applyMatrix4(object.matrix);
    if (offset) p.sub(offset);
    if (nearJoint(p, axisIsY)) out.push(p.clone());
  }
  return out;
}

/**
 * Dense point sampling of a mesh's surface near a joint.
 *
 * Vertices alone are not enough to ask "is this point still on that surface".
 * A tessellated annulus can be metres of surface described by a ring of
 * vertices several millimetres apart, so a point that slides along it perfectly
 * still reads as far from every vertex, and the measurement ends up reporting
 * triangle size rather than anything about the joint. Subdividing to roughly a
 * millimetre makes the distance mean what it says.
 */
function surfaceCloud(object, offset, axisIsY) {
  const pos = object.geometry.getAttribute("position");
  const index = object.geometry.getIndex();
  const count = index ? index.count : pos.count;
  const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const p = new THREE.Vector3();
  const out = [];

  for (let i = 0; i < count; i += 3) {
    let near = false;
    for (let k = 0; k < 3; k++) {
      const idx = index ? index.getX(i + k) : i + k;
      tri[k].fromBufferAttribute(pos, idx).applyMatrix4(object.matrix);
      if (offset) tri[k].sub(offset);
      near = near || nearJoint(tri[k], axisIsY);
    }
    if (!near) continue;

    const longest = Math.max(
      tri[0].distanceTo(tri[1]),
      tri[1].distanceTo(tri[2]),
      tri[2].distanceTo(tri[0]),
    );
    const n = Math.max(1, Math.min(6, Math.ceil(longest / (1.5 * MM))));
    for (let u = 0; u <= n; u++)
      for (let v = 0; u + v <= n; v++) {
        const w = n - u - v;
        p.set(0, 0, 0)
          .addScaledVector(tri[0], u / n)
          .addScaledVector(tri[1], v / n)
          .addScaledVector(tri[2], w / n);
        out.push(p.x, p.y, p.z);
      }
  }
  return out;
}

/** Uniform-grid nearest-point lookup over a static cloud of xyz triples. */
function cloudIndex(coords) {
  const cells = new Map();
  const key = (a, b, c) => (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  for (let i = 0; i < coords.length; i += 3) {
    const k = key(
      Math.floor(coords[i] / GRID),
      Math.floor(coords[i + 1] / GRID),
      Math.floor(coords[i + 2] / GRID),
    );
    let bucket = cells.get(k);
    if (!bucket) cells.set(k, (bucket = []));
    bucket.push(i);
  }
  return (q) => {
    const ix = Math.floor(q.x / GRID);
    const iy = Math.floor(q.y / GRID);
    const iz = Math.floor(q.z / GRID);
    let best = FAR * FAR;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++) {
          const bucket = cells.get(key(ix + a, iy + b, iz + c));
          if (!bucket) continue;
          for (const i of bucket) {
            const d =
              (q.x - coords[i]) ** 2 +
              (q.y - coords[i + 1]) ** 2 +
              (q.z - coords[i + 2]) ** 2;
            if (d < best) best = d;
          }
        }
    return Math.sqrt(best);
  };
}

const PARENT_OF = {
  shoulderPitch: "baseRoll",
  elbowPitch: "shoulderPitch",
  wristRoll: "elbowPitch",
  wristPitch: "wristRoll",
  toolRoll: "wristPitch",
};
const LINK_AT = {
  baseRoll: "shoulder",
  shoulderPitch: "bicep",
  elbowPitch: "forearm",
  wristRoll: "wrist1",
  wristPitch: "wrist2",
  toolRoll: "tool",
};

setPose({ grip: 0 });

for (const joint of JOINT_ORDER) {
  const childLink = LINK_AT[joint];
  const parentJoint = PARENT_OF[joint] ?? null;
  const parentLink = parentJoint ? LINK_AT[parentJoint] : "base";

  const axisIsY = JOINT_FRAMES[joint].axis === "z";
  const axis = axisIsY ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);

  // Both clouds in the joint's own frame: the child's mesh is already origined
  // there, the parent's is origined one joint back.
  const shift = new THREE.Vector3(...offsetBetween(parentJoint, joint));
  const nearestParent = cloudIndex(surfaceCloud(links.get(parentLink), shift, axisIsY));
  const childPts = verticesOf(links.get(childLink), null, axisIsY);
  const q = new THREE.Vector3();
  const stillOnParent = (p, angle) =>
    nearestParent(q.copy(p).applyAxisAngle(axis, angle)) < CONTACT;

  // Touching at rest is not the same as bearing on each other. Two links also
  // touch across faces that simply happen to be near, and those separate the
  // instant the joint moves. So nudge the joint a few degrees and keep only
  // what is still in contact: that is the surface the joint actually turns on.
  const contact = childPts.filter((p) => nearestParent(p) < CONTACT);
  const NUDGE = 5 * (Math.PI / 180);
  const bearing = contact.filter(
    (p) => stillOnParent(p, NUDGE) && stillOnParent(p, -NUDGE),
  );

  // This ratio is the sharp signal. An axis that is wrong in direction or
  // position lifts the whole interface off at once, so almost nothing survives
  // the nudge and the set collapses, whatever the drift number then says.
  const held = bearing.length / Math.max(contact.length, 1);
  if (bearing.length < 20 || held < 0.4) {
    report(
      false,
      `${joint} turns on its interface`,
      `only ${bearing.length}/${contact.length} contact verts stay seated through 5°`,
    );
    continue;
  }

  const [lo, hi] = JOINT_FRAMES[joint].limit;
  const from = Number.isFinite(lo) ? lo : -Math.PI;
  const to = Number.isFinite(hi) ? hi : Math.PI;

  let worstDrift = 0;
  let worstAngle = 0;
  for (let i = 0; i <= 24; i++) {
    const angle = from + ((to - from) * i) / 24;
    // 90th percentile, not the max: a bearing is a finite band, so vertices at
    // its rim do run off the end of the parent's surface at full travel.
    const drift = bearing
      .map((p) => nearestParent(q.copy(p).applyAxisAngle(axis, angle)))
      .sort((a, b) => a - b);
    const d = drift[Math.floor(drift.length * 0.9)];
    if (d > worstDrift) {
      worstDrift = d;
      worstAngle = angle;
    }
  }

  report(
    worstDrift < 2 * CONTACT,
    `${joint} stays seated`,
    `${bearing.length}/${contact.length} verts bear, drift ${(worstDrift / MM).toFixed(1)} mm ` +
      `at ${((worstAngle * 180) / Math.PI).toFixed(0)}°`,
  );
}

console.log("\n3. gripper stroke vs Robotiq 2F-85 datasheet\n");

/**
 * Pad opening and tip height, CAD millimetres.
 *
 * Measured in the gripper's own frame rather than the world, so the answer does
 * not depend on how the gripper happens to be yawed onto the tool flange: local
 * X is always the opening direction and local Y always the approach.
 */
function padGeometry() {
  const intoGripper = new THREE.Matrix4().copy(gripper.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const boxOf = (name) => {
    const object = links.get(name);
    local.multiplyMatrices(intoGripper, object.matrixWorld);
    const attr = object.geometry.getAttribute("position");
    const box = new THREE.Box3();
    for (let i = 0; i < attr.count; i++) {
      box.expandByPoint(p.fromBufferAttribute(attr, i).applyMatrix4(local));
    }
    return box;
  };
  const boxL = boxOf("padL");
  const boxR = boxOf("padR");
  return {
    gap: (boxR.min.x - boxL.max.x) / MM,
    tip: Math.max(boxL.max.y, boxR.max.y) / MM,
  };
}

setPose({ grip: 0 });
const open = padGeometry();
setPose({ grip: 1 });
const closed = padGeometry();

report(
  Math.abs(open.gap - 85) < 3,
  "stroke: opening at grip 0",
  `${open.gap.toFixed(1)} mm vs 85 published`,
);
report(
  Math.abs(closed.gap) < 3,
  "stroke: opening at grip 1",
  `${closed.gap.toFixed(1)} mm, jaws meet`,
);
report(
  closed.gap > -3,
  "stroke: jaws do not pass through",
  `${closed.gap.toFixed(1)} mm of overlap`,
);
report(
  Math.abs(closed.tip - 162) < 4,
  "closed height above tool face",
  `${closed.tip.toFixed(1)} mm vs 162 published`,
);

console.log("\n4. jaw against jaw, across the whole stroke\n");

const linspace = (lo, hi, n) =>
  n === 1 ? [(lo + hi) / 2] : Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

let worstJaw = { gap: Infinity, where: null, grip: 0 };
for (const grip of linspace(0, 1, 101)) {
  setPose({ grip });
  const { gap, where } = minClearance(collisionLinks, JAW_PAIRS);
  if (gap < worstJaw.gap) worstJaw = { gap, where, grip };
}
report(
  worstJaw.gap > 0,
  "jaws never pass through each other",
  `closest ${(worstJaw.gap / MM).toFixed(1)} mm at grip ${worstJaw.grip.toFixed(2)}, ${worstJaw.where}`,
);

console.log("\n5. self-collision across the idle envelope\n");

/**
 * Sweeps the corners and interior of the box the idle animation lives in.
 *
 * Each idle channel oscillates inside its own range independently, so the box
 * really is the reachable set; covering it covers every frame the hero can ever
 * show. Roll joints are sampled coarsely because they cannot change which links
 * are near each other, only the orientation of near-symmetric housings.
 */
let worst = { gap: Infinity, where: null, pose: null };
let poses = 0;
for (const baseRoll of linspace(...IDLE_RANGE.baseRoll, 3))
  for (const shoulderPitch of linspace(...IDLE_RANGE.shoulderPitch, 7))
    for (const elbowPitch of linspace(...IDLE_RANGE.elbowPitch, 7))
      for (const wristPitch of linspace(...IDLE_RANGE.wristPitch, 6))
        for (const wristRoll of linspace(...IDLE_RANGE.wristRoll, 4))
          for (const toolRoll of linspace(...IDLE_RANGE.toolRoll, 3))
            for (const grip of [0, 1]) {
              const pose = {
                baseRoll,
                shoulderPitch,
                elbowPitch,
                wristRoll,
                wristPitch,
                toolRoll,
                grip,
              };
              setPose(pose);
              poses++;
              const { gap, where } = minClearance(collisionLinks, PAIRS);
              if (gap < worst.gap) worst = { gap, where, pose };
            }

const fmt = (p) =>
  JOINT_ORDER.map((k) => `${k} ${((p[k] * 180) / Math.PI).toFixed(0)}`).join(", ");

report(
  worst.gap > 0,
  `idle envelope, ${poses} poses`,
  `closest approach ${(worst.gap / MM).toFixed(1)} mm at ${worst.where}`,
);
console.log(`        worst pose: ${fmt(worst.pose)}`);

console.log("\n6. the scroll choreography\n");

/*
 * The whole authored path, not just its keyframes. Between two poses that are
 * each fine on their own the arm can still sweep through itself, and on a
 * scroll-driven move the viewer sees every frame in between.
 */
let worstMove = { gap: Infinity, where: null, t: 0 };
const scrollPose = {};
const STEPS = 2000;
for (let i = 0; i <= STEPS; i++) {
  const t = i / STEPS;
  setPose(poseAt(t, scrollPose));
  const { gap, where } = minClearance(collisionLinks, PAIRS);
  if (gap < worstMove.gap) worstMove = { gap, where, t };
}
report(
  worstMove.gap > 0,
  `path stays clear, ${KEYFRAMES.length} keyframes`,
  `closest ${(worstMove.gap / MM).toFixed(1)} mm at scroll ${worstMove.t.toFixed(3)}, ${worstMove.where}`,
);

/*
 * The move also has to keep moving.
 *
 * Easing each segment separately brings every joint to a dead stop at every
 * interior keyframe, which on screen reads as the animation stalling. It is
 * invisible to a collision sweep and obvious to anyone watching, so it gets its
 * own check: sample the joint-space speed along the path and require the
 * slowest interior moment to still be a reasonable fraction of the average.
 */
const speeds = [];
const prevPose = {};
const nextPose = {};
const SPEED_STEPS = 600;
for (let i = 0; i <= SPEED_STEPS; i++) {
  const t = i / SPEED_STEPS;
  poseAt(t, nextPose);
  if (i > 0) {
    let sum = 0;
    for (const key of JOINT_ORDER) sum += Math.abs(nextPose[key] - prevPose[key]);
    // Ignore the ends, which are meant to ease in and out of rest.
    if (t > 0.06 && t < 0.94) speeds.push({ t, speed: sum * SPEED_STEPS });
  }
  Object.assign(prevPose, nextPose);
}
const meanSpeed = speeds.reduce((s, x) => s + x.speed, 0) / speeds.length;
const slowest = speeds.reduce((a, b) => (b.speed < a.speed ? b : a));
report(
  slowest.speed > meanSpeed * 0.15,
  "path never stalls mid-move",
  `slowest ${(slowest.speed / meanSpeed).toFixed(2)}x mean, at scroll ${slowest.t.toFixed(3)}`,
);

// The landing pose is the one the eye rests on, so it gets checked on its own
// terms: the tool has to actually point down, not nearly down.
setPose(poseAt(1, scrollPose));
const approach = new THREE.Vector3(0, 1, 0).transformDirection(gripper.matrixWorld);
const fingertip = new THREE.Vector3(0, 162.8 * MM, 0).applyMatrix4(gripper.matrixWorld);
report(
  approach.y < -0.999,
  "landing pose: tool points down",
  `approach y = ${approach.y.toFixed(4)}`,
);
report(
  fingertip.y / MM > 40 && fingertip.y / MM < 200,
  "landing pose: fingertip near base height",
  `${(fingertip.y / MM).toFixed(0)} mm, base is 171 mm tall`,
);

console.log(
  `\n${failures ? `${failures} check(s) FAILED` : "all checks passed"}\n`,
);
process.exit(failures ? 1 : 0);
