import HeroCopy from "@/components/hero/HeroCopy";
import SectionHeader from "@/components/sections/SectionHeader";
import TelemetryStrip from "@/components/sections/TelemetryStrip";
import Reveal from "@/components/motion/Reveal";
import ScrollToHash from "@/components/motion/ScrollToHash";
import Bio from "@/components/about/Bio";
import Skills from "@/components/about/Skills";
import Coursework from "@/components/about/Coursework";
import SocialLinks from "@/components/about/SocialLinks";
import WorkList from "@/components/sections/WorkList";
import ProjectsList from "@/components/sections/ProjectsList";
import ContactForm from "@/components/contact/ContactForm";
import { LinkButton } from "@/components/ui/Button";
import { FileText } from "lucide-react";
import { SITE } from "@/lib/site-config";

// Each section carries an id + scroll-mt so the nav can smooth-scroll to it
// while clearing the 57px fixed header.
const sectionClass = "scroll-mt-[72px]";

export default function Home() {
  return (
    <main>
      <ScrollToHash />
      <TelemetryStrip className="" />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        id="top"
        className="content-grid flex min-h-[calc(100vh-57px)] items-center py-24"
      >
        <HeroCopy />
      </section>

      <div className="content-grid pb-24 pt-8">
        {/* ── About ──────────────────────────────────────────────── */}
        <section id="about" className={sectionClass}>
          <Reveal>
            <SectionHeader index="01" title="About" kicker="Profile" />
            <Bio />
          </Reveal>
        </section>

        {/* ── Skills ─────────────────────────────────────────────── */}
        <section id="skills" className={`${sectionClass} mt-32`}>
          <Reveal>
            <SectionHeader
              index="02"
              title="Skills"
              kicker="Toolkit"
              description="The languages, platforms, and tools I build with."
            />
          </Reveal>
          <Reveal>
            <Skills />
          </Reveal>
        </section>

        {/* ── Work ───────────────────────────────────────────────── */}
        <section id="work" className={`${sectionClass} mt-32`}>
          <Reveal>
            <SectionHeader
              index="03"
              title="Experience"
              kicker="Timeline"
              description="Research positions, teaching, and student organizations."
            />
          </Reveal>
          <WorkList />
        </section>

        {/* ── Projects ───────────────────────────────────────────── */}
        <section id="projects" className={`${sectionClass} mt-32`}>
          <Reveal>
            <SectionHeader
              index="04"
              title="Projects"
              kicker="Selected Work"
              description="Autonomous systems, perception, locomotion, and embedded control."
            />
          </Reveal>
          <ProjectsList />
        </section>

        {/* ── Coursework ─────────────────────────────────────────── */}
        <section id="coursework" className={`${sectionClass} mt-32`}>
          <Reveal>
            <SectionHeader
              index="05"
              title="Coursework"
              kicker="Academics"
              description="Selected classes across ECE and the Canfield Business Honors Program."
            />
          </Reveal>
          <Reveal>
            <Coursework />
          </Reveal>
        </section>

        {/* ── Contact ────────────────────────────────────────────── */}
        <section id="contact" className={`${sectionClass} mt-32`}>
          <Reveal>
            <SectionHeader index="06" title="Contact" kicker="Get in Touch" />
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_420px]">
              <div>
                <h2 className="mb-3 text-3xl font-semibold text-ink">
                  Let&apos;s build something.
                </h2>
                <p className="mb-8 max-w-md leading-relaxed text-ink-muted">
                  I&apos;m actively looking for fall 2026 through summer 2027 robotics
                  internships and research collaborations. If you&apos;re working on
                  autonomous systems, manipulation, or mobile robotics, I&apos;d love
                  to chat.
                </p>
                <div className="mb-8 space-y-2">
                  <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
                    Email
                  </p>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-ink transition-colors hover:text-accent"
                  >
                    {SITE.email}
                  </a>
                </div>
                <SocialLinks />
                <div className="mt-8">
                  <LinkButton href={SITE.resumeUrl} variant="outline" size="sm" external>
                    <FileText size={13} />
                    Download Resume
                  </LinkButton>
                </div>
              </div>

              <div>
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </main>
  );
}
