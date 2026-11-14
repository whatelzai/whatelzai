import type { MetadataRoute } from "next";
import { listProjects } from "@/lib/projects";
import { getAllPosts } from "@/lib/blog";
import { listHackathons } from "@/lib/hackathons";
import { listCareer } from "@/lib/career";
import { listLeadership } from "@/lib/leadership";
import { listMentorship } from "@/lib/mentorship";
import { listPublicTestimonials, testimonialSlug } from "@/lib/testimonials";
import { pastThursdayEvents } from "@/lib/public-events/past";
import { listQuizzes } from "@/lib/quizzes";

const SITE_URL = "https://whatelz.ai";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: Entry[] = [
    {
      url: `${SITE_URL}/events/2026-11-19`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...pastThursdayEvents.map((event) => ({
      url: `${SITE_URL}${event.path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    {
      url: `${SITE_URL}/events`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/events/money-mindset-ai-skillset`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/playbook`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/hackathons`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/career`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/leadership`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/mentorship`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/channels`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/testimonials`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/quiz`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const [
    projects,
    posts,
    hackathons,
    career,
    leadership,
    mentorship,
    testimonials,
    quizzes,
  ] = await Promise.all([
    safe(() => listProjects(true)),
    safe(() => getAllPosts(false)),
    safe(() => listHackathons(true)),
    safe(() => listCareer(true)),
    safe(() => listLeadership(true)),
    safe(() => listMentorship(true)),
    safe(() => listPublicTestimonials()),
    safe(() => listQuizzes(true)),
  ]);

  const dynamicEntries: Entry[] = [
    ...projects.map(
      (p): Entry => ({
        url: `${SITE_URL}/projects/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    ),
    ...posts.map(
      (p): Entry => ({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: p.date ? new Date(p.date) : now,
        changeFrequency: "yearly",
        priority: 0.7,
      }),
    ),
    ...hackathons.map(
      (h): Entry => ({
        url: `${SITE_URL}/hackathons/${h.slug}`,
        lastModified: h.updated_at ? new Date(h.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.5,
      }),
    ),
    ...career.map(
      (c): Entry => ({
        url: `${SITE_URL}/career/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.5,
      }),
    ),
    ...leadership.map(
      (l): Entry => ({
        url: `${SITE_URL}/leadership/${l.slug}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.4,
      }),
    ),
    ...mentorship.map(
      (m): Entry => ({
        url: `${SITE_URL}/mentorship/${m.slug}`,
        lastModified: m.updated_at ? new Date(m.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.4,
      }),
    ),
    ...testimonials.map(
      (t): Entry => ({
        url: `${SITE_URL}/testimonials/${testimonialSlug(t)}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.6,
      }),
    ),
    ...quizzes.map(
      (q): Entry => ({
        url: `${SITE_URL}/quiz/${q.slug}`,
        lastModified: q.updated_at ? new Date(q.updated_at) : now,
        changeFrequency: "monthly",
        priority: 0.8,
      }),
    ),
  ];

  return [...staticEntries, ...dynamicEntries];
}
