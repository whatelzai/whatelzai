import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { dailyOwner } from "@/lib/daily/server";
const roots = {
  "": () => import("@/app/page"),
  about: () => import("@/app/about/page"),
  testimonials: () => import("@/app/testimonials/page"),
  events: () => import("@/app/events/page"),
  blog: () => import("@/app/blog/page"),
  career: () => import("@/app/career/page"),
  hackathons: () => import("@/app/hackathons/page"),
  leadership: () => import("@/app/leadership/page"),
  mentorship: () => import("@/app/mentorship/page"),
  contact: () => import("@/app/contact/page"),
  channels: () => import("@/app/channels/page"),
  feedback: () => import("@/app/feedback/page"),
};
const details = {
  blog: () => import("@/app/blog/[slug]/page"),
  career: () => import("@/app/career/[slug]/page"),
  hackathons: () => import("@/app/hackathons/[slug]/page"),
  leadership: () => import("@/app/leadership/[slug]/page"),
  mentorship: () => import("@/app/mentorship/[slug]/page"),
  services: () => import("@/app/services/[slug]/page"),
  testimonials: () => import("@/app/testimonials/[slug]/page"),
  events: () => import("@/app/events/[date]/page"),
};
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await dailyOwner();
  const { path = [] } = await params;
  const key = path.join("/");
  const special = {
    "events/money-mindset-ai-skillset": () =>
      import("@/app/events/money-mindset-ai-skillset/page"),
    "events/millionairs-ai-playbook": () =>
      import("@/app/events/millionairs-ai-playbook/page"),
    "testimonials/new": () => import("@/app/testimonials/new/page"),
  };
  if (path[0] === "feedback" && path[1] === "t" && path.length === 3) {
    const { default: Feedback } = await import("@/app/feedback/t/[slug]/page");
    return (
      <section className="admin-site-preview">
        <p>Website preview · read-only</p>
        <fieldset disabled>
          <Feedback params={Promise.resolve({ slug: path[2] })} />
        </fieldset>
      </section>
    );
  }
  const load =
    special[key as keyof typeof special] ??
    (path.length <= 1
      ? roots[key as keyof typeof roots]
      : path.length === 2
        ? details[path[0] as keyof typeof details]
        : null);
  if (!load) notFound();
  const { default: View } = await load();
  // The allowlisted public views receive only their route fields, never a remote URL.
  const PublicView = View as ComponentType<{
    params: Promise<{ slug: string; date: string }>;
    searchParams: Promise<Record<string, string>>;
  }>;
  return (
    <section className="admin-site-preview">
      <p>Website preview · read-only</p>
      <fieldset disabled>
        <PublicView
          params={Promise.resolve({ slug: path[1] ?? "", date: path[1] ?? "" })}
          searchParams={searchParams}
        />
      </fieldset>
    </section>
  );
}
