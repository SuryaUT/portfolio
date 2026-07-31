import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";
import SectionHeader from "@/components/sections/SectionHeader";
import Tag from "@/components/ui/Tag";
import { LinkButton } from "@/components/ui/Button";
import { getResearch, getResearchEntry } from "@/lib/content";
import { mdxComponents } from "@/components/mdx/mdxComponents";
import { ExternalLink, Code2, ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getResearch().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getResearchEntry(slug);
  if (!item) return {};
  return { title: item.title, description: item.abstract };
}

export default async function ResearchEntryPage({ params }: Props) {
  const { slug } = await params;
  const item = getResearchEntry(slug);
  if (!item) notFound();

  return (
    <main className="content-grid max-w-3xl py-20">
      <LinkButton href="/#work" variant="ghost" size="sm" className="mb-8">
        <ArrowLeft size={12} />
        Back to Experience
      </LinkButton>

      <SectionHeader index="RES" title={item.lab} />

      <h1 className="text-3xl font-semibold tracking-tight text-ink mb-2">
        {item.title}
      </h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {item.advisor && (
          <Tag>Advisor: {item.advisor}</Tag>
        )}
        <Tag>
          {item.start} - {item.end}
        </Tag>
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        {item.paper && (
          <LinkButton href={item.paper} variant="outline" size="sm" external>
            <ExternalLink size={12} />
            Paper
          </LinkButton>
        )}
        {item.code && (
          <LinkButton href={item.code} variant="outline" size="sm" external>
            <Code2 size={12} />
            Code
          </LinkButton>
        )}
      </div>

      <article className="prose prose-neutral max-w-none text-ink-muted [&_h2]:text-ink [&_h3]:text-ink [&_strong]:text-ink">
        <MDXRemote source={item.content} components={mdxComponents} />
      </article>
    </main>
  );
}
