"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// PanelInScene portals its children into the host <div> created by
// RobotArmCanvas and registered as a CSS3DObject in the WebGL scene.
// The host div carries the real "Featured Projects → CTA" content that
// CSS3DRenderer positions in 3D space so the arm can pinch around it.
export default function PanelInScene({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // The host might not exist on first render (RobotArmCanvas creates it).
    // Poll briefly until it appears.
    let cancelled = false;
    const tryFind = () => {
      if (cancelled) return;
      const el = document.getElementById("css3d-panel-host");
      if (el) setHost(el);
      else requestAnimationFrame(tryFind);
    };
    tryFind();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
