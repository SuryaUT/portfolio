import { BookOpen, Mail, ExternalLink } from "lucide-react";
import { GitHubIcon, LinkedInIcon, InstagramIcon, TikTokIcon } from "@/components/icons/BrandIcons";
import { SITE } from "@/lib/site-config";

const links = [
  { icon: GitHubIcon, label: "GitHub", href: SITE.socials.github },
  { icon: LinkedInIcon, label: "LinkedIn", href: SITE.socials.linkedin },
  { icon: InstagramIcon, label: "Instagram", href: SITE.socials.instagram },
  { icon: TikTokIcon, label: "TikTok", href: SITE.socials.tiktok },
  { icon: BookOpen, label: "Google Scholar", href: SITE.socials.scholar },
  { icon: ExternalLink, label: "Twitter / X", href: SITE.socials.twitter },
  { icon: Mail, label: "Email", href: `mailto:${SITE.email}` },
];

export default function SocialLinks() {
  return (
    <div className="flex flex-wrap gap-4">
      {links
        .filter(({ href }) => !!href)
        .map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("mailto") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-jetbrains text-[0.6875rem] uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
          >
            <Icon size={14} />
            {label}
          </a>
        ))}
    </div>
  );
}
