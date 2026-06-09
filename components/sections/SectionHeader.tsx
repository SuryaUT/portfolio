interface SectionHeaderProps {
  index: string;
  title: string;
  description?: string;
}

export default function SectionHeader({
  index,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="mb-12">
      <div className="mb-3 flex items-center gap-3">
        <span className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-accent">
          {index}
        </span>
        <span className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-divider">
          /
        </span>
        <span className="font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
          {title}
        </span>
      </div>
      <div className="h-px bg-divider" />
      {description && (
        <p className="mt-4 max-w-2xl text-ink-muted">{description}</p>
      )}
    </div>
  );
}
