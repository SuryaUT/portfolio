import TimelineRow from "@/components/timeline/TimelineRow";
import Reveal from "@/components/motion/Reveal";
import { getProjects } from "@/lib/content";

function formatDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

function firstParagraph(content: string) {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && !t.startsWith("-") && !t.startsWith("*") && !t.startsWith("`") && !t.startsWith("<")) {
      return t;
    }
  }
  return "";
}

export default function ProjectsList() {
  const projects = getProjects().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div>
      {projects.map((p, i) => (
        <Reveal key={p.slug}>
          <TimelineRow
            kind="project"
            title={p.title}
            date={p.end ? `${formatDate(p.date)} - ${formatDate(p.end)}` : `${formatDate(p.date)} - Present`}
            description={firstParagraph(p.content) || p.tagline}
            tags={p.tech}
            href={`/projects/${p.slug}`}
            isLast={i === projects.length - 1}
          />
        </Reveal>
      ))}
    </div>
  );
}
