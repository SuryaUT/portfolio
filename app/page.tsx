import HeroCopy from "@/components/hero/HeroCopy";
import SectionHeader from "@/components/sections/SectionHeader";
import TelemetryStrip from "@/components/sections/TelemetryStrip";
import FadeIn from "@/components/motion/FadeIn";
import FeaturedWorkCard from "@/components/home/FeaturedWorkCard";
import Bio from "@/components/about/Bio";
import Skills from "@/components/about/Skills";
import SocialLinks from "@/components/about/SocialLinks";
import { LinkButton } from "@/components/ui/Button";
import { getProjects, getExperience } from "@/lib/content";
import { ArrowRight, FileText } from "lucide-react";
import { SITE } from "@/lib/site-config";

export default function Home() {
  const featuredProjects = getProjects().filter((p) => p.featured);
  const featuredExperience = getExperience().filter((e) => e.featured);

  const featuredWork = [
    ...featuredExperience.map((e) => ({ kind: "experience" as const, data: e, order: e.order })),
    ...featuredProjects.map((p) => ({ kind: "project" as const, data: p, order: p.order })),
  ].sort((a, b) => a.order - b.order);

  return (
    <main>
      <TelemetryStrip className="" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="content-grid flex min-h-[calc(100vh-57px)] items-center py-24">
        <HeroCopy />
      </section>

      <div className="content-grid pt-20">
        {/* ── About ──────────────────────────────────────────────── */}
        <FadeIn>
          <section id="about">
            <SectionHeader index="01" title="About" />
            <Bio />
          </section>
        </FadeIn>

        {/* ── Featured Work ──────────────────────────────────────── */}
        <FadeIn delay={0.1} className="mt-20">
          <SectionHeader index="02" title="Featured Work" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredWork.map((item) => (
              <FeaturedWorkCard
                key={item.kind === "project" ? item.data.slug : item.data.company}
                item={item}
              />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/projects" variant="outline" size="sm">
              All Projects
              <ArrowRight size={12} />
            </LinkButton>
            <LinkButton href="/experience" variant="outline" size="sm">
              All Work
              <ArrowRight size={12} />
            </LinkButton>
          </div>
        </FadeIn>

        {/* ── Skills ─────────────────────────────────────────────── */}
        <FadeIn delay={0.1} className="mt-20">
          <SectionHeader index="03" title="Skills & Tools" />
          <Skills />
        </FadeIn>

        {/* ── Find Me Online ─────────────────────────────────────── */}
        <FadeIn delay={0.15} className="mt-20">
          <SectionHeader index="04" title="Find Me Online" />
          <SocialLinks />
        </FadeIn>

        <FadeIn delay={0.2} className="mt-10">
          <LinkButton href={SITE.resumeUrl} variant="primary" external>
            <FileText size={13} />
            Download Resume
          </LinkButton>
        </FadeIn>

        {/* ── Footer CTA ─────────────────────────────────────────── */}
        <FadeIn className="my-24 border border-divider bg-surface p-10 text-center">
          <p className="mb-3 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
            Open to Opportunities
          </p>
          <h2 className="mb-2 text-2xl font-semibold text-ink">
            Looking for a robotics intern or collaborator?
          </h2>
          <p className="mx-auto mb-6 max-w-md text-ink-muted">
            I&apos;m actively looking for fall 2026 through summer 2027 internships
            and research collaborations in robotics and autonomous systems.
          </p>
          <LinkButton href="/contact" variant="primary" size="md">
            Get in Touch
            <ArrowRight size={13} />
          </LinkButton>
        </FadeIn>
      </div>
    </main>
  );
}
