import type { Metadata } from "next";
import SectionHeader from "@/components/sections/SectionHeader";
import FadeIn from "@/components/motion/FadeIn";
import ContactForm from "@/components/contact/ContactForm";
import SocialLinks from "@/components/about/SocialLinks";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch for internships, research collaborations, or anything else.",
};

export default function ContactPage() {
  return (
    <main className="content-grid py-20">
      <FadeIn>
        <SectionHeader index="00" title="Contact" />
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="text-2xl font-semibold text-ink mb-3">
              Let&apos;s build something.
            </h2>
            <p className="text-ink-muted leading-relaxed max-w-md mb-8">
              I&apos;m actively looking for fall 2026 through summer 2027 robotics
              internships and research collaborations. If you&apos;re working on
              autonomous systems, manipulation, or mobile robotics, I&apos;d love to chat.
            </p>
            <div className="space-y-2 mb-8">
              <p className="font-jetbrains text-[0.625rem] uppercase tracking-widest text-ink-muted">
                Email
              </p>
              <a
                href={`mailto:${SITE.email}`}
                className="text-ink hover:text-accent transition-colors"
              >
                {SITE.email}
              </a>
            </div>
            <SocialLinks />
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </FadeIn>
    </main>
  );
}
