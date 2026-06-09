"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import RobotArm from "./RobotArmModel";
import { scrollState } from "@/lib/scroll-state";

// Camera is on the page's normal axis (X=0, Y=0) so the CSS3D page renders
// perfectly head-on with no tilt. Distance + small FOV approximate an
// orthographic look.
const DEFAULT_CAM_POS: [number, number, number] = [0, 0, 12];
const DEFAULT_FOV = 20;

// World Z of the page plane (CSS3DObject + depth-mask). Fingers straddle:
//   front finger at PANEL_Z + 0.4 (drawn over page in WebGL)
//   back finger at PANEL_Z − 0.4 (depth-culled, page covers it)
export const PANEL_Z = 0;

// Horizontal offset for the arm so it sits in the right column area.
const ARM_X_OFFSET = 1.8;

// World Z of the arm's base (shoulder ~here). Negative = behind page.
const ARM_Z_OFFSET = -1.5;

// CSS3D-to-world unit conversion. Calibrated so the 1200px host fills the
// viewport width at the camera distance (FOV 20° @ Z=12 → ~7.5 world units
// horizontal; 1200 * 0.0075 = 9 ≈ slight overshoot for edge-to-edge feel).
const CSS3D_SCALE = 0.0069;

function CameraLock() {
  const { camera } = useThree();
  const defaultVec = useMemo(() => new THREE.Vector3(...DEFAULT_CAM_POS), []);
  const lookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (scrollState.progress < 0.02) return;
    camera.position.lerp(defaultVec, 0.1);
    camera.lookAt(lookAt);
  });

  return null;
}

// Invisible depth-only plane. Extends downward from the panel top edge,
// covering all the area "below" the panel in screen space.
// renderOrder=-1 forces it to render BEFORE any arm geometry — critical, so
// it establishes depth values in the buffer that arm fragments behind it
// (Z<0) will then fail the depth test against → transparent in canvas →
// CSS3D page shows through.
const DEPTH_MASK_HEIGHT = 40;
function DepthMaskPlane() {
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  useFrame(() => {
    if (mesh) {
      // Position so the plane's TOP edge sits exactly at panelY
      mesh.position.y = scrollState.panelY - DEPTH_MASK_HEIGHT / 2;
    }
  });

  return (
    <mesh
      ref={setMesh}
      position={[0, -DEPTH_MASK_HEIGHT / 2, PANEL_Z]}
      renderOrder={-1}
    >
      <planeGeometry args={[40, DEPTH_MASK_HEIGHT]} />
      <meshBasicMaterial colorWrite={false} depthWrite={true} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Mounts CSS3DRenderer alongside the WebGL renderer and wraps the
// #css3d-panel-host element as a CSS3DObject in the same scene.
// Both renderers share camera + scene, so depth across them aligns.
// Compute the panel's DOM pixel width so it fills exactly one viewport width
// in world space. Three.js PerspectiveCamera uses vertical FOV; horizontal
// visible width = 2 * tan(vFOV/2) * cameraZ * aspect.
function getPanelPxWidth() {
  const vFOVrad = (DEFAULT_FOV * Math.PI) / 180;
  const aspect = window.innerWidth / window.innerHeight;
  const worldWidth = 2 * Math.tan(vFOVrad / 2) * DEFAULT_CAM_POS[2] * aspect;
  return Math.floor(worldWidth / CSS3D_SCALE);
}

function CSS3DPanelObject({ rootEl }: { rootEl: HTMLDivElement | null }) {
  const { scene, camera, gl } = useThree();
  const rendererRef = useRef<CSS3DRenderer | null>(null);
  const objRef = useRef<CSS3DObject | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootEl) return;

    // The host element that PanelInScene portals content into.
    // Create it on demand if it doesn't exist (in case canvas mounts first).
    let host = document.getElementById("css3d-panel-host") as HTMLDivElement | null;
    if (!host) {
      host = document.createElement("div");
      host.id = "css3d-panel-host";
      document.body.appendChild(host);
    }
    hostRef.current = host;

    // Set initial styles via cssText once — before CSS3DRenderer takes ownership.
    // After this point we must never set cssText again; the renderer manages
    // element.style.transform and a full cssText reset would wipe it out.
    host.style.cssText = `
      width: ${getPanelPxWidth()}px;
      background: #fafaf7;
      box-shadow: 0 -24px 48px -16px rgba(0,0,0,0.18);
      border-top: 2px solid #111;
      box-sizing: border-box;
      pointer-events: auto;
    `;

    const renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "none";
    rootEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const obj = new CSS3DObject(host);
    obj.scale.set(CSS3D_SCALE, CSS3D_SCALE, CSS3D_SCALE);
    obj.position.set(0, scrollState.panelY, PANEL_Z);
    // Explicitly reset rotation so the page faces along world axes (not tilted)
    obj.rotation.set(0, 0, 0);
    scene.add(obj);
    objRef.current = obj;

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      // Only update width; never touch cssText after CSS3DRenderer has taken
      // ownership of the element — it manages element.style.transform directly.
      host!.style.width = `${getPanelPxWidth()}px`;
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      scene.remove(obj);
      if (renderer.domElement.parentNode === rootEl) {
        rootEl.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      objRef.current = null;
      hostRef.current = null;
    };
  }, [rootEl, scene]);

  useFrame(() => {
    if (objRef.current) {
      // Position so the TOP of the element is at world Y = panelY.
      // The element's height in world units = (DOM height) * CSS3D_SCALE.
      const halfH = (objRef.current.element.offsetHeight || 0) * CSS3D_SCALE * 0.5;
      objRef.current.position.set(-0.05, scrollState.panelY - halfH, PANEL_Z);
    }
    if (rendererRef.current) {
      rendererRef.current.render(scene, camera);
    }
  });

  return null;
}

export default function RobotArmCanvas() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [css3dRoot, setCss3dRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(document.body);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* CSS3DRenderer mounts inside here; behind WebGL canvas, but interactive */}
      <div
        ref={setCss3dRoot}
        className="pointer-events-auto absolute inset-0"
        style={{ zIndex: 1, overflow: "hidden" }}
      />

      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }}>
        <Canvas
          frameloop={visible ? "always" : "never"}
          camera={{ position: DEFAULT_CAM_POS, fov: DEFAULT_FOV }}
          dpr={[1, 2]}
          shadows
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent", width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight
              position={[-4, 6, 3]}
              intensity={1.8}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
            <directionalLight position={[4, 2, -2]} intensity={0.4} />

            <DepthMaskPlane />

            {/* Arm base sits BEHIND the page (Z<0) so it reaches forward to grab */}
            <group position={[ARM_X_OFFSET, 0, ARM_Z_OFFSET]}>
              <RobotArm animate={!reduced} />
            </group>

            <CSS3DPanelObject rootEl={css3dRoot} />
            <CameraLock />

            <ContactShadows
              position={[ARM_X_OFFSET, -1.22, ARM_Z_OFFSET]}
              opacity={0.25}
              scale={6}
              blur={2}
            />
            <Environment preset="studio" />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
