import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import Tag from "@/components/ui/Tag";
import { LinkButton } from "@/components/ui/Button";
import { getExperience, getExperienceEntry } from "@/lib/content";
import { mdxComponents } from "@/components/mdx/mdxComponents";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getExperience().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = getExperienceEntry(slug);
  if (!e) return {};
  return { title: `${e.role} · ${e.company}`, description: e.role };
}

function formatDate(d: string) {
  if (!d || d === "Ongoing" || d === "Present") return d;
  const [year, month] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

export default async function ExperienceEntryPage({ params }: Props) {
  const { slug } = await params;
  const e = getExperienceEntry(slug);
  if (!e) notFound();

  const timeline = `${formatDate(e.start)} - ${e.end ? formatDate(e.end) : "Present"}`;

  return (
    <main className="content-grid max-w-3xl py-20">
      <LinkButton href="/#work" variant="ghost" size="sm" className="mb-8">
        <ArrowLeft size={12} />
        Back to Experience
      </LinkButton>

      <p className="mb-3 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-accent">
        {e.company}
      </p>

      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">
        {e.role}
      </h1>

      <div className="mb-6 flex flex-wrap gap-2">
        <Tag>{timeline}</Tag>
        <Tag>{e.location}</Tag>
      </div>

      {e.tech.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-1.5">
          {e.tech.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      <article className="prose prose-neutral max-w-none text-ink-muted [&_h2]:text-ink [&_h3]:text-ink [&_li]:marker:text-accent [&_strong]:text-ink">
        <MDXRemote source={e.content} components={mdxComponents} />
      </article>
    </main>
  );
}
