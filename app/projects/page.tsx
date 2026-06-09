import type { Metadata } from "next";
import SectionHeader from "@/components/sections/SectionHeader";
import FadeIn from "@/components/motion/FadeIn";
import TimelineRow from "@/components/timeline/TimelineRow";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description: "Robotics engineering projects — autonomous systems, perception, and control.",
};

function formatDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

// Extracts the first non-empty prose line (skips headings, bullets, code fences)
function firstParagraph(content: string) {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && !t.startsWith("-") && !t.startsWith("*") && !t.startsWith("`")) {
      return t;
    }
  }
  return "";
}

export default function ProjectsPage() {
  const projects = getProjects().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <main className="content-grid py-20">
      <FadeIn>
        <SectionHeader
          index="00"
          title="Projects"
          description="Autonomous systems, perception, locomotion, and embedded control."
        />
        <div>
          {projects.map((p, i) => (
            <TimelineRow
              key={p.slug}
              kind="project"
              title={p.title}
              date={p.end ? `${formatDate(p.date)} - ${formatDate(p.end)}` : `${formatDate(p.date)} - Present`}
              description={firstParagraph(p.content) || p.tagline}
              tags={p.tech}
              href={`/projects/${p.slug}`}
              isLast={i === projects.length - 1}
            />
          ))}
        </div>
      </FadeIn>
    </main>
  );
}
