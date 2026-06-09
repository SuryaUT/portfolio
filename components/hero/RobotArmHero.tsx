"use client";

import dynamic from "next/dynamic";

const RobotArmCanvas = dynamic(() => import("./RobotArmCanvas"), {
  ssr: false,
  loading: () => <ArmFallback />,
});

function ArmFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 200 320"
        className="h-auto w-48 opacity-20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <ellipse cx="100" cy="290" rx="50" ry="12" />
        <rect x="88" y="230" width="24" height="60" />
        <rect
          x="94"
          y="130"
          width="18"
          height="100"
          transform="rotate(-15 103 230)"
        />
        <rect
          x="94"
          y="50"
          width="14"
          height="80"
          transform="rotate(20 103 130)"
        />
        <line x1="90" y1="40" x2="80" y2="20" />
        <line x1="110" y1="40" x2="120" y2="20" />
      </svg>
    </div>
  );
}

// Canvas is fixed-position full-viewport; no container sizing needed
export default function RobotArmHero() {
  return <RobotArmCanvas />;
}
