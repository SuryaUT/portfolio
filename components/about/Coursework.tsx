import { COURSEWORK } from "@/lib/coursework";

export default function Coursework() {
  return (
    <div className="gap-x-12 sm:columns-2">
      {COURSEWORK.map(({ group, courses }) => (
        <div key={group} className="mb-8 break-inside-avoid">
          <p className="mb-4 font-jetbrains text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {group}
          </p>
          <ul className="border-t border-divider">
            {courses.map((c) => (
              <li
                key={c.code}
                className="flex items-baseline gap-4 border-b border-divider py-3"
              >
                <span className="w-24 shrink-0 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted">
                  {c.code}
                </span>
                <span className="flex-1 text-sm text-ink">{c.name}</span>
                {c.term && (
                  <span className="shrink-0 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
                    {c.term}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
