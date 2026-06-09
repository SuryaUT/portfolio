import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Tag from "@/components/ui/Tag";

export interface TimelineRowProps {
  kind: "experience" | "research" | "project";
  title: string;
  subtitle?: string;
  date: string;
  location?: string;
  description: string;
  tags: string[];
  href?: string;
  isLast?: boolean;
}

const KIND_LABEL: Record<TimelineRowProps["kind"], string> = {
  experience: "Experience",
  research: "Research",
  project: "Project",
};

const KIND_ABBR: Record<TimelineRowProps["kind"], string> = {
  experience: "EXP",
  research: "RES",
  project: "PRJ",
};

export default function TimelineRow({
  kind,
  title,
  subtitle,
  date,
  location,
  description,
  tags,
  href,
  isLast = false,
}: TimelineRowProps) {
  const cardClass =
    "group flex flex-1 min-w-0 border border-divider bg-surface transition-all duration-200 hover:shadow-md hover:scale-[1.015] origin-left cursor-default";

  const inner = (
    <>
      {/* Square thumbnail */}
      <div className="hidden w-36 shrink-0 items-center justify-center border-r border-divider bg-bg sm:flex">
        <span
          aria-hidden
          className="select-none font-jetbrains text-3xl font-bold leading-none tracking-tighter text-divider transition-colors duration-200 group-hover:text-ink-muted/60"
        >
          {KIND_ABBR[kind]}
        </span>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-jetbrains text-[0.5625rem] uppercase tracking-widest text-accent">
              {KIND_LABEL[kind]}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-ink transition-colors group-hover:text-accent">
              {title}
            </h3>
            {subtitle && (
              <p className="font-jetbrains text-[0.5625rem] uppercase tracking-widest text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="font-jetbrains text-[0.5625rem] uppercase tracking-widest text-ink-muted whitespace-nowrap">
              {date}
            </p>
            {location && (
              <p className="font-jetbrains text-[0.5625rem] uppercase tracking-widest text-ink-muted">
                {location}
              </p>
            )}
            {href && (
              <ArrowUpRight
                size={13}
                className="ml-auto mt-1 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            )}
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {description}
        </p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="relative flex gap-5 pb-8">
      {/* Vertical timeline spine */}
      <div className="relative flex flex-col items-center pt-5">
        <div className="relative z-10 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-accent bg-bg" />
        {!isLast && <div className="mt-1 w-px flex-1 bg-divider" />}
      </div>

      {/* Card — linked or plain */}
      {href ? (
        <Link href={href} className={cardClass}>
          {inner}
        </Link>
      ) : (
        <div className={cardClass}>{inner}</div>
      )}
    </div>
  );
}
