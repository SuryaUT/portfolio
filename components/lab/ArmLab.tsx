"use client";

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { ARM_DARK, ARM_LIGHT } from "@/lib/arm-style";
import { MM, JOINT_FRAMES, JOINT_ORDER, type JointKey } from "@/lib/gen3-kinematics";
import type { Clearance } from "@/lib/gen3-collision";
import { ArmStyleProvider, useArmStyle } from "@/components/hero/arm/ArmStyle";
import Gen3Arm, { createArmPose, type ArmPose } from "@/components/hero/arm/Gen3Arm";
import { useIdlePose } from "@/components/hero/arm/useIdlePose";
import { useScrollPose } from "@/components/hero/arm/useScrollPose";

/**
 * Lighting rig for the toon look.
 *
 * MeshToonMaterial only samples the red channel of its gradientMap, so the
 * warm/cool split has to come from the lights. The hemisphere light does that
 * work: warm sky, cool ground, which reads as amber highlights against teal
 * shadow without any per-material tinting.
 */
function ArmLighting() {
  const { palette } = useArmStyle();
  return (
    <>
      <hemisphereLight
        color={palette.skyColor}
        groundColor={palette.groundColor}
        intensity={palette.ambient}
      />
      <directionalLight
        position={[-4, 6, 4]}
        intensity={palette.keyIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[5, 2, -3]} intensity={palette.fillIntensity} />
    </>
  );
}

const FLOOR_Y = -1.95;

type Mode = "idle" | "scroll" | "manual";

function Scene({
  mode,
  manual,
  onClearance,
}: {
  mode: Mode;
  manual: ArmPose;
  onClearance: (clearance: Clearance) => void;
}) {
  // Both hooks always run; the inactive one is told to stand down rather than
  // being conditionally called, since hooks cannot be.
  const idlePose = useIdlePose(mode === "idle");
  const scrollPose = useScrollPose(mode === "scroll");
  const pose = mode === "idle" ? idlePose : mode === "scroll" ? scrollPose : manual;
  return (
    <group position={[0, FLOOR_Y, 0]}>
      <Gen3Arm pose={pose} onClearance={onClearance} />
    </group>
  );
}

const DEG = 180 / Math.PI;

const JOINT_LABEL: Record<JointKey, string> = {
  baseRoll: "J1 base",
  shoulderPitch: "J2 shoulder",
  elbowPitch: "J3 elbow",
  wristRoll: "J4 wrist roll",
  wristPitch: "J5 wrist",
  toolRoll: "J6 tool",
};

/** Slider travel: the hardware limit, or a full turn for the continuous joints. */
function travelOf(key: JointKey): [number, number] {
  const [lo, hi] = JOINT_FRAMES[key].limit;
  return [Number.isFinite(lo) ? lo : -Math.PI, Number.isFinite(hi) ? hi : Math.PI];
}

export default function ArmLab() {
  const reduced = useReducedMotion();
  const [dark, setDark] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);
  const [lineWidth, setLineWidth] = useState(1.4);
  const [outlineWidth, setOutlineWidth] = useState(3);
  const [mode, setMode] = useState<Mode>(reduced ? "manual" : "idle");
  const [manual, setManual] = useState<ArmPose>(() => createArmPose());
  const [clearance, setClearance] = useState<Clearance | null>(null);

  const palette = dark ? ARM_DARK : ARM_LIGHT;

  const setJoint = useCallback((key: keyof ArmPose, value: number) => {
    setManual((p) => ({ ...p, [key]: value }));
  }, []);

  // Rounded to the millimetre before it reaches state, so a pose that is simply
  // sitting still stops re-rendering the panel sixty times a second.
  const onClearance = useCallback((next: Clearance) => {
    setClearance((prev) =>
      prev &&
      prev.where === next.where &&
      Math.round(prev.gap / MM) === Math.round(next.gap / MM)
        ? prev
        : next,
    );
  }, []);

  const panelStyle = {
    borderColor: dark ? "#3a3936" : "#cecbc2",
    background: dark ? "rgba(20,20,18,0.78)" : "rgba(250,250,247,0.78)",
    color: dark ? "#ebebe7" : "#26261f",
  };

  return (
    <div
      style={{
        background: palette.bg,
        // Scroll mode needs the page to actually scroll, and the length of that
        // run is the pacing of the move: the whole choreography plays out over
        // it, so three extra viewports is roughly one screen per beat.
        minHeight: mode === "scroll" ? "400vh" : "100vh",
      }}
    >
      <Canvas
        className="!fixed inset-0"
        camera={{ position: [5.2, 1.6, 7.4], fov: 32 }}
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ArmStyleProvider
            palette={palette}
            lineWidth={lineWidth}
            showEdges={showEdges}
            outlineWidth={outlineWidth}
            showOutlines={showOutlines}
          >
            <ArmLighting />
            <Scene mode={mode} manual={manual} onClearance={onClearance} />
            <ContactShadows
              position={[0, FLOOR_Y - 0.02, 0]}
              opacity={dark ? 0.5 : 0.28}
              scale={9}
              blur={2.4}
              far={4}
            />
          </ArmStyleProvider>
          <OrbitControls
            target={[0, 0.35, 0]}
            enablePan
            // In scroll mode the wheel belongs to the page, not the camera.
            // Leaving zoom on means every attempt to drive the arm dollies the
            // camera instead and the move never plays.
            enableZoom={mode !== "scroll"}
            minDistance={2}
            maxDistance={16}
            maxPolarAngle={Math.PI / 1.85}
          />
        </Suspense>
      </Canvas>

      <div
        className="fixed left-6 top-6 w-56 space-y-4 rounded-lg border p-4 font-jetbrains text-[0.6875rem] uppercase tracking-widest backdrop-blur"
        style={panelStyle}
      >
        <p style={{ color: "#ff4d1a" }}>Arm Lab</p>

        {(
          [
            ["Dark", dark, setDark],
            ["Creases", showEdges, setShowEdges],
            ["Silhouette", showOutlines, setShowOutlines],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="flex cursor-pointer items-center justify-between">
            <span>{label}</span>
            <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
          </label>
        ))}

        <Slider
          label="Crease w"
          value={lineWidth}
          min={0.4}
          max={4}
          step={0.1}
          onChange={setLineWidth}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="Outline w"
          value={outlineWidth}
          min={0}
          max={9}
          step={0.5}
          onChange={setOutlineWidth}
          format={(v) => v.toFixed(1)}
        />

        <p className="normal-case tracking-normal opacity-60">
          {mode === "scroll"
            ? "Drag to orbit, right-drag to pan. The wheel drives the arm."
            : "Drag to orbit, scroll to zoom, right-drag to pan."}
        </p>
      </div>

      <div
        className="fixed right-6 top-6 w-64 space-y-3 rounded-lg border p-4 font-jetbrains text-[0.6875rem] uppercase tracking-widest backdrop-blur"
        style={panelStyle}
      >
        <p style={{ color: "#ff4d1a" }}>Drive</p>

        <div className="flex gap-1">
          {(["idle", "scroll", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="flex-1 rounded border px-1 py-1 uppercase tracking-widest"
              style={{
                borderColor: mode === m ? "#ff4d1a" : panelStyle.borderColor,
                color: mode === m ? "#ff4d1a" : "inherit",
              }}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div
          style={{
            opacity: mode === "manual" ? 1 : 0.35,
            pointerEvents: mode === "manual" ? "auto" : "none",
          }}
        >
          {JOINT_ORDER.map((key) => {
            const [lo, hi] = travelOf(key);
            return (
              <Slider
                key={key}
                label={JOINT_LABEL[key]}
                value={manual[key]}
                min={lo}
                max={hi}
                step={0.005}
                onChange={(v) => setJoint(key, v)}
                format={(v) => `${(v * DEG).toFixed(0)}°`}
              />
            );
          })}

          <Slider
            label="Grip"
            value={manual.grip}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setJoint("grip", v)}
            format={(v) => `${(v * 100).toFixed(0)}%`}
          />

          <button
            type="button"
            className="mt-3 w-full rounded border px-2 py-1 uppercase tracking-widest"
            style={{ borderColor: panelStyle.borderColor }}
            onClick={() => setManual(createArmPose())}
          >
            Reset
          </button>
        </div>

        {/* Sliders span the real actuator travel, so any pose reachable here is
            one the hardware would accept. Whether it is a pose the hardware
            would survive is a different question, and the only honest answer is
            to measure the geometry, which is what this reads out. */}
        <div
          className="mt-1 flex items-center justify-between border-t pt-3"
          style={{ borderColor: panelStyle.borderColor }}
        >
          <span>Clearance</span>
          <span style={{ color: clearance && clearance.gap <= 0 ? "#e5484d" : "#ff4d1a" }}>
            {clearance ? `${(clearance.gap / MM).toFixed(0)} mm` : "..."}
          </span>
        </div>
        <p className="normal-case tracking-normal opacity-60">
          {clearance?.where
            ? clearance.gap <= 0
              ? `Links intersect: ${clearance.where}.`
              : `Closest pair: ${clearance.where}.`
            : "Closest approach between links that should never touch."}
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  accent = "#ff4d1a",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  accent?: string;
}) {
  return (
    <label className="mt-3 block space-y-1">
      <span className="flex justify-between">
        <span>{label}</span>
        <span style={{ color: accent }}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
