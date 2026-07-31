import type { ReactNode } from "react";

/**
 * Styled building blocks made available inside project/research MDX.
 * Section headings (`## ...`) auto-render as the orange-bar section-title style;
 * <Cards>/<Card> build the "What I Did" grid, and <Gallery>/<Figure> the images.
 */

// Every `##` in MDX renders through this: the orange-bar section header.
export function SectionH2({ children }: { children?: ReactNode }) {
  return (
    <h2 className="not-prose mt-16 mb-6 flex items-center gap-3 text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">
      <span className="inline-block h-[3px] w-7 shrink-0 bg-accent" />
      <span>{children}</span>
    </h2>
  );
}

export function Cards({ children }: { children?: ReactNode }) {
  return (
    <div className="not-prose my-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

export function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`border bg-surface p-6 ${accent ? "border-accent" : "border-divider"}`}
    >
      <h3 className="mb-2 font-semibold text-ink">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted [&_code]:rounded [&_code]:bg-bg [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink">
        {children}
      </div>
    </div>
  );
}

/**
 * Collage-style masonry gallery. Uses CSS multi-columns so images render at their
 * natural aspect ratio (never cropped) and each figure's caption sizes to its own
 * content instead of stretching to fill a grid row. Mark one <Figure wide> to make
 * it span the full width and give the collage some rhythm.
 */
export function Gallery({ children }: { children?: ReactNode }) {
  return (
    <div className="not-prose my-8 sm:columns-2 sm:gap-3">
      {children}
    </div>
  );
}

export function Figure({
  src,
  caption,
  alt,
  wide,
}: {
  src: string;
  caption?: string;
  alt?: string;
  wide?: boolean;
}) {
  return (
    <figure
      className={`mb-3 flex break-inside-avoid flex-col overflow-hidden border border-divider bg-surface ${
        wide ? "sm:[column-span:all]" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? caption ?? ""}
        loading="lazy"
        className="h-auto w-full"
      />
      {caption && (
        <figcaption className="border-t border-divider px-4 py-2.5 text-[0.8125rem] leading-snug text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
