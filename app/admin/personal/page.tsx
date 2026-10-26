import type { Metadata } from "next";
import { AdminArea } from "@/components/admin/AdminArea";
export const metadata: Metadata = { title: "Personal — Admin" };
export default function PersonalPage() {
  return (
    <AdminArea
      title="Personal"
      description="A little space for yourself. Read your daily brief, reflect, and decide what deserves your attention."
      links={[
        {
          href: "/admin/personal/money",
          label: "Money",
          description: "My jars, spending and recurring expenses.",
        },
        {
          href: "/admin/personal/mandala",
          label: "My Mandala",
          description:
            "My three-year direction, eight life areas and the complete first-pass plan.",
        },
        {
          href: "/admin/today",
          label: "Today",
          description: "Your morning brief, evening closeout and commitments.",
        },
        {
          href: "/admin/today/weekly",
          label: "Weekly reflection",
          description: "Step back and read the week as a whole.",
        },
        {
          href: "/admin/today/routines",
          label: "Your routines",
          description: "The practices behind your daily rhythm.",
        },
      ]}
    />
  );
}
