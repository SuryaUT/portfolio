import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GRIPPER, GRIPPER_YAW, JOINT_FRAMES, JOINT_ORDER, MM, TOOL_FACE_Z } from "./lib/gen3-kinematics.ts";
import { buildPairs, buildSpheres, minClearance } from "./lib/gen3-collision.ts";

const buf = fs.readFileSync("public/models/gen3.glb");
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", res, rej));
const src = new Map(); gltf.scene.traverse(o => { if (o.isMesh) src.set(o.name, o); });

const toScene = (x, y, z) => [y * MM, z * MM, x * MM];
const off = (p, c) => {
  const a = p ? JOINT_FRAMES[p].origin : [0,0,0], b = c ? JOINT_FRAMES[c].origin : [0,0,0];
  return toScene(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
};
const links = new Map();
const add = (parent, key) => { const m = src.get(key).clone(); parent.add(m); links.set(key, m); return m; };
const grp = (parent, pos, rot) => { const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot); parent.add(g); return g; };

const root = new THREE.Group(); const J = {};
add(root, "base");
J.baseRoll = grp(root, off(null, "baseRoll")); add(J.baseRoll, "shoulder");
J.shoulderPitch = grp(J.baseRoll, off("baseRoll","shoulderPitch")); add(J.shoulderPitch, "bicep");
J.elbowPitch = grp(J.shoulderPitch, off("shoulderPitch","elbowPitch")); add(J.elbowPitch, "forearm");
J.wristRoll = grp(J.elbowPitch, off("elbowPitch","wristRoll")); add(J.wristRoll, "wrist1");
J.wristPitch = grp(J.wristRoll, off("wristRoll","wristPitch")); add(J.wristPitch, "wrist2");
J.toolRoll = grp(J.wristPitch, off("wristPitch","toolRoll")); add(J.toolRoll, "tool");
const gripper = grp(J.toolRoll, toScene(0,0,TOOL_FACE_Z - JOINT_FRAMES.toolRoll.origin[2]), [0, GRIPPER_YAW, 0]);
add(gripper, "palm");
const v = p => [Math.abs(p[0])*MM, p[1]*MM, 0], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],0];
const G = { knuckle:v(GRIPPER.outerKnuckle), innerKnuckle:v(GRIPPER.innerKnuckle),
  finger:sub(v(GRIPPER.outerFinger),v(GRIPPER.outerKnuckle)), tip:sub(v(GRIPPER.innerFinger),v(GRIPPER.outerFinger)) };
const jaws = {};
for (const side of [-1,1]) { const s = side===1?"R":"L"; const at=p=>[p[0]*side,p[1],p[2]];
  jaws["knuckle"+s]=grp(gripper,at(G.knuckle)); add(jaws["knuckle"+s],"knuckle"+s);
  const f=grp(jaws["knuckle"+s],at(G.finger)); add(f,"finger"+s);
  jaws["tip"+s]=grp(f,at(G.tip)); add(jaws["tip"+s],"tip"+s); add(jaws["tip"+s],"pad"+s);
  jaws["innerKnuckle"+s]=grp(gripper,at(G.innerKnuckle)); add(jaws["innerKnuckle"+s],"innerKnuckle"+s); }
const SENSE={knuckleL:-1,innerKnuckleL:-1,tipL:1,knuckleR:1,innerKnuckleR:1,tipR:-1};

function setPose(p) {
  for (const k of JOINT_ORDER) { const a = p[k] ?? 0;
    if (JOINT_FRAMES[k].axis === "z") J[k].rotation.y = a; else J[k].rotation.x = a; }
  const th = (p.grip ?? 0) * GRIPPER.thetaMax;
  for (const [k,s] of Object.entries(SENSE)) jaws[k].rotation.z = th*s;
  root.updateMatrixWorld(true);
}

const cl = [...links.entries()].map(([key,object]) => ({key,object,spheres:buildSpheres(object.geometry,{scale:object.scale.x})}));
const PAIRS = buildPairs(cl.map(l=>l.key));

/** Approach direction (gripper local +Y) and fingertip position, in world. */
const up = new THREE.Vector3(0,1,0), tipLocal = new THREE.Vector3(0, 162.8*MM, 0);
function ee() {
  const dir = up.clone().transformDirection(gripper.matrixWorld);
  const tip = tipLocal.clone().applyMatrix4(gripper.matrixWorld);
  return { dir, tip };
}

setPose({});
console.log("zero pose: approach dir", ee().dir.toArray().map(v=>v.toFixed(3)), "tip y(mm)", (ee().tip.y/MM).toFixed(0));

// Search: q4 = 0 keeps the arm planar, so the approach tilt is q2+q3+q5.
const DEG = Math.PI/180;
const results = [];
for (let q2 = -120*DEG; q2 <= 120*DEG; q2 += 2*DEG)
  for (let q3 = -140*DEG; q3 <= 140*DEG; q3 += 2*DEG) {
    for (const total of [Math.PI, -Math.PI]) {
      const q5 = total - q2 - q3;
      if (Math.abs(q5) > 2.09) continue;
      if (Math.abs(q2) > 2.24 || Math.abs(q3) > 2.57) continue;
      const pose = { baseRoll:0, shoulderPitch:q2, elbowPitch:q3, wristRoll:0, wristPitch:q5, toolRoll:0, grip:0.15 };
      setPose(pose);
      const { dir, tip } = ee();
      if (dir.y > -0.999) continue;                    // must point straight down
      const reach = Math.hypot(tip.x, tip.z) / MM;     // horizontal distance from the base axis
      results.push({ pose, tipY: tip.y/MM, reach, q2, q3, q5 });
    }
  }

// Want: tip near base height (~171mm tall), well clear of the base, elbow up.
const BASE_TOP = 170.9;
results.sort((a,b) => (Math.abs(a.tipY - BASE_TOP*0.6) - Math.abs(b.tipY - BASE_TOP*0.6))
  || (Math.abs(b.reach - 550) - Math.abs(a.reach - 550)));
const scored = results
  .filter(r => r.reach > 420 && r.reach < 680 && r.tipY > 70 && r.tipY < 190)
  .map(r => { setPose(r.pose); return { ...r, gap: minClearance(cl, PAIRS).gap / MM }; })
  .filter(r => r.gap > 15);

scored.sort((a,b) => b.gap - a.gap);
console.log(`\n${scored.length} collision-free candidates with the tool pointing straight down\n`);
console.log("  q2     q3     q5    tipY(mm)  reach(mm)  clearance(mm)");
for (const r of scored.filter((_,i)=>i%7===0).slice(0, 16)) {
  console.log(`  ${(r.q2/DEG).toFixed(0).padStart(5)} ${(r.q3/DEG).toFixed(0).padStart(6)} ${(r.q5/DEG).toFixed(0).padStart(6)}  ${r.tipY.toFixed(0).padStart(7)}  ${r.reach.toFixed(0).padStart(8)}  ${r.gap.toFixed(0).padStart(10)}`);
}
