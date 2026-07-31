// Single source of truth for coursework. Consumed by the Coursework section
// and referenced by the Skills cards (by course code) so a title edited here
// updates everywhere. Excludes Summer 2024 credit-by-exam courses and the
// first-year interest group; Summer 2025 transfer gen-eds are omitted except
// the few that are portfolio-relevant.

export type Course = { code: string; name: string; term: string };

export const COURSEWORK: { group: string; courses: Course[] }[] = [
  {
    group: "Embedded & Software",
    courses: [
      { code: "ECE 306", name: "Introduction to Computing", term: "Fall '24" },
      { code: "ECE 312H", name: "Software Design and Implementation: Honors", term: "Spr '25" },
      { code: "ECE 319H", name: "Introduction to Embedded Systems: Honors", term: "Spr '25" },
      { code: "ECE 316", name: "Digital Logic Design", term: "Spr '26" },
      { code: "ECE 445M", name: "Real-Time Operating Systems Lab", term: "Spr '26" },
      { code: "ECE 460N", name: "Computer Architecture", term: "Fall '25" },
    ],
  },
  {
    group: "Circuits & Signals",
    courses: [
      { code: "ECE 302H", name: "Introduction to Electrical Engineering: Honors", term: "Fall '24" },
      { code: "ECE 411H", name: "Circuit Theory: Honors", term: "Fall '25" },
      { code: "ECE 313H", name: "Linear Systems and Signals: Honors", term: "Fall '25" },
    ],
  },
  {
    group: "Mathematics",
    courses: [
      { code: "M 408D", name: "Sequences, Series, and Multivariable Calculus", term: "Fall '24" },
      { code: "M 427J", name: "Differential Equations with Linear Algebra", term: "Spr '25" },
      { code: "M 311", name: "Linear Algebra", term: "Sum '25" },
      { code: "M 325K", name: "Discrete Mathematics", term: "Sum '25" },
    ],
  },
  {
    group: "Data & Statistics",
    courses: [
      { code: "STA 301H", name: "Introduction to Data Science: Honors", term: "Spr '25" },
      { code: "STA 235H", name: "Data Science for Business Applications: Honors", term: "Fall '25" },
      { code: "D S 235H", name: "Introduction to Decision Science: Honors", term: "Spr '26" },
    ],
  },
  {
    group: "Business & Economics",
    courses: [
      { code: "MIS 301H", name: "Introduction to Management Information Systems: Honors", term: "Spr '25" },
      { code: "ACC 311H", name: "Fundamentals of Financial Accounting: Honors", term: "Fall '25" },
      { code: "ACC 312H", name: "Fundamentals of Managerial Accounting: Honors", term: "Spr '26" },
      { code: "O M 235H", name: "Operations Management: Honors", term: "Spr '26" },
      { code: "B A 324H", name: "Business Communication: Oral and Written: Honors", term: "Fall '24" },
      { code: "ECO 304K", name: "Introduction to Microeconomics", term: "Sum '25" },
    ],
  },
];

export const COURSE_BY_CODE: Record<string, Course> = Object.fromEntries(
  COURSEWORK.flatMap((g) => g.courses).map((c) => [c.code, c]),
);
