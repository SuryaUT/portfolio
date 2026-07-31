"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Where each skill was used / first learned. Projects and experiences link to
// their detail pages; keys are referenced by the skill data below.
const REF = {
  amrl: { label: "AMRL", href: "/experience/amrl-researcher" },
  lhnt: { label: "LHNT", href: "/experience/longhorn-neurotech" },
  ta: { label: "TA", href: "/experience/ut-ta" },
  racecar: { label: "Racecar", href: "/projects/autonomous-racecar" },
  m0rix: { label: "M0+rix", href: "/projects/m0plus-game-engine" },
  semgArm: { label: "sEMG Arm", href: "/projects/emg-robotic-arm" },
  semgVr: { label: "sEMG VR", href: "/projects/semg-controlled-vr" },
  semgRover: { label: "sEMG Rover", href: "/projects/semg-controlled-rover" },
  semgDisplay: { label: "sEMG Strength Display", href: "/projects/semg-strength-display" },
} as const;

type RefKey = keyof typeof REF;

type Learned =
  | { kind: "course"; code: string } // where a class taught it (links to #coursework)
  | { kind: "ref"; ref: RefKey } // first learned in a project/experience
  | { kind: "text"; text: string }; // learned off-site (boxed, not a link)

type Skill = { name: string; learned: Learned; used?: RefKey[] };

const SKILLS: { group: string; items: Skill[] }[] = [
  {
    group: "Languages & Libraries",
    items: [
      { name: "Python", learned: { kind: "text", text: "Pre-college" }, used: ["amrl", "semgArm", "semgVr"] },
      { name: "C", learned: { kind: "course", code: "ECE 312H" }, used: ["semgArm", "racecar", "m0rix"] },
      { name: "C++", learned: { kind: "course", code: "ECE 312H" }, used: ["semgArm", "racecar", "m0rix"] },
      { name: "ARM M0+ Assembly", learned: { kind: "course", code: "ECE 319H" }, used: ["racecar", "m0rix", "ta"] },
      { name: "TensorFlow", learned: { kind: "ref", ref: "semgArm" } },
      { name: "scikit-learn", learned: { kind: "ref", ref: "semgArm" } },
      { name: "NumPy", learned: { kind: "text", text: "Off-site project" }, used: ["semgArm", "amrl"] },
      { name: "Pandas", learned: { kind: "text", text: "Off-site project" }, used: ["semgArm", "amrl"] },
      { name: "OpenCV", learned: { kind: "text", text: "Online course" } },
    ],
  },
  {
    group: "Systems & Platforms",
    items: [
      { name: "ROS 2", learned: { kind: "ref", ref: "amrl" } },
      { name: "cuRobo", learned: { kind: "ref", ref: "amrl" } },
      { name: "FreeRTOS", learned: { kind: "ref", ref: "semgArm" } },
      { name: "Docker", learned: { kind: "ref", ref: "amrl" } },
      { name: "Linux", learned: { kind: "ref", ref: "amrl" } },
      { name: "Real-Time Systems", learned: { kind: "course", code: "ECE 319H" }, used: ["amrl", "racecar", "m0rix", "semgArm", "ta"] },
    ],
  },
  {
    group: "Tools",
    items: [
      { name: "Git", learned: { kind: "course", code: "ECE 319H" }, used: ["m0rix", "lhnt", "amrl", "semgArm", "racecar"] },
      { name: "ESP-IDF", learned: { kind: "ref", ref: "semgArm" } },
      { name: "KiCad", learned: { kind: "course", code: "ECE 319H" }, used: ["m0rix"] },
      { name: "Vivado", learned: { kind: "course", code: "ECE 316" } },
      { name: "Code Composer Studio", learned: { kind: "course", code: "ECE 319H" }, used: ["ta", "m0rix", "racecar"] },
      { name: "Autodesk Fusion", learned: { kind: "ref", ref: "m0rix" } },
      { name: "SPICE", learned: { kind: "course", code: "ECE 302H" } },
      { name: "IdeaMaker", learned: { kind: "ref", ref: "m0rix" }, used: ["semgArm"] },
    ],
  },
];

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}

// Grey-outlined rectangle link matching the divider palette; on hover the
// outline and text turn orange.
function RefChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      onClick={stop}
      className="inline-flex items-center border border-divider px-2 py-0.5 text-[0.6875rem] leading-tight text-ink-muted transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </Link>
  );
}

function LearnedValue({ learned }: { learned: Learned }) {
  if (learned.kind === "course") {
    return <RefChip href="#coursework" label={learned.code} />;
  }
  if (learned.kind === "ref") {
    const r = REF[learned.ref];
    return <RefChip href={r.href} label={r.label} />;
  }
  // Boxed but not clickable (e.g. "Pre-college").
  return (
    <span className="inline-flex items-center border border-divider px-2 py-0.5 text-[0.6875rem] leading-tight text-ink-muted">
      {learned.text}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-jetbrains text-[0.5625rem] uppercase tracking-[0.2em] text-accent">
        {label}
      </p>
      {children}
    </div>
  );
}

function SkillChip({ skill }: { skill: Skill }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  // Flip the card leftward if opening rightward would run past the group edge.
  useEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    const card = cardRef.current;
    const parent = wrap?.parentElement;
    if (!wrap || !card || !parent) return;
    const w = wrap.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    setAlignRight(w.left + card.offsetWidth > p.right);
  }, [open]);

  return (
    // The chip stays put and the card simply floats over the neighbouring chips.
    // The card is a child of this wrapper, so hovering it keeps it open.
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`border px-4 py-2 font-jetbrains text-[0.8125rem] uppercase tracking-wider outline-none transition-colors duration-200 ${
          open
            ? "border-accent/60 bg-surface text-ink opacity-0"
            : "border-divider bg-surface text-ink hover:border-accent/60 hover:text-accent focus-visible:border-accent"
        }`}
      >
        {skill.name}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: alignRight ? "top right" : "top left" }}
            className={`absolute top-0 z-20 w-64 max-w-[80vw] border border-accent/60 bg-surface p-4 shadow-lg ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            <p className="mb-3 font-jetbrains text-[0.8125rem] uppercase tracking-wider text-ink">
              {skill.name}
            </p>
            <div className="space-y-3">
              <DetailRow label="First learned in">
                <LearnedValue learned={skill.learned} />
              </DetailRow>
              {skill.used && skill.used.length > 0 && (
                <DetailRow label="Used in">
                  <div className="flex flex-wrap gap-1.5">
                    {skill.used.map((k) => (
                      <RefChip key={k} href={REF[k].href} label={REF[k].label} />
                    ))}
                  </div>
                </DetailRow>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Skills() {
  return (
    <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2">
      {SKILLS.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-5 font-jetbrains text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {group}
          </p>
          <div className="flex flex-wrap items-start gap-2.5">
            {items.map((skill) => (
              <SkillChip key={skill.name} skill={skill} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
