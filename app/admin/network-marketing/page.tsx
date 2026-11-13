import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminArea } from "@/components/admin/AdminArea";
import { SprintFocus } from "@/components/admin/SprintFocus";
export const metadata: Metadata = { title: "Network Marketing — Admin" };
const links = [
  {
    href: "/admin/users",
    label: "People",
    description: "Activation, account assignment and AI credits.",
  },
  {
    href: "https://app.whatelz.ai/leads",
    label: "Leads",
    description: "Open your private prospect profiles and next follow-ups.",
  },
  {
    href: "https://app.whatelz.ai/culture",
    label: "Culture",
    description:
      "Explore 超凡 sayings and future 顺育 and Founder’s Club teachings.",
  },
  {
    href: "/admin/calendar-access",
    label: "Founder’s Club access",
    description:
      "Confirm club personas and manage who can see each calendar activity.",
  },
  {
    href: "https://app.whatelz.ai/calendar",
    label: "Founder’s Club calendar",
    description: "See imported community events and plan the next invitation.",
  },
  {
    href: "https://app.whatelz.ai/catalogue",
    label: "Product catalogue",
    description:
      "Browse Malaysia and Singapore price references and source-backed PV/BV explanations.",
  },
  {
    href: "/admin/team",
    label: "Team management",
    description:
      "Explore relationships and update member details, current levels and goals.",
  },
  {
    href: "https://app.whatelz.ai",
    label: "Member workspace",
    description:
      "Open the community app. Each member sees the team information their account is permitted to access.",
  },
];
export default function NetworkMarketingPage() {
  return (
    <AdminArea
      title="Network Marketing"
      description="People, conversations and the next follow-up."
      intro={
        <Suspense
          fallback={
            <p className="text-sm text-zinc-500">Reading your focus…</p>
          }
        >
          <SprintFocus lane="network-marketing" />
        </Suspense>
      }
      links={links.filter((link) =>
        ["Leads", "Team management"].includes(link.label),
      )}
      groups={[
        {
          label: "Activities & products",
          links: links.filter((link) =>
            ["Founder’s Club calendar", "Product catalogue"].includes(
              link.label,
            ),
          ),
        },
        {
          label: "Member administration",
          links: links.filter((link) =>
            ["People", "Member workspace"].includes(link.label),
          ),
        },
      ]}
      secondary={links.filter((link) =>
        ["Culture", "Founder’s Club access"].includes(link.label),
      )}
    />
  );
}
