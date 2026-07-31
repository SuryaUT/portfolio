import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Styling + geometry helpers for the stylized robot arm.
 *
 * The look is technical line-art rather than PBR: flat matte fills from a
 * banded toon ramp, with all the character carried by edge lines. That means
 * geometry has to supply the detail (grooves, teeth, bolts, louvres) because
 * there are no normal maps or reflections doing the work.
 */

export interface ArmPalette {
  /** Viewport background for the lab viewer. */
  bg: string;
  /** Edge-line color. Stays near-black in both themes. */
  ink: string;
  accent: string;
  shell: string;
  shellAlt: string;
  housing: string;
  housingDeep: string;
  gripper: string;
  /** Lighting rig, tuned per theme. */
  ambient: number;
  keyIntensity: number;
  fillIntensity: number;
  skyColor: string;
  groundColor: string;
}

/** Ink on warm paper. Matches reference image 1 (CAD line-art). */
export const ARM_LIGHT: ArmPalette = {
  bg: "#e8e6e0",
  ink: "#26261f",
  accent: "#ff4d1a",
  shell: "#dedcd4",
  shellAlt: "#c9c7bd",
  housing: "#b3b1a6",
  housingDeep: "#96948a",
  gripper: "#a5a399",
  ambient: 0.85,
  keyIntensity: 1.15,
  fillIntensity: 0.35,
  skyColor: "#fff6e8",
  groundColor: "#7d9aa3",
};

/**
 * Matte low-key greys.
 *
 * Sizing the shell against the background is the whole job here, and the toon
 * ramp makes that less obvious than it sounds. The darkest band multiplies the
 * shell by RAMP_STOPS[0], so the shadow side is what the eye has to separate
 * from the page, not the shell colour itself. At the old shell of #4c4b46 that
 * worked out to rgb(32,31,29) against a background of rgb(35,35,33): the unlit
 * half of every link was fractionally DARKER than the paper behind it, so the
 * arm lost its shape wherever it turned away from the key light.
 *
 * So the shell is lifted until the darkest band clears the background with room
 * to spare, and the background dropped a little to widen the same gap from the
 * other side. Ambient does the rest: it lifts the shadow band without touching
 * the lit one, which keeps the flat graphic look rather than washing it out.
 */
export const ARM_DARK: ArmPalette = {
  bg: "#1c1c1a",
  ink: "#0a0a09",
  accent: "#ff4d1a",
  // Darkest band lands near rgb(48,47,44) against rgb(28,28,26) of background.
  shell: "#74726a",
  shellAlt: "#615f59",
  housing: "#4f4e48",
  housingDeep: "#413f3b",
  gripper: "#59574f",
  ambient: 0.6,
  keyIntensity: 1.05,
  fillIntensity: 0.34,
  skyColor: "#dfe6ea",
  groundColor: "#24444f",
};

/**
 * Greyscale step ramp for MeshToonMaterial.
 *
 * three.js only samples the red channel of a gradientMap and returns it as a
 * greyscale multiplier (see gradientmap_pars_fragment.glsl), so a colored ramp
 * would NOT produce hue-shifted shadows. The warm/cool split comes from the
 * hemisphere light instead.
 */
export function makeToonRamp(stops: number[]): THREE.DataTexture {
  const data = new Uint8Array(stops.length * 4);
  stops.forEach((v, i) => {
    const b = Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255);
    data[i * 4 + 0] = b;
    data[i * 4 + 1] = b;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Four hard bands. Fewer reads as flatter/more graphic, more reads as softer. */
export const RAMP_STOPS = [0.42, 0.68, 0.88, 1.0];

// ── Geometry builders ───────────────────────────────────────────────────

interface RidgedBarrelOptions {
  radius: number;
  height: number;
  ridges: number;
  grooveDepth?: number;
  /** Radius delta from bottom to top. Negative tapers inward. */
  taper?: number;
  segments?: number;
  capped?: boolean;
}

/**
 * A machined barrel with square-cut circumferential grooves, built as a single
 * LatheGeometry.
 *
 * One mesh instead of a stack of ring meshes matters a lot here: EdgesGeometry
 * then emits every groove line in one pass, so a richly threaded barrel costs
 * one draw call for the fill and one for the lines.
 */
export function ridgedBarrelGeometry({
  radius,
  height,
  ridges,
  grooveDepth = 0.018,
  taper = 0,
  segments = 44,
  capped = true,
}: RidgedBarrelOptions): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const y0 = -height / 2;
  const step = height / ridges;
  const rAt = (t: number) => radius + taper * t;

  if (capped) pts.push(new THREE.Vector2(0, y0));
  pts.push(new THREE.Vector2(rAt(0), y0));

  for (let i = 0; i < ridges; i++) {
    const base = i * step;
    const rOut = rAt(base / height);
    const rNext = rAt((base + step) / height);
    // Vertical wall, groove floor, then back out. Square corners give the
    // 90 degree creases that EdgesGeometry turns into crisp ring lines.
    pts.push(new THREE.Vector2(rOut, y0 + base + step * 0.3));
    pts.push(new THREE.Vector2(rOut - grooveDepth, y0 + base + step * 0.42));
    pts.push(new THREE.Vector2(rOut - grooveDepth, y0 + base + step * 0.78));
    pts.push(new THREE.Vector2(rNext, y0 + base + step * 0.9));
  }

  pts.push(new THREE.Vector2(rAt(1), y0 + height));
  if (capped) pts.push(new THREE.Vector2(0, y0 + height));

  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

interface ToothRingOptions {
  count: number;
  innerRadius: number;
  outerRadius: number;
  height: number;
  /** Tooth width as a fraction of the gap pitch. */
  fill?: number;
}

/** Radial gear/knurl teeth, merged into one geometry. */
export function toothRingGeometry({
  count,
  innerRadius,
  outerRadius,
  height,
  fill = 0.55,
}: ToothRingOptions): THREE.BufferGeometry {
  const depth = outerRadius - innerRadius;
  const mid = (innerRadius + outerRadius) / 2;
  const pitch = (2 * Math.PI * mid) / count;
  const width = pitch * fill;

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const g = new THREE.BoxGeometry(width, height, depth);
    // Translate outward along +Z first, then swing around Y.
    const m = new THREE.Matrix4()
      .makeRotationY(a)
      .multiply(new THREE.Matrix4().makeTranslation(0, 0, mid));
    g.applyMatrix4(m);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

interface BoltRingOptions {
  count: number;
  radius: number;
  boltRadius: number;
  height: number;
  sides?: number;
}

/** Ring of hex bolt heads, merged into one geometry. */
export function boltRingGeometry({
  count,
  radius,
  boltRadius,
  height,
  sides = 6,
}: BoltRingOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(boltRadius, boltRadius, height, sides);
    g.translate(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

interface VentSlotsOptions {
  count: number;
  width: number;
  height: number;
  depth: number;
  gap: number;
}

/** Row of louvre slots along Y, merged into one geometry. */
export function ventSlotsGeometry({
  count,
  width,
  height,
  depth,
  gap,
}: VentSlotsOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pitch = height + gap;
  const total = count * pitch - gap;
  for (let i = 0; i < count; i++) {
    const g = new THREE.BoxGeometry(width, height, depth);
    g.translate(0, -total / 2 + height / 2 + i * pitch, 0);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

interface FinStackOptions {
  count: number;
  width: number;
  thickness: number;
  depth: number;
  gap: number;
}

/** Heat-sink fins stacked along Y, merged into one geometry. */
export function finStackGeometry({
  count,
  width,
  thickness,
  depth,
  gap,
}: FinStackOptions): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pitch = thickness + gap;
  const total = count * pitch - gap;
  for (let i = 0; i < count; i++) {
    const g = new THREE.BoxGeometry(width, thickness, depth);
    g.translate(0, -total / 2 + thickness / 2 + i * pitch, 0);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/**
 * Smooth interpolation across [t, radius] control points.
 *
 * Lets a link's silhouette be authored declaratively: the swelling belly and
 * necked-down joint ends of a collaborative arm are just four or five stops.
 */
export function radiusProfile(
  stops: Array<[number, number]>,
): (t: number) => number {
  const sorted = [...stops].sort((a, b) => a[0] - b[0]);
  const last = sorted[sorted.length - 1];
  return (t: number) => {
    if (t <= sorted[0][0]) return sorted[0][1];
    if (t >= last[0]) return last[1];
    for (let i = 1; i < sorted.length; i++) {
      const [t1, r1] = sorted[i];
      if (t <= t1) {
        const [t0, r0] = sorted[i - 1];
        const u = (t - t0) / (t1 - t0);
        return r0 + (r1 - r0) * (u * u * (3 - 2 * u));
      }
    }
    return last[1];
  };
}

/**
 * Sweeps a circle of varying radius along a curve.
 *
 * This is three.js TubeGeometry's algorithm with the constant radius replaced
 * by a function, which is the whole point: collaborative-arm links are bodies
 * of revolution that swell in the middle and neck down into each joint, and a
 * fixed-radius tube cannot express that.
 */
export function sweptTubeGeometry(
  curve: THREE.Curve<THREE.Vector3>,
  radiusAt: (t: number) => number,
  tubularSegments = 56,
  radialSegments = 24,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const indices: number[] = [];
  const P = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radiusAt(t);
    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const s = Math.sin(v);
      const c = -Math.cos(v);
      positions.push(
        P.x + r * (c * N.x + s * B.x),
        P.y + r * (c * N.y + s * B.y),
        P.z + r * (c * N.z + s * B.z),
      );
    }
  }

  const ring = radialSegments + 1;
  for (let i = 1; i <= tubularSegments; i++) {
    for (let j = 1; j <= radialSegments; j++) {
      const a = ring * (i - 1) + (j - 1);
      const b = ring * i + (j - 1);
      const c = ring * i + j;
      const d = ring * (i - 1) + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  // Flat caps. Frenet frames are right-handed with N x B = T, so the start
  // fan wound (center, j-1, j) faces -T and the end fan reversed faces +T,
  // which is outward at both ends.
  const startCenter = positions.length / 3;
  const p0 = curve.getPointAt(0);
  positions.push(p0.x, p0.y, p0.z);
  for (let j = 1; j <= radialSegments; j++) indices.push(startCenter, j - 1, j);

  const endCenter = positions.length / 3;
  const p1 = curve.getPointAt(1);
  positions.push(p1.x, p1.y, p1.z);
  const base = ring * tubularSegments;
  for (let j = 1; j <= radialSegments; j++) {
    indices.push(endCenter, base + j, base + j - 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

interface JointBandOptions {
  radius: number;
  height: number;
  /** How far the band stands proud of the tube it wraps. */
  proud?: number;
  segments?: number;
}

/**
 * The rotating-module collar that sits at every joint.
 *
 * On a collaborative arm this band is the only thing marking a joint: the
 * shells either side of it are continuous smooth tubes with no creases, so
 * without the band's flat step EdgesGeometry would find nothing to draw and
 * the whole arm would read as one undifferentiated tube.
 */
export function jointBandGeometry({
  radius,
  height,
  proud = 0.012,
  segments = 40,
}: JointBandOptions): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(
    radius + proud,
    radius + proud,
    height,
    segments,
  );
}

/** A tapered link body with chamfered corners. */
export function linkGeometry(
  bottomWidth: number,
  topWidth: number,
  height: number,
  depth: number,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(
    topWidth * Math.SQRT1_2,
    bottomWidth * Math.SQRT1_2,
    height,
    4,
    1,
  );
  g.rotateY(Math.PI / 4);
  g.scale(1, 1, depth / bottomWidth);
  return g;
}
