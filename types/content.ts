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
  demo?: string;
  order: number;
  content: string;
}

export interface Experience {
  company: string;
  role: string;
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
