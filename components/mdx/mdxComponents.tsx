import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import YouTube from "./YouTube";
import { SectionH2, Cards, Card, Gallery, Figure } from "./ProseSections";

// Custom components available inside all project/research MDX content.
// `h2` restyles every `## Heading` as the orange-dash section header.
// Add new MDX-callable components here to expose them site-wide.
export const mdxComponents: MDXRemoteProps["components"] = {
  h2: SectionH2,
  Cards,
  Card,
  Gallery,
  Figure,
  YouTube,
};
