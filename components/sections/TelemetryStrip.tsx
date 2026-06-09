const ITEMS = [
  "LAT 30.286°N",
  "LON 97.736°W",
  "Austin, TX, USA",
  "Status: Building",
  "UT Austin · ECE",
  "Robotics + Autonomy",
  "Available Fall 2026",
  "ROS 2 · PyTorch · C++",
];

export default function TelemetryStrip({ className = "my-24" }: { className?: string }) {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className={`overflow-hidden border-y border-divider py-3 ${className}`}>
      <div className="animate-marquee flex whitespace-nowrap gap-12">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
