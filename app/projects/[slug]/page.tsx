import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import Image from "next/image";
import Tag from "@/components/ui/Tag";
import { LinkButton } from "@/components/ui/Button";
import Reveal from "@/components/motion/Reveal";
import { GitHubIcon } from "@/components/icons/BrandIcons";
import { getProjects, getProject } from "@/lib/content";
import { mdxComponents } from "@/components/mdx/mdxComponents";
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

function formatDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const timeline = project.end
    ? `${formatDate(project.date)} - ${formatDate(project.end)}`
    : `${formatDate(project.date)} - Present`;

  // Meta grid cells, only render the ones that have a value.
  const meta = [
    project.role && { label: "Role", value: project.role },
    { label: "Timeline", value: timeline },
    project.context && { label: "Context", value: project.context },
    project.tech.length > 0 && {
      label: "Stack",
      value: project.tech.slice(0, 4).join(" · "),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="content-grid py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <LinkButton href="/#projects" variant="ghost" size="sm" className="mb-10 -ml-4">
          <ArrowLeft size={12} />
          Selected Work
        </LinkButton>

        <Reveal>
          {/* Eyebrow: categories · award */}
          {(project.categories.length > 0 || project.award) && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-jetbrains text-[0.6875rem] uppercase tracking-widest">
              {project.categories.map((c) => (
                <span key={c} className="text-ink-muted">
                  {c}
                </span>
              ))}
              {project.award && (
                <span className="text-accent">🏆 {project.award}</span>
              )}
            </div>
          )}

          <h1 className="mb-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            {project.title}
          </h1>

          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
            {project.tagline}
          </p>

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

          <div className="flex flex-wrap gap-3">
            {project.github && (
              <LinkButton href={project.github} variant="outline" size="sm" external>
                <GitHubIcon size={12} />
                Code
              </LinkButton>
            )}
            {project.demos.map((demo) => (
              <LinkButton
                key={demo.href}
                href={demo.href}
                variant="primary"
                size="sm"
                external
              >
                <ExternalLink size={12} />
                {demo.label}
              </LinkButton>
            ))}
            {project.demos.length === 0 && project.demoComingSoon && (
              <span className="inline-flex cursor-default items-center gap-2 border border-divider bg-surface px-4 py-2 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
                Live Demo · Coming Soon
              </span>
            )}
          </div>

          {project.award && (
            <div className="mt-6 inline-flex items-center gap-2 border border-divider bg-surface px-4 py-2 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {project.award}
            </div>
          )}
        </Reveal>

        {project.cover && (
          <Reveal className="mt-10">
            <div className="relative aspect-video w-full overflow-hidden border border-divider bg-bg">
              <Image
                src={project.cover}
                alt={project.title}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          </Reveal>
        )}

        {/* Meta grid */}
        <Reveal className="mt-12">
          <dl className="grid grid-cols-2 border border-divider md:grid-cols-4">
            {meta.map((cell, i) => (
              <div
                key={cell.label}
                className={`p-5 ${i > 0 ? "border-divider max-md:odd:border-l md:border-l" : ""} ${
                  i >= 2 ? "border-t md:border-t-0" : ""
                }`}
              >
                <dt className="mb-2 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
                  {cell.label}
                </dt>
                <dd className="text-sm text-ink">{cell.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal>
          <article className="prose prose-neutral mt-8 max-w-none text-ink-muted [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:font-normal [&_code]:text-ink [&_code]:before:content-[''] [&_code]:after:content-[''] [&_h3]:text-ink [&_li]:marker:text-accent [&_strong]:text-ink">
            <MDXRemote source={project.content} components={mdxComponents} />
          </article>
        </Reveal>
      </div>
    </main>
  );
}
