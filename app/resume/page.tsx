import type { Metadata } from "next";
import SectionHeader from "@/components/sections/SectionHeader";
import FadeIn from "@/components/motion/FadeIn";
import PdfViewer from "@/components/resume/PdfViewerWrapper";

export const metadata: Metadata = {
  title: "Resume",
  description: "Download or view resume.",
};

export default function ResumePage() {
  return (
    <main className="py-16">
      <div className="content-grid mb-10">
        <FadeIn>
          <SectionHeader
            index="00"
            title="Resume"
            description="View inline or download the PDF."
          />
        </FadeIn>
      </div>

      <FadeIn>
        <div className="mx-auto w-full max-w-5xl px-6">
          <PdfViewer />
        </div>
      </FadeIn>
    </main>
  );
}
