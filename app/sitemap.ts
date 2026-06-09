import { MetadataRoute } from "next";
import { getProjects, getResearch } from "@/lib/content";
import { SITE } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.baseUrl;

  const projectUrls = getProjects().map((p) => ({
    url: `${base}/projects/${p.slug}`,
    lastModified: new Date(p.date),
  }));

  const researchUrls = getResearch().map((r) => ({
    url: `${base}/research/${r.slug}`,
    lastModified: new Date(),
  }));

  return [
    { url: base },
    { url: `${base}/about` },
    { url: `${base}/experience` },
    { url: `${base}/projects` },
    { url: `${base}/research` },
    { url: `${base}/resume` },
    { url: `${base}/contact` },
    ...projectUrls,
    ...researchUrls,
  ];
}
