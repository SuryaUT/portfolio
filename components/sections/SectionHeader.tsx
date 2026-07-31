interface SectionHeaderProps {
  index: string;
  title: string;
  description?: string;
  /** Small label shown after the index in the eyebrow (defaults to the title). */
  kicker?: string;
}

export default function SectionHeader({
  index,
  title,
  description,
  kicker,
}: SectionHeaderProps) {
  return (
    <div className="mb-14">
      {/* Designation eyebrow, the "spec label" */}
      <p className="mb-5 font-jetbrains text-[0.6875rem] uppercase tracking-[0.25em]">
        <span className="text-accent">{index}</span>
        <span className="text-divider"> / </span>
        <span className="text-ink-muted">{kicker ?? title}</span>
      </p>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-5xl font-bold uppercase leading-[0.9] tracking-tight text-ink sm:text-6xl lg:text-7xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-sm text-base leading-relaxed text-ink-muted lg:pb-2 lg:text-right">
            {description}
          </p>
        )}
      </div>

      <div className="mt-8 h-px w-full bg-divider" />
    </div>
  );
}
