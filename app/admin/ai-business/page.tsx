import EventSummary from "@/components/admin/event-admin/EventSummary";
import { Suspense } from "react";
import { SprintFocus } from "@/components/admin/SprintFocus";
import type { Metadata } from "next";
import { AdminArea } from "@/components/admin/AdminArea";

export const metadata: Metadata = { title: "AI Business — Admin" };

const links = [
  {
    href: "/admin/ai-business/invites",
    label: "Invite List",
    description: "Invitation history, attendance and your next conversation.",
  },
  {
    href: "/admin/event-checkin",
    label: "Event registrations",
    description: "People, payments, ticket emails and check-in.",
  },
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
      description="Events, relationships and paid offers."
      intro={
        <>
          <Suspense
            fallback={<p role="status">Reading event registrations…</p>}
          >
            <EventSummary />
          </Suspense>
          <Suspense
            fallback={
              <p className="text-sm text-zinc-500">Reading your focus…</p>
            }
          >
            <SprintFocus lane="ai-business" />
          </Suspense>
        </>
      }
      links={[]}
      groups={[
        {
          label: "Events",
          links: [
            {
              href: "/admin/event-checkin",
              label: "Attendees & sales",
              description: "Sign-ups, payments, posters and event photos.",
            },
            {
              href: "/admin/events",
              label: "Plan an event",
              description: "Upcoming sessions and past events.",
            },
          ],
        },
        {
          label: "People",
          links: [
            {
              href: "/admin/ai-business/invites",
              label: "Invites & follow-ups",
              description: "Your next conversation.",
            },
            {
              href: "/admin/newsletter",
              label: "Newsletter",
              description: "Stay in touch with your audience.",
            },
          ],
        },
        {
          label: "Proof",
          links: [
            {
              href: "/admin/testimonials",
              label: "Testimonials",
              description: "Participant and client feedback.",
            },
            {
              href: "/admin/event-checkin?tool=media",
              label: "Event photos & videos",
              description: "Open the event media library.",
            },
          ],
        },
        {
          label: "Products",
          links: [
            {
              href: "/admin/playbook",
              label: "The playbook",
              description: "View your digital product.",
            },
            {
              href: "/admin/services",
              label: "Offers & services",
              description: "Your paid offers.",
            },
          ],
        },
      ]}
      secondary={links.filter(
        (link) =>
          ![
            "Invite List",
            "Event registrations",
            "Newsletter",
            "Testimonials",
            "Events",
            "Services",
          ].includes(link.label),
      )}
    />
  );
}
