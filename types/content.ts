export interface DemoLink {
  /** Button text. "Live Demo" when a project has only one. */
  label: string;
  href: string;
}

export interface Project {
  title: string;
  slug: string;
  tagline: string;
  date: string;
  end?: string;
  featured: boolean;
  cover?: string;
  tech: string[];
  hardware: string[];
  github?: string;
  /** Normalised from frontmatter `demo`, which may be a string or a list. */
  demos: DemoLink[];
  demoComingSoon?: boolean;
  order: number;
  content: string;
  // Optional detail-page metadata (mirrors the redesigned project layout).
  award?: string;
  role?: string;
  context?: string;
  categories: string[];
}

export interface Experience {
  company: string;
  role: string;
  slug: string;
  start: string;
  end?: string;
  location: string;
  logo?: string;
  tech: string[];
  featured: boolean;
  order: number;
  content: string;
}

export interface Research {
  title: string;
  slug: string;
  lab: string;
  advisor?: string;
  start: string;
  end: string;
  abstract: string;
  tech: string[];
  paper?: string;
  code?: string;
  bibtex?: string;
  order: number;
  content: string;
}
