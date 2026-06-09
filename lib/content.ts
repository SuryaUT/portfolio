import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";
import type { Project, Experience, Research } from "@/types/content";

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
  demo: z.string().optional(),
  order: z.number().default(99),
});

const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
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
      return { data, content };
    });
}

export function getProjects(): Project[] {
  return readDir("projects")
    .map(({ data, content }) => ({
      ...ProjectSchema.parse(data),
      content,
    }))
    .sort(
      (a, b) =>
        a.order - b.order ||
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function getExperience(): Experience[] {
  return readDir("experience")
    .map(({ data, content }) => ({
      ...ExperienceSchema.parse(data),
      content,
    }))
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
