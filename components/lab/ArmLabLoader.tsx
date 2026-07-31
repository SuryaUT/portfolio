"use client";

import dynamic from "next/dynamic";

// ssr: false keeps the WebGL canvas out of the server render. It has to live in
// a client component, since Server Components disallow the flag.
const ArmLab = dynamic(() => import("./ArmLab"), {
  ssr: false,
  loading: () => <div className="fixed inset-0" style={{ background: "#e8e6e0" }} />,
});

export default function ArmLabLoader() {
  return <ArmLab />;
}
