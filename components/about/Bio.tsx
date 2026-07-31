import Image from "next/image";
import { SITE } from "@/lib/site-config";

export default function Bio() {
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-square w-full max-w-[280px] overflow-hidden border border-divider bg-surface">
          <Image
            src="/images/me/headshot-square.jpg"
            alt={SITE.name}
            fill
            sizes="280px"
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

      <div className="space-y-6 text-xl leading-relaxed text-ink/80 [&_strong]:font-semibold [&_strong]:text-ink">
        <p>
          I&apos;m a junior at <strong>UT Austin</strong> pursuing a B.S. in{" "}
          <strong>Electrical &amp; Computer Engineering Honors</strong> and a B.B.A. in
          the <strong>Canfield Business Honors Program</strong> (graduating May 2028).
        </p>
        <p>
          My work spans <strong>robotics</strong>, <strong>machine learning</strong>, and{" "}
          <strong>embedded systems</strong>, centered on robotic and vehicular
          autonomy. I also build wearable human-computer interfaces driven by{" "}
          <strong>surface electromyography (sEMG)</strong>.
        </p>
        <p>
          Recently I&apos;ve built <strong>GPU-accelerated reactive motion planning</strong>{" "}
          for a 7-DOF manipulator at UT&apos;s Autonomous Mobile Robotics Laboratory, an{" "}
          <strong>autonomous racecar</strong> running on a fully custom RTOS, and an{" "}
          <strong>sEMG-controlled prosthetic arm</strong>.
        </p>
        <p>
          I&apos;m always looking to learn, build, and take on hard technical problems.
          If that sounds like your kind of thing, feel free to{" "}
          <a href="#contact" className="text-accent hover:underline">
            contact me
          </a>
          !
        </p>
      </div>
    </div>
  );
}
