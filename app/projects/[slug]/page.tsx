import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import Image from "next/image";
import SectionHeader from "@/components/sections/SectionHeader";
import Tag from "@/components/ui/Tag";
import { LinkButton } from "@/components/ui/Button";
import { GitHubIcon } from "@/components/icons/BrandIcons";
import { getProjects, getProject } from "@/lib/content";
import { ExternalLink, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return { title: project.title, description: project.tagline };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <main className="content-grid max-w-3xl py-20">
      <LinkButton href="/projects" variant="ghost" size="sm" className="mb-8">
        <ArrowLeft size={12} />
        Back to Projects
      </LinkButton>

      <SectionHeader index="PRJ" title="Project" />

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-ink">
        {project.title}
      </h1>
      <p className="mb-6 text-lg text-ink-muted">{project.tagline}</p>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {project.tech.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
        {project.hardware.map((h) => (
          <Tag key={h} className="border-accent/30 text-accent">
            {h}
          </Tag>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {project.github && (
          <LinkButton href={project.github} variant="outline" size="sm" external>
            <GitHubIcon size={12} />
            GitHub
          </LinkButton>
        )}
        {project.demo && (
          <LinkButton href={project.demo} variant="primary" size="sm" external>
            <ExternalLink size={12} />
            Live Demo
          </LinkButton>
        )}
      </div>

      {project.cover && (
        <div className="relative mb-10 aspect-video w-full overflow-hidden border border-divider bg-bg">
          <Image
            src={project.cover}
            alt={project.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <article className="prose prose-neutral max-w-none text-ink-muted [&_h2]:text-ink [&_h3]:text-ink [&_strong]:text-ink">
        <MDXRemote source={project.content} />
      </article>
    </main>
  );
}
