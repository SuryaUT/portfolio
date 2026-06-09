interface TagProps {
  children: React.ReactNode;
  className?: string;
}

export default function Tag({ children, className = "" }: TagProps) {
  return (
    <span
      className={`inline-block border border-divider bg-surface px-2 py-0.5 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted ${className}`}
    >
      {children}
    </span>
  );
}
