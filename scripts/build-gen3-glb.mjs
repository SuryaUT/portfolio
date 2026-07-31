import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, prune, quantize, simplify, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";

const require = createRequire(path.join(process.cwd(), "package.json"));
const occtimportjs = require("occt-import-js");

/**
 * Tessellates the Kinova Gen3 (no-vision) and Robotiq 2F-85 STEP files into one
 * rigged glTF for the hero arm.
 *
 * Offline build step, run by hand. The source CAD lives in /cad and is
 * gitignored; only the generated .glb is committed.
 *
 *   npm run build:arm
 *
 * Every link is emitted as its own mesh, re-origined so its own joint sits at
 * (0,0,0). That is what lets the React component parent them into a chain and
 * set one rotation per group, with no per-frame offset maths and no chance of a
 * link pivoting about the wrong point.
 *
 * Re-origining is 3D, not just a height: the pitch axes sit 5.4 mm off the base
 * centreline and the wrist 1 mm the other way. Subtracting only the Z of each
 * joint leaves every link pivoting millimetres from its real axis, and the
 * housings shear apart as the arm moves. Joint frames, and where each number
 * came from, are in lib/gen3-kinematics.ts.
 */

const ARM_STEP = "cad/GEN3_6DOF_NO-VISION_V01.STEP";
const GRIP_STEP = "cad/2F85-OPENED_20190924.STEP";
const OUT_PATH = "public/models/gen3.glb";

/** Keep in sync with MM in lib/gen3-kinematics.ts. */
const MM = 1 / 300;

/**
 * Tessellation quality, as a fraction of each file's bounding box. The arm is
 * ~1.2 m across and the gripper ~0.2 m, so they need different ratios to end up
 * at a comparable absolute chord error.
 */
const ARM_DEFLECTION = 0.002;
const GRIP_DEFLECTION = 0.004;

/**
 * Arm links, with the joint each one hangs off, in CAD millimetres.
 *
 * Keep in sync with JOINT_FRAMES in lib/gen3-kinematics.ts, which documents
 * where the numbers came from. scripts/check-gen3-glb.mjs fails if they drift.
 */
const ARM_LINKS = [
  { key: "base", match: "BASE", origin: [0, 0, 0] },
  { key: "shoulder", match: "SHOULDER", origin: [0, 0, 156.43] },
  { key: "bicep", match: "BICEP", origin: [0, -5.375, 284.81] },
  { key: "forearm", match: "Forearm", origin: [0, -5.375, 694.81] },
  { key: "wrist1", match: "Spherical Wrist1", origin: [0, 1.0, 903.24] },
  { key: "wrist2", match: "Spherical Wrist2", origin: [0, 1.175, 1009.17] },
  { key: "tool", match: "No-Vision", origin: [0, 1.35, 1115.1] },
];

/** Centre of the 2F-85 coupling along its CAD Z. */
const GRIP_AXIS_Z = 93.45;

/**
 * 2F-85 links. `match` picks the STEP part, `side` picks which of the two
 * mirrored instances of that part, and `pivot` is the CAD XY the mesh is
 * re-origined about. The pad has no pivot of its own: it is bolted to the inner
 * finger, so it shares that origin and moves as one piece with it.
 */
const GRIP_LINKS = [
  { key: "palm", match: "base", side: 0, pivot: [0, 0] },

  { key: "knuckleL", match: "Finger1", side: -1, pivot: [-30.5, 54.64] },
  { key: "fingerL", match: "finger2", side: -1, pivot: [-62.0, 50.89] },
  { key: "tipL", match: "finger4", side: -1, pivot: [-67.87, 98.32] },
  { key: "padL", match: "fingertips", side: -1, pivot: [-67.87, 98.32] },
  { key: "innerKnuckleL", match: "finger3", side: -1, pivot: [-12.7, 61.45] },

  { key: "knuckleR", match: "Finger1", side: 1, pivot: [30.5, 54.64] },
  { key: "fingerR", match: "finger2", side: 1, pivot: [62.0, 50.89] },
  { key: "tipR", match: "finger4", side: 1, pivot: [67.87, 98.32] },
  { key: "padR", match: "fingertips", side: 1, pivot: [67.87, 98.32] },
  { key: "innerKnuckleR", match: "finger3", side: 1, pivot: [12.7, 61.45] },
];

function gather(node, out = []) {
  for (const i of node.meshes ?? []) out.push(i);
  for (const c of node.children ?? []) gather(c, out);
  return out;
}

/**
 * The assembly's link-level nodes.
 *
 * Deliberately NOT a recursive search from the root: the top-level arm assembly
 * is called GEN3_6DOF_SPHERICAL_NO-VISION_V01, so a substring match for
 * "No-Vision" hits it first and silently returns the entire arm.
 */
function linkNodes(root) {
  const top = (root.children ?? []).find((c) => (c.children ?? []).length > 0);
  return top?.children ?? root.children ?? [];
}

async function tessellate(occt, file, deflection) {
  const bytes = new Uint8Array(fs.readFileSync(file));
  console.log(`\ntessellating ${file} (${(bytes.length / 1e6).toFixed(1)} MB) ...`);
  const t0 = Date.now();
  const result = occt.ReadStepFile(bytes, {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: deflection,
    angularDeflection: 0.5,
  });
  if (!result.success) throw new Error(`STEP import failed: ${file}`);
  console.log(`  ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return result;
}

/** Mean X of a node's vertices, used to tell the two mirrored fingers apart. */
function meanX(result, node) {
  let sum = 0;
  let n = 0;
  for (const mi of gather(node)) {
    const p = result.meshes[mi]?.attributes?.position?.array;
    if (!p) continue;
    for (let i = 0; i < p.length; i += 3) {
      sum += p[i];
      n++;
    }
  }
  return n ? sum / n : 0;
}

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("gen3");
const material = doc
  .createMaterial("shell")
  .setBaseColorFactor([0.85, 0.85, 0.83, 1])
  .setRoughnessFactor(1)
  .setMetallicFactor(0);

let totalTris = 0;

/**
 * Discards geometry that sits nowhere near the rest of its own link.
 *
 * The vendor CAD has a stray point at the world origin inside the wrist-1 body,
 * left over from whatever built it. It is invisible in the solid, but the
 * tessellator dutifully joins it to the real surface, and the resulting sliver
 * triangles are a metre long in a link that is 141 mm tall. Flat-shaded they
 * are hard to see; as a crease line they draw a hairline straight through the
 * whole render, which is how this was noticed.
 *
 * The rejection box is the 1st-to-99th percentile of each axis grown by 150%
 * either way, so it is roughly four times the link's real size. Nothing
 * legitimate comes close to that, and anything that does is worth the warning.
 */
function dropStrays(key, positions, normals, indices) {
  const count = positions.length / 3;
  const bounds = [];
  for (let axis = 0; axis < 3; axis++) {
    const values = new Float64Array(count);
    for (let i = 0; i < count; i++) values[i] = positions[i * 3 + axis];
    values.sort();
    const lo = values[Math.floor(count * 0.01)];
    const hi = values[Math.ceil(count * 0.99) - 1];
    const pad = Math.max((hi - lo) * 1.5, 1e-9);
    bounds.push([lo - pad, hi + pad]);
  }

  const inside = new Uint8Array(count);
  let strays = 0;
  for (let i = 0; i < count; i++) {
    let ok = true;
    for (let axis = 0; axis < 3 && ok; axis++) {
      const v = positions[i * 3 + axis];
      ok = v >= bounds[axis][0] && v <= bounds[axis][1];
    }
    inside[i] = ok ? 1 : 0;
    if (!ok) strays++;
  }
  if (!strays) return { positions, normals, indices, strays: 0, tris: 0 };

  // Keep only triangles made entirely of surviving vertices, then compact.
  const remap = new Int32Array(count).fill(-1);
  const keptIndices = [];
  let dropped = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const t = [indices[i], indices[i + 1], indices[i + 2]];
    if (!t.every((v) => inside[v])) {
      dropped++;
      continue;
    }
    for (const v of t) {
      if (remap[v] < 0) remap[v] = -2; // referenced, numbered below
    }
    keptIndices.push(t[0], t[1], t[2]);
  }

  const keptPositions = [];
  const keptNormals = [];
  let next = 0;
  for (let i = 0; i < count; i++) {
    if (remap[i] !== -2) continue;
    remap[i] = next++;
    keptPositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    if (normals.length === positions.length) {
      keptNormals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
    }
  }

  console.warn(
    `  ! ${key}: dropped ${strays} stray vert(s) and ${dropped} triangle(s) hanging off them`,
  );
  return {
    positions: keptPositions,
    normals: keptNormals,
    indices: keptIndices.map((v) => remap[v]),
    strays,
    tris: dropped,
  };
}

/**
 * Emits one link mesh. `place` maps a CAD vertex to the link's own scene frame;
 * `rotate` does the same for a normal (the rotation part, without translation).
 */
function emit(key, result, nodes, place, rotate) {
  let positions = [];
  let normals = [];
  let indices = [];

  for (const node of nodes) {
    for (const mi of gather(node)) {
      const mesh = result.meshes[mi];
      if (!mesh?.attributes?.position) continue;

      const pos = mesh.attributes.position.array;
      const nrm = mesh.attributes.normal?.array;
      const idx = mesh.index.array;
      const base = positions.length / 3;

      for (let i = 0; i < pos.length; i += 3) {
        const v = place(pos[i], pos[i + 1], pos[i + 2]);
        positions.push(v[0], v[1], v[2]);
      }
      if (nrm) {
        for (let i = 0; i < nrm.length; i += 3) {
          const v = rotate(nrm[i], nrm[i + 1], nrm[i + 2]);
          normals.push(v[0], v[1], v[2]);
        }
      }
      for (let i = 0; i < idx.length; i++) indices.push(base + idx[i]);
    }
  }

  if (!positions.length) {
    console.warn(`  ! ${key}: no geometry, skipping`);
    return;
  }

  ({ positions, normals, indices } = dropStrays(key, positions, normals, indices));

  const prim = doc
    .createPrimitive()
    .setMaterial(material)
    .setAttribute(
      "POSITION",
      doc.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer),
    )
    .setIndices(
      doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(indices)).setBuffer(buffer),
    );

  if (normals.length === positions.length) {
    prim.setAttribute(
      "NORMAL",
      doc.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer),
    );
  }

  scene.addChild(doc.createNode(key).setMesh(doc.createMesh(key).addPrimitive(prim)));

  const tris = indices.length / 3;
  totalTris += tris;
  console.log(`  ${key.padEnd(15)} ${String(Math.round(tris)).padStart(7)} tris`);
}

const occt = await occtimportjs();

// ---------------------------------------------------------------- arm -------
// CAD is Z-up millimetres; the scene is Y-up scaled units. The cyclic swap
// cad(x,y,z) -> scene(y, z, x) preserves handedness, so winding and normals
// stay valid, and it lands the two joint axes on the two obvious scene axes:
// CAD Z (roll) becomes scene Y, CAD Y (pitch) becomes scene X. Every joint is
// then a positive rotation about a scene axis, with no sign corrections.
{
  const result = await tessellate(occt, ARM_STEP, ARM_DEFLECTION);
  const parts = linkNodes(result.root);
  for (const link of ARM_LINKS) {
    const node = parts.find((c) =>
      c.name?.toUpperCase().includes(link.match.toUpperCase()),
    );
    if (!node) {
      console.warn(`  ! "${link.match}" not found, skipping`);
      continue;
    }
    const [ox, oy, oz] = link.origin;
    emit(
      link.key,
      result,
      [node],
      (x, y, z) => [(y - oy) * MM, (z - oz) * MM, (x - ox) * MM],
      (x, y, z) => [y, z, x],
    );
  }
}

// ------------------------------------------------------------- gripper ------
// The 2F-85 CAD already has +Y along the approach direction and every pivot
// parallel to Z, which is exactly the arm's tool frame once the arm's own axis
// swap is applied. So the only change here is recentring: the coupling sits at
// z = 93.45 rather than on the axis.
{
  const result = await tessellate(occt, GRIP_STEP, GRIP_DEFLECTION);
  const parts = linkNodes(result.root);
  const sides = new Map(parts.map((n) => [n, meanX(result, n)]));

  for (const link of GRIP_LINKS) {
    const nodes = parts.filter((c) => {
      if (!c.name?.toLowerCase().includes(link.match.toLowerCase())) return false;
      if (link.side === 0) return true;
      return Math.sign(sides.get(c)) === link.side;
    });
    if (!nodes.length) {
      console.warn(`  ! "${link.match}" side ${link.side} not found, skipping`);
      continue;
    }
    const [px, py] = link.pivot;
    emit(
      link.key,
      result,
      nodes,
      (x, y, z) => [(x - px) * MM, (y - py) * MM, (z - GRIP_AXIS_Z) * MM],
      (x, y, z) => [x, y, z],
    );
  }
}

/*
 * Straight off the tessellator this is a ~4 MB, 144k-triangle download, most of
 * it spent on the vision module's camera housing and the gripper palm: features
 * a few millimetres across that a flat-shaded toon render cannot show anyway.
 *
 * simplify() collapses them under a tight error bound, and quantize() packs
 * positions and normals into integers. Quantization uses KHR_mesh_quantization,
 * which three's GLTFLoader reads natively, so neither step needs a decoder
 * wired up on the client.
 */
await MeshoptSimplifier.ready;
await doc.transform(
  weld(),
  dedup(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.0015 }),
  prune(),
  quantize(),
);

let finalTris = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    finalTris += (prim.getIndices()?.getCount() ?? 0) / 3;
  }
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const glb = await io.writeBinary(doc);
fs.writeFileSync(OUT_PATH, glb);

console.log(
  `\nwrote ${OUT_PATH}  ${(glb.byteLength / 1e6).toFixed(2)} MB  ` +
    `${Math.round(finalTris)} tris (from ${Math.round(totalTris)})`,
);
