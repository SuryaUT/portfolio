import TimelineRow from "@/components/timeline/TimelineRow";
import Reveal from "@/components/motion/Reveal";
import { getExperience, getResearch } from "@/lib/content";
import type { Experience, Research } from "@/types/content";

function formatDate(d: string) {
  if (!d || d === "Ongoing" || d === "Present") return d;
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

function firstBullet(content: string) {
  const match = content.match(/^[-*]\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

type WorkItem =
  | { kind: "experience"; data: Experience }
  | { kind: "research"; data: Research };

export default function WorkList() {
  const experience = getExperience();
  const research = getResearch();

  const items: WorkItem[] = [
    ...experience.map((e) => ({ kind: "experience" as const, data: e })),
    ...research.map((r) => ({ kind: "research" as const, data: r })),
  ].sort((a, b) => {
    const dateDiff = b.data.start.localeCompare(a.data.start);
    if (dateDiff !== 0) return dateDiff;
    return a.data.order - b.data.order;
  });

  return (
    <div>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        if (item.kind === "experience") {
          const e = item.data;
          return (
            <Reveal key={`exp-${e.company}-${e.start}`}>
              <TimelineRow
                kind="experience"
                title={e.role}
                subtitle={e.company}
                date={`${formatDate(e.start)} - ${e.end ? formatDate(e.end) : "Present"}`}
                location={e.location}
                description={firstBullet(e.content)}
                tags={e.tech}
                href={`/experience/${e.slug}`}
                isLast={isLast}
              />
            </Reveal>
          );
        }

        const r = item.data;
        return (
          <Reveal key={`res-${r.slug}`}>
            <TimelineRow
              kind="research"
              title={r.title}
              subtitle={r.lab}
              date={`${formatDate(r.start)} - ${formatDate(r.end)}`}
              description={r.abstract}
              tags={r.tech}
              href={`/research/${r.slug}`}
              isLast={isLast}
            />
          </Reveal>
        );
      })}
    </div>
  );
}
