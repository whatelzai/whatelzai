import { Suspense } from "react";
import { SprintFocus } from "@/components/admin/SprintFocus";
import type { Metadata } from "next";
import { AdminArea } from "@/components/admin/AdminArea";

export const metadata: Metadata = { title: "AI Business — Admin" };

const links = [
  {
    href: "/admin/ai-business/operations",
    label: "Product health",
    description: "Whatelzai and EMDEE activity and connection health.",
  },
  {
    href: "/admin/profile",
    label: "My profile",
    description: "Manage your profile and related website content.",
  },
  {
    href: "/admin/design-system",
    label: "Brand & design system",
    description: "Logo, colours and brand assets.",
  },
  {
    href: "/admin/site-dashboard",
    label: "Website dashboard",
    description: "Manage website sections and review content activity.",
  },
  {
    href: "/admin/services",
    label: "Services",
    description: "Manage your AI offerings.",
  },
  {
    href: "/admin/blog",
    label: "Blog",
    description: "Write and publish articles.",
  },
  {
    href: "/admin/newsletter",
    label: "Newsletter",
    description: "Manage subscribers and newsletters.",
  },
  {
    href: "/admin/testimonials",
    label: "Testimonials",
    description: "Manage client feedback.",
  },
  {
    href: "/admin/landing",
    label: "Homepage",
    description: "Edit the public website.",
  },
  {
    href: "/admin/projects",
    label: "Projects",
    description: "Manage portfolio projects.",
  },
  {
    href: "/admin/career",
    label: "Career",
    description: "Manage your public career history.",
  },
  {
    href: "/admin/hackathons",
    label: "Hackathons",
    description: "Manage hackathon entries.",
  },
  {
    href: "/admin/leadership",
    label: "Leadership",
    description: "Manage leadership experience.",
  },
  {
    href: "/admin/mentorship",
    label: "Mentorship",
    description: "Manage mentorship content.",
  },
  {
    href: "/admin/events",
    label: "Events",
    description: "Manage public event content.",
  },
];

export default function AIBusinessPage() {
  return (
    <AdminArea
      title="AI Business"
      description="One useful outcome for this work block."
      intro={
        <Suspense
          fallback={
            <p className="text-sm text-zinc-500">Reading your focus…</p>
          }
        >
          <SprintFocus lane="ai-business" />
        </Suspense>
      }
      links={[]}
      groups={[
        {
          label: "Writing & conversations",
          links: links.filter((link) =>
            ["Blog", "Newsletter", "Testimonials", "Events"].includes(
              link.label,
            ),
          ),
        },
        {
          label: "Website & identity",
          links: links.filter((link) =>
            [
              "Product health",
              "My profile",
              "Brand & design system",
              "Website dashboard",
              "Homepage",
            ].includes(link.label),
          ),
        },
        {
          label: "Offers",
          links: links.filter((link) => link.label === "Services"),
        },
        {
          label: "Portfolio",
          links: links.filter((link) =>
            [
              "Projects",
              "Career",
              "Hackathons",
              "Leadership",
              "Mentorship",
            ].includes(link.label),
          ),
        },
      ]}
    />
  );
}
