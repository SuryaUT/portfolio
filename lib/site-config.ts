export const SITE = {
  name: "Surya Balaji",
  initials: "SB",
  tagline: "Robotics Engineer · UT Austin",
  shortBio:
    "I build autonomous systems that bridge the gap between algorithms and the physical world.",
  email: "suryab@utexas.edu",
  location: "Austin, TX, USA",

  socials: {
    github: "https://github.com/SuryaUT",
    linkedin: "https://linkedin.com/in/suryabalaji1/",
    instagram: "https://www.instagram.com/surya_balaji/",
    tiktok: "https://www.tiktok.com/@ur.avg.engineer",
    scholar: "",
    twitter: "",
  },

  // Swap this path when the custom summer robot model is ready.
  heroModel: "/models/robot-arm.glb",
  resumeUrl: "/Surya_Balaji_Resume.pdf",
  resumeLastUpdated: "2026-06",

  ogTitle: "Surya Balaji — Robotics Engineer",
  ogDescription:
    "Building autonomous systems at UT Austin. Robotics, ROS 2, computer vision, and more.",
  baseUrl:
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://surya-balaji.com",
} as const;
