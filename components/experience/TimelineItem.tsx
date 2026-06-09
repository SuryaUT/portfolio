import Tag from "@/components/ui/Tag";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Experience } from "@/types/content";

interface Props {
  item: Experience;
  isLast?: boolean;
}

function formatDate(d: string) {
  const [year, month] = d.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

export default function TimelineItem({ item, isLast = false }: Props) {
  return (
    <div className="relative grid grid-cols-1 gap-4 pb-12 md:grid-cols-[160px_1fr]">
      {!isLast && (
        <div className="absolute left-0 top-6 hidden h-full w-px bg-divider md:block" />
      )}

      <div className="shrink-0 pt-0.5">
        <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          {formatDate(item.start)} - {item.end ? formatDate(item.end) : "Present"}
        </p>
        <p className="mt-1 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          {item.location}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">{item.company}</p>
        <p className="mb-3 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-accent">
          {item.role}
        </p>

        <div className="mb-4 text-sm text-ink-muted [&_li]:list-disc [&_li]:leading-relaxed [&_ul]:space-y-1.5 [&_ul]:pl-4">
          <MDXRemote source={item.content} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.tech.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
}
