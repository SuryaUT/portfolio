import type { Metadata } from "next";
import { SITE } from "@/lib/site-config";

export function pageMeta(opts: {
  title?: string;
  description?: string;
}): Metadata {
  const title = opts.title ?? SITE.ogTitle;
  const description = opts.description ?? SITE.ogDescription;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: SITE.name },
    twitter: { card: "summary_large_image", title, description },
  };
}
