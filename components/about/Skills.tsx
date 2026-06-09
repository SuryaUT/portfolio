import Tag from "@/components/ui/Tag";

const SKILLS = [
  {
    group: "Languages & Libraries",
    items: ["Python", "C", "C++", "ARM M0+ Assembly", "TensorFlow", "scikit-learn", "NumPy", "Pandas", "OpenCV"],
  },
  {
    group: "Systems & Platforms",
    items: ["ROS 2", "Isaac Sim", "cuRobo", "FreeRTOS", "Docker", "Linux", "Real-Time Systems"],
  },
  {
    group: "Tools",
    items: ["Git", "ESP-IDF", "KiCad", "Vivado", "Code Composer Studio", "Autodesk Fusion", "SPICE", "IdeaMaker"],
  },
];

export default function Skills() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {SKILLS.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-3 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
            {group}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
