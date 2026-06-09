import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Tag from "@/components/ui/Tag";
import type { Project, Experience } from "@/types/content";

type FeaturedWorkItem =
  | { kind: "project"; data: Project }
  | { kind: "experience"; data: Experience };

function formatDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

export default function FeaturedWorkCard({ item }: { item: FeaturedWorkItem }) {
  const isProject = item.kind === "project";
  const href = isProject ? `/projects/${item.data.slug}` : "/experience";
  const title = isProject ? item.data.title : item.data.company;
  const subtitle = isProject ? item.data.tagline : item.data.role;
  const tech = item.data.tech.slice(0, 4);
  const label = isProject ? "Project" : "Research Position";
  const meta = !isProject
    ? `${formatDate(item.data.start)} - ${item.data.end ? formatDate(item.data.end) : "Present"}`
    : null;

  return (
    <Link
      href={href}
      className="group flex flex-col border border-divider bg-surface transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
    >
      {/* Thumbnail placeholder */}
      <div className="flex h-40 items-center justify-center overflow-hidden border-b border-divider bg-bg">
        <span
          aria-hidden
          className="select-none font-jetbrains text-[4.5rem] font-bold leading-none tracking-tighter text-divider transition-transform duration-500 group-hover:scale-110"
        >
          {isProject ? "PRJ" : "RES"}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-jetbrains text-[0.5625rem] uppercase tracking-widest text-accent">
          {label}
        </span>
        <ArrowUpRight
          size={14}
          className="text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>

      <h3 className="text-sm font-semibold text-ink transition-colors group-hover:text-accent">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{subtitle}</p>

      {meta && (
        <p className="mt-1 font-jetbrains text-[0.5625rem] uppercase tracking-widest text-ink-muted">
          {meta}
        </p>
      )}

      <div className="mt-auto pt-4 flex flex-wrap gap-1.5">
        {tech.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
      </div>
      </div>
    </Link>
  );
}
