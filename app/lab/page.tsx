import type { Metadata } from "next";
import ArmLabLoader from "@/components/lab/ArmLabLoader";

export const metadata: Metadata = {
  title: "Arm Lab",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  return <ArmLabLoader />;
}
