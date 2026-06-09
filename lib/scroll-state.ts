// Shared mutable scroll state, read by the R3F useFrame loop and
// written by the Framer Motion scroll tracker. Lives outside React so
// we can read it from inside the Three.js render loop without re-rendering.
export const scrollState = {
  progress: 0,  // 0 = top of page, 1 = hero fully scrolled past
  panelY: -3.0, // world-space Y of the panel's top edge (derived from progress)
};
