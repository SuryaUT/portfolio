"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Code2 } from "lucide-react";
import type { Research } from "@/types/content";

interface Props {
  item: Research;
}

function formatRange(start: string, end: string) {
  const [sy] = start.split("-");
  if (end.toLowerCase() === "ongoing") return `${sy} -Ongoing`;
  const [ey] = end.split("-");
  return sy === ey ? sy : `${sy} -${ey}`;
}

export default function PublicationItem({ item }: Props) {
  const [copied, setCopied] = useState(false);
  const [showBibtex, setShowBibtex] = useState(false);

  async function copyBibtex() {
    if (!item.bibtex) return;
    await navigator.clipboard.writeText(item.bibtex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-b border-divider pb-8 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold text-ink leading-snug">{item.title}</p>
          <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-accent">
            {item.lab}
          </p>
          {item.advisor && (
            <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
              Advisor: {item.advisor}
            </p>
          )}
        </div>
        <p className="shrink-0 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          {formatRange(item.start, item.end)}
        </p>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        {item.abstract}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {item.paper && (
          <a
            href={item.paper}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted hover:text-ink"
          >
            <ExternalLink size={12} />
            Paper
          </a>
        )}
        {item.code && (
          <a
            href={item.code}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted hover:text-ink"
          >
            <Code2 size={12} />
            Code
          </a>
        )}
        {item.bibtex && (
          <>
            <button
              onClick={() => setShowBibtex(!showBibtex)}
              className="inline-flex items-center gap-1.5 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted hover:text-ink"
            >
              <Code2 size={12} />
              BibTeX
            </button>
            {showBibtex && (
              <div className="relative w-full mt-2">
                <pre className="overflow-x-auto bg-bg border border-divider p-4 font-mono text-xs text-ink-muted">
                  {item.bibtex}
                </pre>
                <button
                  onClick={copyBibtex}
                  className="absolute right-3 top-3 text-ink-muted hover:text-ink"
                  aria-label="Copy BibTeX"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
