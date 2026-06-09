import ProjectCard from "./ProjectCard";
import type { Project } from "@/types/content";

interface Props {
  projects: Project[];
  large?: boolean;
}

export default function ProjectGrid({ projects, large = false }: Props) {
  if (projects.length === 0) {
    return (
      <p className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
        No projects yet.
      </p>
    );
  }

  return (
    <div
      className={`grid gap-5 ${
        large
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {projects.map((p) => (
        <ProjectCard key={p.slug} project={p} large={large} />
      ))}
    </div>
  );
}
