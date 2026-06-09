import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { GitHubIcon } from "@/components/icons/BrandIcons";
import Tag from "@/components/ui/Tag";
import type { Project } from "@/types/content";

interface Props {
  project: Project;
  large?: boolean;
}

export default function ProjectCard({ project, large = false }: Props) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block border border-divider bg-surface transition-shadow duration-200 hover:shadow-md"
    >
      {project.cover ? (
        <div
          className={`relative w-full overflow-hidden bg-bg ${large ? "h-56" : "h-44"}`}
        >
          <Image
            src={project.cover}
            alt={project.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center overflow-hidden bg-bg ${large ? "h-56" : "h-44"}`}
        >
          <span
            aria-hidden
            className="select-none font-jetbrains text-[4.5rem] font-bold leading-none tracking-tighter text-divider transition-transform duration-500 group-hover:scale-110"
          >
            PRJ
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink transition-colors group-hover:text-accent">
            {project.title}
          </h3>
          <ArrowUpRight
            size={14}
            className="mt-0.5 shrink-0 text-ink-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>

        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          {project.tagline}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.tech.slice(0, 4).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>

        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 inline-flex items-center gap-1.5 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted hover:text-ink"
          >
            <GitHubIcon size={12} />
            GitHub
          </a>
        )}
      </div>
    </Link>
  );
}
