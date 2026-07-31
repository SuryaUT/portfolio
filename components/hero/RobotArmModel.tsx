"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { scrollState } from "@/lib/scroll-state";
import { solve2BoneIK } from "@/lib/ik";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Materials
const MAT_LINK = { color: "#D4D4D0", metalness: 0.6, roughness: 0.35 };
const MAT_LINK_DARK = { color: "#9A9A96", metalness: 0.7, roughness: 0.3 };
const MAT_JOINT = { color: "#5A5A56", metalness: 0.85, roughness: 0.2 };
const MAT_JOINT_RIM = { color: "#2A2A28", metalness: 0.9, roughness: 0.15 };
const MAT_ACCENT = { color: "#FF4D1A", metalness: 0.5, roughness: 0.4 };
const MAT_GRIPPER = { color: "#3C3C3A", metalness: 0.75, roughness: 0.25 };
const MAT_BOLT = { color: "#1A1A18", metalness: 0.9, roughness: 0.2 };

interface RobotArmProps {
  animate?: boolean;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Decorative "bolt heads" arranged around a circle on the base
function BoltCircle({ count = 8, radius = 0.42, y = 0.1 }) {
  const bolts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    bolts.push(
      <mesh key={i} position={[Math.cos(a) * radius, y, Math.sin(a) * radius]}>
        <cylinderGeometry args={[0.025, 0.025, 0.04, 6]} />
        <meshStandardMaterial {...MAT_BOLT} />
      </mesh>,
    );
  }
  return <>{bolts}</>;
}

export default function RobotArm({ animate = true }: RobotArmProps) {
  const baseYawRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wristRef = useRef<THREE.Group>(null);
  const leftFingerRef = useRef<THREE.Group>(null);
  const rightFingerRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!animate) return;

    const t = clock.elapsedTime;
    const sp = scrollState.progress;

    const t_reach   = smoothstep(0.05, 0.42, sp);
    const t_pull    = smoothstep(0.52, 0.88, sp);
    const t_release = smoothstep(0.88, 1.0,  sp);
    const idleStrength = 1 - smoothstep(0.02, 0.12, sp);

    // panelY is the world-space Y of the panel's top edge (updated by ScrollTracker)
    const py = scrollState.panelY;

    // IK target: gripper tracks the rising panel edge, 0.4 units above it
    const idleY = 1.5;
    let targetY: number;
    if (sp < 0.52)      targetY = lerp(idleY, py + 0.4, t_reach);
    else if (sp < 0.88) targetY = py + 0.4;
    else                targetY = lerp(py + 0.4, py + 1.5, t_release);

    // Z (shoulder-local): arm shoulder sits at world Z=-1.5; gripper should land
    // at world Z=0 (the page). So shoulder-local targetZ = 0 - (-1.5) = 1.5 at grab.
    //   rest ~0.5 (gripper slightly forward) → arch forward → settle at 1.5 (page) → retract
    let targetZ: number;
    if (sp < 0.52)      targetZ = lerp(0.5, 1.5, t_reach) + 0.6 * Math.sin(t_reach * Math.PI);
    else if (sp < 0.88) targetZ = 1.5;
    else                targetZ = lerp(1.5, 0.3, t_release);

    const swayY = Math.sin(t * 0.5) * 0.15 * idleStrength;
    const swayZ = Math.cos(t * 0.4) * 0.10 * idleStrength;

    const { shoulderAngle, elbowAngle } = solve2BoneIK(
      targetY + swayY,
      targetZ + swayZ,
      1.5,
      1.2,
    );

    if (shoulderRef.current) shoulderRef.current.rotation.x = shoulderAngle;
    if (elbowRef.current)    elbowRef.current.rotation.x    = elbowAngle;

    if (baseYawRef.current)
      baseYawRef.current.rotation.y = Math.sin(t * 0.28) * 0.3 * idleStrength;

    // Wrist: idle sway only. Pitch is held at 0 so the finger Z offsets translate
    // purely to world Z (clean depth wrap) rather than tilting the fingers in screen Y.
    const wristPitch = 0;
    if (wristRef.current) {
      wristRef.current.rotation.z = Math.sin(t * 0.85) * 0.2 * idleStrength;
      wristRef.current.rotation.x = wristPitch;
    }

    // Gripper:
    //   X squeeze (the visible "close")
    //   Z offset (depth wrap around fake panel plane at PANEL_Z), compensated for
    //   wrist pitch so the fingers separate in world Z, not in screen-Y.
    const grab   = smoothstep(0.42, 0.52, sp);
    const ungrab = smoothstep(0.88, 0.96, sp);
    const gripAmt = Math.max(0, grab - ungrab);
    const offsetX = lerp(0.14, 0.065, gripAmt);
    // World-Z separation between front and back fingers (±this around the page plane).
    // Gemini's spec: ±0.5; using 0.4 so the fingers don't visually fly apart.
    const offsetZ_world = lerp(0, 0.4, gripAmt);
    // Compensate for wrist pitch so the Z displacement stays along world Z (no Y shift)
    const pitchCompY = offsetZ_world * Math.sin(wristPitch);
    const pitchCompZ = offsetZ_world * Math.cos(wristPitch);
    if (leftFingerRef.current)
      leftFingerRef.current.position.set(-offsetX, -pitchCompY, -pitchCompZ);
    if (rightFingerRef.current)
      rightFingerRef.current.position.set( offsetX,  pitchCompY,  pitchCompZ);
  });

  return (
    <group>
      <group position={[0, -1.2, 0]}>
        {/* Base plate */}
        <RoundedBox args={[1.3, 0.08, 1.3]} radius={0.04} smoothness={4} receiveShadow castShadow>
          <meshStandardMaterial {...MAT_JOINT_RIM} />
        </RoundedBox>

        {/* Base cylinder (sits on plate) */}
        <mesh position={[0, 0.13, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.52, 0.58, 0.18, 32]} />
          <meshStandardMaterial {...MAT_JOINT} />
        </mesh>

        {/* Decorative bolts around base */}
        <BoltCircle count={8} radius={0.5} y={0.06} />

        {/* Yaw joint */}
        <group ref={baseYawRef} position={[0, 0.22, 0]}>
          {/* Yaw ring (accent strip) */}
          <mesh receiveShadow castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 32]} />
            <meshStandardMaterial {...MAT_ACCENT} />
          </mesh>

          {/* Column / shoulder housing */}
          <group position={[0, 0.04, 0]}>
            {/* Lower column */}
            <mesh receiveShadow castShadow position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.22, 0.3, 0.7, 24]} />
              <meshStandardMaterial {...MAT_LINK} />
            </mesh>

            {/* Shoulder motor housing (cylindrical disc) */}
            <mesh receiveShadow castShadow position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.28, 0.28, 0.34, 24]} />
              <meshStandardMaterial {...MAT_JOINT} />
            </mesh>

            {/* Shoulder motor accent rim */}
            <mesh position={[0.18, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
              <meshStandardMaterial {...MAT_JOINT_RIM} />
            </mesh>
            <mesh position={[-0.18, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
              <meshStandardMaterial {...MAT_JOINT_RIM} />
            </mesh>

            {/* Shoulder joint */}
            <group ref={shoulderRef} position={[0, 0.85, 0]}>
              {/* Upper arm (link 1), slightly tapered with chamfered edges */}
              <RoundedBox
                args={[0.28, 1.5, 0.24]}
                radius={0.04}
                smoothness={4}
                position={[0, 0.78, 0]}
                receiveShadow
                castShadow
              >
                <meshStandardMaterial {...MAT_LINK} />
              </RoundedBox>

              {/* Link 1 cable conduit (dark strip on side) */}
              <mesh position={[0.16, 0.78, 0]}>
                <boxGeometry args={[0.04, 1.4, 0.06]} />
                <meshStandardMaterial {...MAT_BOLT} />
              </mesh>

              {/* Elbow motor housing */}
              <mesh
                position={[0, 1.55, 0]}
                rotation={[0, 0, Math.PI / 2]}
                receiveShadow
                castShadow
              >
                <cylinderGeometry args={[0.22, 0.22, 0.3, 24]} />
                <meshStandardMaterial {...MAT_JOINT} />
              </mesh>
              <mesh position={[0.16, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.02, 24]} />
                <meshStandardMaterial {...MAT_JOINT_RIM} />
              </mesh>
              <mesh position={[-0.16, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.18, 0.18, 0.02, 24]} />
                <meshStandardMaterial {...MAT_JOINT_RIM} />
              </mesh>

              {/* Elbow joint */}
              <group ref={elbowRef} position={[0, 1.55, 0]}>
                {/* Forearm (link 2) */}
                <RoundedBox
                  args={[0.22, 1.2, 0.2]}
                  radius={0.035}
                  smoothness={4}
                  position={[0, 0.62, 0]}
                  receiveShadow
                  castShadow
                >
                  <meshStandardMaterial {...MAT_LINK_DARK} />
                </RoundedBox>

                {/* Cable conduit on forearm */}
                <mesh position={[0.13, 0.62, 0]}>
                  <boxGeometry args={[0.03, 1.1, 0.05]} />
                  <meshStandardMaterial {...MAT_BOLT} />
                </mesh>

                {/* Wrist motor housing */}
                <mesh
                  position={[0, 1.24, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  receiveShadow
                  castShadow
                >
                  <cylinderGeometry args={[0.17, 0.17, 0.24, 24]} />
                  <meshStandardMaterial {...MAT_JOINT} />
                </mesh>

                {/* Wrist joint */}
                <group ref={wristRef} position={[0, 1.24, 0]}>
                  {/* Wrist link, accent */}
                  <RoundedBox
                    args={[0.18, 0.32, 0.18]}
                    radius={0.025}
                    smoothness={4}
                    position={[0, 0.21, 0]}
                    receiveShadow
                    castShadow
                  >
                    <meshStandardMaterial {...MAT_ACCENT} />
                  </RoundedBox>

                  {/* Flange / tool plate */}
                  <mesh position={[0, 0.39, 0]} receiveShadow castShadow>
                    <cylinderGeometry args={[0.14, 0.14, 0.05, 24]} />
                    <meshStandardMaterial {...MAT_JOINT_RIM} />
                  </mesh>

                  {/* Gripper mount block */}
                  <RoundedBox
                    args={[0.36, 0.1, 0.16]}
                    position={[0, 0.46, 0]}
                    receiveShadow
                    castShadow
                  >
                    <meshStandardMaterial {...MAT_JOINT} />
                  </RoundedBox>

                  {/* LEFT FINGER (animated x position) */}
                  <group ref={leftFingerRef} position={[-0.14, 0, 0]}>
                    <RoundedBox
                      args={[0.07, 0.32, 0.11]}
                      radius={0.015}
                      smoothness={3}
                      position={[0, 0.62, 0]}
                      receiveShadow
                      castShadow
                    >
                      <meshStandardMaterial {...MAT_GRIPPER} />
                    </RoundedBox>
                    {/* Fingertip accent */}
                    <mesh position={[0, 0.77, 0]} receiveShadow castShadow>
                      <boxGeometry args={[0.07, 0.05, 0.11]} />
                      <meshStandardMaterial {...MAT_ACCENT} />
                    </mesh>
                  </group>

                  {/* RIGHT FINGER */}
                  <group ref={rightFingerRef} position={[0.14, 0, 0]}>
                    <RoundedBox
                      args={[0.07, 0.32, 0.11]}
                      radius={0.015}
                      smoothness={3}
                      position={[0, 0.62, 0]}
                      receiveShadow
                      castShadow
                    >
                      <meshStandardMaterial {...MAT_GRIPPER} />
                    </RoundedBox>
                    <mesh position={[0, 0.77, 0]} receiveShadow castShadow>
                      <boxGeometry args={[0.07, 0.05, 0.11]} />
                      <meshStandardMaterial {...MAT_ACCENT} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
