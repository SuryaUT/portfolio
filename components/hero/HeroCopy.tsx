import { LinkButton } from "@/components/ui/Button";
import { SITE } from "@/lib/site-config";
import { ArrowRight, FileText } from "lucide-react";

export default function HeroCopy() {
  return (
    <div className="flex flex-col gap-6">
      <p className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-accent">
        01 / Robotics Engineer
      </p>

      <h1 className="text-6xl font-bold leading-[0.95] tracking-tight text-ink sm:text-7xl lg:text-8xl">
        {SITE.name}
      </h1>

      <p className="max-w-xl text-xl leading-relaxed text-ink-muted">
        {SITE.shortBio}
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <LinkButton href="/projects" variant="primary" size="lg">
          View Work
          <ArrowRight size={14} />
        </LinkButton>
        <LinkButton href="/resume" variant="outline" size="lg">
          <FileText size={14} />
          Resume
        </LinkButton>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px w-8 bg-divider" />
        <span className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          {SITE.tagline}
        </span>
      </div>
    </div>
  );
}
