import type { Metadata } from "next";
import SectionHeader from "@/components/sections/SectionHeader";
import FadeIn from "@/components/motion/FadeIn";
import PublicationItem from "@/components/research/PublicationItem";
import { getResearch } from "@/lib/content";

export const metadata: Metadata = {
  title: "Publications",
  description: "Academic publications and research work.",
};

export default function ResearchPage() {
  const research = getResearch();

  return (
    <main className="content-grid py-20">
      <FadeIn className="w-full">
        <SectionHeader
          index="00"
          title="Publications"
          description="Academic publications and ongoing research projects."
        />
        <div className="space-y-12">
          {research.length === 0 ? (
            <p className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
              No research entries yet.
            </p>
          ) : (
            research.map((item) => (
              <PublicationItem key={item.slug} item={item} />
            ))
          )}
        </div>
      </FadeIn>
    </main>
  );
}
