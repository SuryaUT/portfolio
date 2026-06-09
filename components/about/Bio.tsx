import Image from "next/image";
import { SITE } from "@/lib/site-config";

export default function Bio() {
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square w-full max-w-[280px] overflow-hidden border border-divider bg-surface">
          <Image
            src="/headshot.jpg"
            alt={SITE.name}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="space-y-1">
          <p className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink">
            {SITE.name}
          </p>
          <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
            {SITE.tagline}
          </p>
          <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
            {SITE.location}
          </p>
          <a
            href={`mailto:${SITE.email}`}
            className="block font-jetbrains text-[0.625rem] uppercase tracking-widest text-accent hover:underline"
          >
            {SITE.email}
          </a>
        </div>
      </div>

      <div className="space-y-6 text-ink-muted leading-relaxed">
        <p>
          I&apos;m a sophomore at UT Austin pursuing a B.S. in Electrical and
          Computer Engineering Honors and a B.B.A. in the Canfield Business
          Honors Program (GPA: 3.96, expected May 2028).
        </p>
        <p>
          My work spans the full stack of autonomous systems, from bare-metal
          RTOS kernels and custom PCB design to ROS 2 motion planning and
          on-device TinyML inference. I&apos;m currently an undergraduate researcher
          at the Autonomous Mobile Robotics Laboratory, building a
          perception-driven motion planning pipeline for a 7-DOF Kinova mobile
          manipulator in Isaac Sim.
        </p>
        <p>
          I&apos;m actively looking for fall 2026 through summer 2027 internships
          and research collaborations in robotics and autonomous systems.
        </p>
      </div>
    </div>
  );
}
