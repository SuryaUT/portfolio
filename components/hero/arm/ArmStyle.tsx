"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { Line, Outlines } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import {
  ARM_LIGHT,
  RAMP_STOPS,
  makeToonRamp,
  type ArmPalette,
} from "@/lib/arm-style";

interface ArmStyleValue {
  palette: ArmPalette;
  ramp: THREE.DataTexture;
  lineWidth: number;
  showEdges: boolean;
  /** Silhouette hull width, in pixels. */
  outlineWidth: number;
  showOutlines: boolean;
}

const ArmStyleContext = createContext<ArmStyleValue | null>(null);

export function useArmStyle(): ArmStyleValue {
  const value = useContext(ArmStyleContext);
  if (!value) throw new Error("useArmStyle must be used inside <ArmStyleProvider>");
  return value;
}

interface ArmStyleProviderProps {
  palette?: ArmPalette;
  lineWidth?: number;
  showEdges?: boolean;
  outlineWidth?: number;
  showOutlines?: boolean;
  children: ReactNode;
}

export function ArmStyleProvider({
  palette = ARM_LIGHT,
  lineWidth = 1.4,
  showEdges = true,
  outlineWidth = 3,
  showOutlines = true,
  children,
}: ArmStyleProviderProps) {
  const ramp = useMemo(() => makeToonRamp(RAMP_STOPS), []);
  useEffect(() => () => ramp.dispose(), [ramp]);

  const value = useMemo(
    () => ({ palette, ramp, lineWidth, showEdges, outlineWidth, showOutlines }),
    [palette, ramp, lineWidth, showEdges, outlineWidth, showOutlines],
  );

  return <ArmStyleContext.Provider value={value}>{children}</ArmStyleContext.Provider>;
}

type ShellProps = Omit<ThreeElements["mesh"], "ref"> & {
  color?: string;
  ink?: string;
  /** EdgesGeometry crease angle. Lower reveals more interior lines. */
  threshold?: number;
  lineWidth?: number;
  edges?: boolean;
  outline?: boolean;
  outlineWidth?: number;
  children?: ReactNode;
};

/**
 * Crease lines of a geometry, as the flat point list <Line> wants.
 *
 * This is what drei's <Edges> does internally, lifted out on purpose. <Edges>
 * seeds its line with a placeholder segment from (0,0,0) to (1,0,0) and swaps
 * in the real edges from an effect, and it decides whether that swap is still
 * needed by comparing the PARENT MESH's geometry, not the line's own. So if the
 * line's geometry is ever rebuilt while the mesh's stays the same, the swap is
 * skipped as redundant and the placeholder is what gets drawn: one straight
 * segment, one local unit long, starting at the link's own origin. At this
 * arm's scale a local unit is 300 mm, which is longer than any real edge in the
 * whole model.
 *
 * Passing the points in directly means there is never a placeholder to leak.
 */
function useCreases(geometry: THREE.BufferGeometry | undefined, threshold: number) {
  return useMemo(() => {
    if (!geometry) return null;
    const edges = new THREE.EdgesGeometry(geometry, threshold);
    const source = edges.getAttribute("position").array;
    const points: Array<[number, number, number]> = [];
    for (let i = 0; i < source.length; i += 3) {
      points.push([source[i], source[i + 1], source[i + 2]]);
    }
    edges.dispose();
    return points.length ? points : null;
  }, [geometry, threshold]);
}

/**
 * One inked part: a flat toon-shaded fill, its interior crease lines, and its
 * silhouette.
 *
 * The two line mechanisms are not interchangeable and the arm needs both.
 * EdgesGeometry finds creases above a threshold, so it draws groove and seam
 * lines but never a silhouette. The inverted hull (<Outlines>) draws only the
 * silhouette. A smooth swelling link has no creases at all, so without the hull
 * it would render as an untouched blob.
 */
export function Shell({
  color,
  ink,
  threshold = 18,
  lineWidth,
  edges = true,
  outline = true,
  outlineWidth,
  children,
  ...mesh
}: ShellProps) {
  const style = useArmStyle();
  const lineColor = ink ?? style.palette.ink;
  const creases = useCreases(mesh.geometry as THREE.BufferGeometry | undefined, threshold);
  return (
    <mesh castShadow receiveShadow {...mesh}>
      {children}
      <meshToonMaterial
        color={color ?? style.palette.shell}
        gradientMap={style.ramp}
      />
      {edges && style.showEdges && creases && (
        <Line
          points={creases}
          segments
          color={lineColor}
          lineWidth={lineWidth ?? style.lineWidth}
          raycast={() => null}
        />
      )}
      {outline && style.showOutlines && (
        <Outlines
          color={lineColor}
          thickness={outlineWidth ?? style.outlineWidth}
          angle={Math.PI}
        />
      )}
    </mesh>
  );
}
