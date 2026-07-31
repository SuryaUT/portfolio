"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  boltRingGeometry,
  jointBandGeometry,
  radiusProfile,
  sweptTubeGeometry,
} from "@/lib/arm-style";
import {
  BASE,
  BICEP,
  FOREARM,
  JOINTS,
  MM,
  SHOULDER,
  WRIST1,
  WRIST2,
  driftAt,
  lengthOf,
  offsetIn,
  type LinkMetrics,
} from "@/lib/gen3-metrics";
import { Shell, useArmStyle } from "./ArmStyle";

/**
 * Kinova Gen3 6-DOF, built from the measured vendor CAD (see lib/gen3-metrics).
 *
 * Joint chain: base roll, shoulder pitch, elbow pitch, wrist roll, wrist
 * pitch, tool roll. Every length, radius and lateral offset comes from the
 * STEP file rather than from estimation.
 *
 * Links overlap their joints by design. The bicep's shell starts 46 mm below
 * its own pivot because the housing wraps the joint, and reproducing that
 * overlap is what stops the arm reading as a stack of separate cylinders.
 */

export interface ArmPose {
  baseRoll: number;
  shoulderPitch: number;
  elbowPitch: number;
  wristRoll: number;
  wristPitch: number;
  toolRoll: number;
  /** 0 = fully open, 1 = fully closed. */
  grip: number;
}

export function createArmPose(): ArmPose {
  return {
    baseRoll: 0,
    shoulderPitch: 0.32,
    elbowPitch: 0.84,
    wristRoll: 0,
    wristPitch: 0.5,
    toolRoll: 0,
    grip: 0.2,
  };
}

/**
 * Builds a link as a swept tube following its measured centreline and radius.
 *
 * The tube's local origin is its own z0, so callers position it by the offset
 * from the parent joint, which is usually negative.
 */
function linkTube(l: LinkMetrics, tubular = 56, radial = 30) {
  const len = lengthOf(l);
  const pts = l.drift.map(
    ([t, dy]) => new THREE.Vector3(0, t * len, dy * MM),
  );
  // CatmullRomCurve3 needs three points to curve rather than interpolate flat.
  if (pts.length < 3) {
    pts.splice(1, 0, new THREE.Vector3(0, len * 0.5, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const profile = radiusProfile(l.radius.map(([t, r]) => [t, r * MM]));
  return sweptTubeGeometry(curve, profile, tubular, radial);
}

function useArmGeometries() {
  const geos = useMemo(
    () => ({
      mountDisc: new THREE.CylinderGeometry(58 * MM, 68 * MM, 14 * MM, 44),
      mountBolts: boltRingGeometry({
        count: 8,
        radius: 50 * MM,
        boltRadius: 6 * MM,
        height: 9 * MM,
      }),

      base: linkTube(BASE, 40, 34),
      shoulder: linkTube(SHOULDER),
      bicep: linkTube(BICEP, 72, 32),
      forearm: linkTube(FOREARM),
      wrist1: linkTube(WRIST1, 44, 28),
      wrist2: linkTube(WRIST2, 44, 28),

      bandBase: jointBandGeometry({ radius: 46 * MM, height: 12 * MM, proud: 3 * MM }),
      bandShoulder: jointBandGeometry({
        radius: 52 * MM,
        height: 11 * MM,
        proud: 3 * MM,
      }),
      bandElbow: jointBandGeometry({ radius: 52 * MM, height: 11 * MM, proud: 3 * MM }),
      bandWrist: jointBandGeometry({ radius: 40 * MM, height: 9 * MM, proud: 2.5 * MM }),
      bandTool: jointBandGeometry({ radius: 35 * MM, height: 8 * MM, proud: 2.5 * MM }),

      toolFlange: new THREE.CylinderGeometry(33 * MM, 30 * MM, 12 * MM, 30),
      flangeBolts: boltRingGeometry({
        count: 6,
        radius: 23 * MM,
        boltRadius: 4 * MM,
        height: 10 * MM,
      }),

      // Robotiq-style gripper: angular, to contrast the smooth shells.
      palm: new THREE.BoxGeometry(72 * MM, 34 * MM, 46 * MM),
      palmRib: new THREE.BoxGeometry(78 * MM, 8 * MM, 50 * MM),
      proximal: new THREE.BoxGeometry(14 * MM, 54 * MM, 24 * MM),
      distal: new THREE.BoxGeometry(12 * MM, 42 * MM, 22 * MM),
      pad: new THREE.BoxGeometry(7 * MM, 32 * MM, 20 * MM),
    }),
    [],
  );

  useEffect(() => {
    const created = Object.values(geos);
    return () => created.forEach((g) => g.dispose());
  }, [geos]);

  return geos;
}

export default function StylizedArm({ pose }: { pose: ArmPose }) {
  const g = useArmGeometries();
  const { palette } = useArmStyle();

  const j1 = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);
  const j3 = useRef<THREE.Group>(null);
  const j4 = useRef<THREE.Group>(null);
  const j5 = useRef<THREE.Group>(null);
  const j6 = useRef<THREE.Group>(null);
  const proxL = useRef<THREE.Group>(null);
  const proxR = useRef<THREE.Group>(null);
  const distL = useRef<THREE.Group>(null);
  const distR = useRef<THREE.Group>(null);

  useFrame(() => {
    if (j1.current) j1.current.rotation.y = pose.baseRoll;
    if (j2.current) j2.current.rotation.x = pose.shoulderPitch;
    if (j3.current) j3.current.rotation.x = pose.elbowPitch;
    if (j4.current) j4.current.rotation.y = pose.wristRoll;
    if (j5.current) j5.current.rotation.x = pose.wristPitch;
    if (j6.current) j6.current.rotation.y = pose.toolRoll;

    // Parallel-jaw linkage: the distal segment counter-rotates the proximal,
    // so the pads stay vertical through the stroke.
    const a = THREE.MathUtils.lerp(-0.3, 0.14, THREE.MathUtils.clamp(pose.grip, 0, 1));
    if (proxL.current) proxL.current.rotation.z = -a;
    if (proxR.current) proxR.current.rotation.z = a;
    if (distL.current) distL.current.rotation.z = a;
    if (distR.current) distR.current.rotation.z = -a;
  });

  const finger = (
    side: -1 | 1,
    prox: RefObject<THREE.Group | null>,
    dist: RefObject<THREE.Group | null>,
  ) => (
    <group ref={prox} position={[side * 24 * MM, 52 * MM, 0]}>
      <Shell
        geometry={g.proximal}
        color={palette.gripper}
        position={[0, 27 * MM, 0]}
        threshold={25}
      />
      <group ref={dist} position={[0, 54 * MM, 0]}>
        <Shell
          geometry={g.distal}
          color={palette.gripper}
          position={[0, 21 * MM, 0]}
          threshold={25}
        />
        <Shell
          geometry={g.pad}
          color={palette.accent}
          position={[side * -9 * MM, 21 * MM, 0]}
          threshold={25}
        />
      </group>
    </group>
  );

  return (
    <group>
      {/* ── Static mount + base ────────────────────────────────── */}
      <Shell geometry={g.mountDisc} color={palette.housingDeep} position={[0, 7 * MM, 0]} />
      <Shell geometry={g.mountBolts} color={palette.housing} position={[0, 16 * MM, 0]} />
      <Shell geometry={g.base} color={palette.shell} />
      <Shell
        geometry={g.bandBase}
        color={palette.accent}
        position={[0, JOINTS.baseRoll * MM, 0]}
        edges={false}
      />

      {/* ── J1 base roll ───────────────────────────────────────── */}
      <group ref={j1} position={[0, JOINTS.baseRoll * MM, 0]}>
        <Shell
          geometry={g.shoulder}
          color={palette.shell}
          position={[0, -offsetIn(SHOULDER, JOINTS.baseRoll), 0]}
        />

        {/* ── J2 shoulder pitch ──────────────────────────────── */}
        <group
          ref={j2}
          position={[
            0,
            (JOINTS.shoulderPitch - JOINTS.baseRoll) * MM,
            driftAt(SHOULDER, JOINTS.shoulderPitch),
          ]}
        >
          <Shell geometry={g.bandShoulder} color={palette.housing} />
          <Shell
            geometry={g.bicep}
            color={palette.shell}
            position={[0, -offsetIn(BICEP, JOINTS.shoulderPitch), 0]}
          />

          {/* ── J3 elbow pitch ─────────────────────────────── */}
          <group
            ref={j3}
            position={[
              0,
              (JOINTS.elbowPitch - JOINTS.shoulderPitch) * MM,
              driftAt(BICEP, JOINTS.elbowPitch) - driftAt(BICEP, JOINTS.shoulderPitch),
            ]}
          >
            <Shell geometry={g.bandElbow} color={palette.housing} />
            <Shell
              geometry={g.forearm}
              color={palette.shellAlt}
              position={[0, -offsetIn(FOREARM, JOINTS.elbowPitch), 0]}
            />

            {/* ── J4 wrist roll ────────────────────────────── */}
            <group
              ref={j4}
              position={[
                0,
                (JOINTS.wristRoll - JOINTS.elbowPitch) * MM,
                driftAt(FOREARM, JOINTS.wristRoll) - driftAt(FOREARM, JOINTS.elbowPitch),
              ]}
            >
              <Shell
                geometry={g.wrist1}
                color={palette.shell}
                position={[0, -offsetIn(WRIST1, JOINTS.wristRoll), 0]}
              />

              {/* ── J5 wrist pitch ─────────────────────────── */}
              <group
                ref={j5}
                position={[
                  0,
                  (JOINTS.wristPitch - JOINTS.wristRoll) * MM,
                  driftAt(WRIST1, JOINTS.wristPitch) - driftAt(WRIST1, JOINTS.wristRoll),
                ]}
              >
                <Shell geometry={g.bandWrist} color={palette.housing} />
                <Shell
                  geometry={g.wrist2}
                  color={palette.shell}
                  position={[0, -offsetIn(WRIST2, JOINTS.wristPitch), 0]}
                />

                {/* ── J6 tool roll ─────────────────────────── */}
                <group
                  ref={j6}
                  position={[
                    0,
                    (JOINTS.toolRoll - JOINTS.wristPitch) * MM,
                    driftAt(WRIST2, JOINTS.toolRoll) - driftAt(WRIST2, JOINTS.wristPitch),
                  ]}
                >
                  <Shell geometry={g.bandTool} color={palette.accent} edges={false} />
                  <Shell
                    geometry={g.toolFlange}
                    color={palette.housingDeep}
                    position={[0, 14 * MM, 0]}
                  />
                  <Shell
                    geometry={g.flangeBolts}
                    color={palette.housing}
                    position={[0, 21 * MM, 0]}
                  />
                  <Shell
                    geometry={g.palm}
                    color={palette.gripper}
                    position={[0, 36 * MM, 0]}
                    threshold={25}
                  />
                  <Shell
                    geometry={g.palmRib}
                    color={palette.housingDeep}
                    position={[0, 51 * MM, 0]}
                    threshold={25}
                  />
                  {finger(-1, proxL, distL)}
                  {finger(1, proxR, distR)}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
