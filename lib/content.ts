import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";
import type { DemoLink, Project, Experience, Research } from "@/types/content";

const contentDir = path.join(process.cwd(), "content");

const ProjectSchema = z.object({
  title: z.string(),
  slug: z.string(),
  tagline: z.string(),
  date: z.string(),
  end: z.string().optional(),
  featured: z.boolean().default(false),
  cover: z.string().optional(),
  tech: z.array(z.string()).default([]),
  hardware: z.array(z.string()).default([]),
  github: z.string().optional(),
  /**
   * One demo link, or several labelled ones.
   *
   * A bare string is the common case and stays the shortest thing to write.
   * Projects with more than one demo worth linking give each a label, which
   * becomes the button text, since two buttons both reading "Live Demo" would
   * tell the reader nothing about which is which.
   */
  demo: z
    .union([z.string(), z.array(z.object({ label: z.string(), href: z.string() }))])
    .optional(),
  demoComingSoon: z.boolean().default(false),
  order: z.number().default(99),
  award: z.string().optional(),
  role: z.string().optional(),
  context: z.string().optional(),
  categories: z.array(z.string()).default([]),
});

const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  slug: z.string().optional(),
  start: z.string(),
  end: z.string().optional(),
  location: z.string(),
  logo: z.string().optional(),
  tech: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  order: z.number().default(99),
});

const ResearchSchema = z.object({
  title: z.string(),
  slug: z.string(),
  lab: z.string(),
  advisor: z.string().optional(),
  start: z.string(),
  end: z.string().default("Ongoing"),
  abstract: z.string(),
  tech: z.array(z.string()).default([]),
  paper: z.string().optional(),
  code: z.string().optional(),
  bibtex: z.string().optional(),
  order: z.number().default(99),
});

function readDir(subdir: string) {
  const dir = path.join(contentDir, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      return { data, content, fileSlug: f.replace(/\.mdx$/, "") };
    });
}

/**
 * Collapses the two shapes `demo` can take into the one the page renders.
 *
 * Normalising here rather than at the call site means the detail page never
 * has to know that a bare string is even allowed, and an empty string (which
 * several projects use as a placeholder for "no demo yet") drops out rather
 * than rendering a button that goes nowhere.
 */
function demoLinks(demo: z.infer<typeof ProjectSchema>["demo"]): DemoLink[] {
  if (!demo) return [];
  if (typeof demo === "string") {
    return demo ? [{ label: "Live Demo", href: demo }] : [];
  }
  return demo.filter((d) => d.href);
}

export function getProjects(): Project[] {
  return readDir("projects")
    .map(({ data, content }) => {
      const { demo, ...project } = ProjectSchema.parse(data);
      return { ...project, demos: demoLinks(demo), content };
    })
    .sort(
      (a, b) =>
        a.order - b.order ||
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function getExperience(): Experience[] {
  return readDir("experience")
    .map(({ data, content, fileSlug }) => {
      const parsed = ExperienceSchema.parse(data);
      return { ...parsed, slug: parsed.slug ?? fileSlug, content };
    })
    .sort((a, b) => a.order - b.order);
}

export function getResearch(): Research[] {
  return readDir("research")
    .map(({ data, content }) => ({
      ...ResearchSchema.parse(data),
      content,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getProject(slug: string): Project | undefined {
  return getProjects().find((p) => p.slug === slug);
}

export function getResearchEntry(slug: string): Research | undefined {
  return getResearch().find((r) => r.slug === slug);
}

export function getExperienceEntry(slug: string): Experience | undefined {
  return getExperience().find((e) => e.slug === slug);
}
