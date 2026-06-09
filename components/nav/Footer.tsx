import Link from "next/link";
import { BookOpen, Mail } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/icons/BrandIcons";
import { SITE } from "@/lib/site-config";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-divider bg-surface">
      <div className="content-grid flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/"
            className="font-jetbrains text-xs uppercase tracking-widest text-ink"
          >
            {SITE.name}
          </Link>
          <p className="mt-1 font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
            {SITE.location}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {SITE.socials.github && (
            <a
              href={SITE.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <GitHubIcon size={18} />
            </a>
          )}
          {SITE.socials.linkedin && (
            <a
              href={SITE.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <LinkedInIcon size={18} />
            </a>
          )}
          {SITE.socials.scholar && (
            <a
              href={SITE.socials.scholar}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Google Scholar"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              <BookOpen size={18} />
            </a>
          )}
          <a
            href={`mailto:${SITE.email}`}
            aria-label="Email"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <Mail size={18} />
          </a>
        </div>

        <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
          © {year}
        </p>
      </div>
    </footer>
  );
}
