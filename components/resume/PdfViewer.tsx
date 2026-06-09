"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Download } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SITE } from "@/lib/site-config";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PdfViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setWidth(Math.floor(containerRef.current.getBoundingClientRect().width));
      }
    }

    // Measure once synchronously on mount — no ResizeObserver to avoid
    // the feedback loop where the PDF canvas changing height re-triggers a width update.
    measure();

    let timeout: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(timeout);
      timeout = setTimeout(measure, 150);
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          Last updated: {SITE.resumeLastUpdated}
        </p>
        <LinkButton href={SITE.resumeUrl} variant="primary" size="sm" external>
          <Download size={12} />
          Download PDF
        </LinkButton>
      </div>

      <div ref={containerRef} className="w-full border border-divider bg-surface">
        {loadError ? (
          <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
            <p className="text-sm text-ink-muted">
              Resume PDF not found. Drop{" "}
              <code className="font-mono text-xs text-ink">
                {SITE.resumeUrl.replace("/", "")}
              </code>{" "}
              into the{" "}
              <code className="font-mono text-xs text-ink">public/</code> folder.
            </p>
            <LinkButton href={SITE.resumeUrl} variant="primary" external>
              <Download size={14} />
              Download Resume
            </LinkButton>
          </div>
        ) : width ? (
          <Document
            file={SITE.resumeUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setLoadError(true)}
            loading={
              <div className="flex items-center justify-center p-20">
                <span className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
                  Loading...
                </span>
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i + 1}
                pageNumber={i + 1}
                width={width}
                renderTextLayer
                renderAnnotationLayer={false}
                className={i < numPages - 1 ? "border-b border-divider" : ""}
              />
            ))}
          </Document>
        ) : null}
      </div>
    </div>
  );
}
