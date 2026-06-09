"use client";

import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center border border-divider bg-surface p-20">
      <span className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
        Loading resume...
      </span>
    </div>
  ),
});

export default PdfViewer;
