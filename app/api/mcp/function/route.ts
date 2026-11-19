import { findActiveToken } from "@/lib/auth/tokens";
import { OWNER_SCOPE } from "@/lib/auth/scopes";
import { NextRequest, NextResponse } from "next/server";
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "@/lib/blog";
import { getMediaAssets, getMediaAsset, updateMediaAsset } from "@/lib/media";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  listResumeVersions,
  getResumeVersion,
  upsertResumeVersion,
  patchResumeSection,
  appendResumeSection,
} from "@/lib/resume-versions";
import {
  listHackathons,
  getHackathon,
  upsertHackathon,
  deleteHackathon,
} from "@/lib/hackathons";
import type { HackathonAward } from "@/lib/hackathons";
import {
  listCareer,
  getCareerBySlug,
  upsertCareer,
  deleteCareer,
} from "@/lib/career";
import type { CareerEntry } from "@/lib/career";
import {
  listProjects,
  getProject,
  upsertProject,
  deleteProject,
} from "@/lib/projects";
import {
  listLeadership,
  getLeadership,
  upsertLeadership,
  deleteLeadership,
} from "@/lib/leadership";
import {
  listMentorship,
  getMentorship,
  upsertMentorship,
  deleteMentorship,
} from "@/lib/mentorship";

type ToolArgs = Record<string, unknown>;

const TOOLS: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  // ── Blog ────────────────────────────────────────────────────────────────
  list_posts: (a) =>
    getAllPosts((a.include_drafts as boolean | undefined) ?? false),

  get_post: (a) => getPost(a.slug as string),

  create_post: (a) =>
    createPost({
      slug: a.slug as string,
      title: a.title as string,
      content: a.content as string,
      summary: a.summary as string | undefined,
      tags: a.tags as string[] | undefined,
      status: a.status as "draft" | "published" | undefined,
    }),

  update_post: (a) =>
    updatePost(a.slug as string, {
      title: a.title as string | undefined,
      summary: a.summary as string | undefined,
      content: a.content as string | undefined,
      tags: a.tags as string[] | undefined,
      status: a.status as "draft" | "published" | undefined,
    }),

  delete_post: (a) => deletePost(a.slug as string),

  // ── Media ────────────────────────────────────────────────────────────────
  list_media: (a) =>
    getMediaAssets({
      destination: a.destination as string | undefined,
      processed: typeof a.processed === "boolean" ? a.processed : undefined,
      limit: (a.limit as number | undefined) ?? 50,
    }),

  get_media_asset: (a) => getMediaAsset(a.id as string),

  update_media_asset: (a) =>
    updateMediaAsset(a.id as string, {
      label: a.label as string | undefined,
      description: a.description as string | undefined,
      destinations: a.destinations as string[] | undefined,
      focal_point: a.focal_point as { x: number; y: number } | undefined,
      crop_hint: a.crop_hint as
        | { x: number; y: number; width: number; height: number }
        | undefined,
      processed: a.processed as boolean | undefined,
    }),

  // ── Resume ───────────────────────────────────────────────────────────────
  get_resume: async () => {
    const { data } = await supabaseAdmin
      .from("system_config")
      .select("value, updated_at")
      .eq("key", "resume")
      .single();
    if (!data?.value)
      return {
        content: null,
        message: "No resume yet — use update_resume to create one.",
      };
    return { content: data.value, updated_at: data.updated_at };
  },

  update_resume: async (a) => {
    const content = a.content as string;
    const { error } = await supabaseAdmin
      .from("system_config")
      .upsert({ key: "resume", value: content });
    if (error) throw error;
    return { ok: true };
  },

  // ── Resume versions ───────────────────────────────────────────────────────
  list_resume_versions: () => listResumeVersions(),

  get_resume_version: (a) => getResumeVersion(a.variant as string),

  update_resume_version: (a) =>
    upsertResumeVersion(a.variant as string, a.content as string),

  patch_resume_section: (a) =>
    patchResumeSection(
      a.variant as string,
      a.section as string,
      a.content as string,
    ),

  append_resume_section: (a) =>
    appendResumeSection(
      a.variant as string,
      a.heading as string,
      a.content as string,
      (a.level as number | undefined) ?? 2,
    ),

  // ── Hackathons ────────────────────────────────────────────────────────────
  list_hackathons: () => listHackathons(false),

  get_hackathon: (a) => getHackathon(a.id as string),

  create_hackathon: async (a) => {
    const slug = a.slug as string | undefined;
    if (slug) {
      const { data: existing } = await supabaseAdmin
        .from("hackathons")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existing) return { error: "slug_conflict", existing_id: existing.id };
    }
    return upsertHackathon({
      name: a.name as string,
      date: a.date as string,
      slug: slug,
      organizer: a.organizer as string | undefined,
      location: a.location as string | undefined,
      awards: (a.awards as HackathonAward[]) ?? [],
      demo_url: a.demo_url as string | undefined,
      writeup: (a.writeup as string) ?? "",
      tags: (a.tags as string[]) ?? [],
      thumbnail_url: a.thumbnail_url as string | undefined,
      published: (a.published as boolean) ?? false,
      team: (a.team as string[]) ?? [],
      tier: (a.tier as "coding" | "non-coding") ?? "coding",
      project_name: a.project_name as string | undefined,
    });
  },

  update_hackathon: async (a) => {
    const id = a.id as string;
    const existing = await getHackathon(id);
    if (!existing) return { error: "not_found", id };
    return upsertHackathon(
      {
        name: a.name as string,
        date: a.date as string,
        slug: (a.slug as string | undefined) ?? existing.slug,
        organizer: a.organizer as string | undefined,
        location: a.location as string | undefined,
        awards: (a.awards as HackathonAward[]) ?? [],
        demo_url: a.demo_url as string | undefined,
        writeup: (a.writeup as string) ?? "",
        tags: (a.tags as string[]) ?? [],
        thumbnail_url: a.thumbnail_url as string | undefined,
        published: (a.published as boolean) ?? false,
        team: (a.team as string[]) ?? [],
        tier: (a.tier as "coding" | "non-coding") ?? "coding",
        project_name: a.project_name as string | undefined,
      },
      id,
    );
  },

  delete_hackathon: (a) => deleteHackathon(a.id as string),

  // ── Career ────────────────────────────────────────────────────────────────
  list_career: () => listCareer(false),

  get_career_by_slug: (a) => getCareerBySlug(a.slug as string),

  create_career: (a) =>
    upsertCareer({
      slug: a.slug as string,
      company: a.company as string,
      role: a.role as string,
      start_date: a.start_date as string,
      end_date: (a.end_date as string | undefined) ?? null,
      description: (a.description as string | undefined) ?? null,
      tags: (a.tags as string[]) ?? [],
      published: (a.published as boolean) ?? false,
    }),

  update_career: (a) =>
    upsertCareer({
      id: a.id as string,
      slug: a.slug as string,
      company: a.company as string,
      role: a.role as string,
      start_date: a.start_date as string,
      end_date: (a.end_date as string | undefined) ?? null,
      description: (a.description as string | undefined) ?? null,
      tags: (a.tags as string[]) ?? [],
      published: (a.published as boolean) ?? false,
    } as Omit<CareerEntry, "created_at" | "updated_at">),

  delete_career: (a) => deleteCareer(a.id as string),

  // ── Hackathon content ─────────────────────────────────────────────────────
  get_hackathon_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("hackathons")
      .select("id, slug, name, content")
      .eq("id", a.id as string)
      .maybeSingle();
    if (error) throw new Error(`get_hackathon_content: ${error.message}`);
    return data;
  },

  patch_hackathon_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("hackathons")
      .update({ content: a.content as string })
      .eq("id", a.id as string)
      .select("id, slug")
      .single();
    if (error) throw new Error(`patch_hackathon_content: ${error.message}`);
    return { ...data, updated: true };
  },

  // ── Career content ────────────────────────────────────────────────────────
  get_career_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("career")
      .select("id, slug, role, content")
      .eq("id", a.id as string)
      .maybeSingle();
    if (error) throw new Error(`get_career_content: ${error.message}`);
    return data;
  },

  patch_career_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("career")
      .update({
        content: a.content as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.id as string)
      .select("id, slug")
      .single();
    if (error) throw new Error(`patch_career_content: ${error.message}`);
    return { ...data, updated: true };
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  list_projects: () => listProjects(false),

  get_project: (a) => getProject(a.id as string),

  create_project: (a) =>
    upsertProject({
      slug: a.slug as string,
      name: a.name as string,
      tagline: a.tagline as string | undefined,
      description: a.description as string | undefined,
      status: a.status as "active" | "shipped" | "archived" | undefined,
      type: a.type as string | undefined,
      tech_stack: a.tech_stack as string[] | undefined,
      external_url: a.external_url as string | undefined,
      published: (a.published as boolean | undefined) ?? false,
    }),

  update_project: async (a) => {
    const id = a.id as string;
    const existing = await getProject(id);
    if (!existing) return { error: "not_found", id };
    return upsertProject({
      id,
      slug: (a.slug as string | undefined) ?? existing.slug,
      name: (a.name as string | undefined) ?? existing.name,
      tagline: a.tagline as string | undefined,
      description: a.description as string | undefined,
      status: a.status as "active" | "shipped" | "archived" | undefined,
      type: a.type as string | undefined,
      tech_stack: a.tech_stack as string[] | undefined,
      external_url: a.external_url as string | undefined,
      published: a.published as boolean | undefined,
    });
  },

  patch_project_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({
        content: a.content as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.id as string)
      .select("id, slug")
      .single();
    if (error) throw new Error(`patch_project_content: ${error.message}`);
    return { ...data, updated: true };
  },

  get_project_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, slug, name, content")
      .eq("id", a.id as string)
      .maybeSingle();
    if (error) throw new Error(`get_project_content: ${error.message}`);
    return data;
  },

  // ── Leadership ────────────────────────────────────────────────────────────
  list_leadership: () => listLeadership(false),

  get_leadership: (a) => getLeadership(a.id as string),

  create_leadership: async (a) => {
    const slug = a.slug as string;
    const { data: existing } = await supabaseAdmin
      .from("leadership")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) return { error: "slug_conflict", existing_id: existing.id };
    return upsertLeadership({
      slug,
      organisation: a.organisation as string,
      role: a.role as string,
      start_date: a.start_date as string,
      body: (a.body as string | undefined) ?? null,
      end_date: (a.end_date as string | undefined) ?? null,
      description: (a.description as string | undefined) ?? null,
      tags: (a.tags as string[]) ?? [],
      published: (a.published as boolean) ?? false,
      content: (a.content as string | undefined) ?? null,
    });
  },

  update_leadership: async (a) => {
    const id = a.id as string;
    const existing = await getLeadership(id);
    if (!existing) return { error: "not_found", id };
    return upsertLeadership(
      {
        slug: (a.slug as string | undefined) ?? existing.slug,
        organisation:
          (a.organisation as string | undefined) ?? existing.organisation,
        role: (a.role as string | undefined) ?? existing.role,
        start_date: (a.start_date as string | undefined) ?? existing.start_date,
        body: (a.body as string | undefined) ?? null,
        end_date: (a.end_date as string | undefined) ?? null,
        description: (a.description as string | undefined) ?? null,
        tags: (a.tags as string[]) ?? [],
        published: (a.published as boolean | undefined) ?? existing.published,
        content: (a.content as string | undefined) ?? existing.content,
      },
      id,
    );
  },

  delete_leadership: (a) => deleteLeadership(a.id as string),

  get_leadership_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("leadership")
      .select("id, slug, role, content")
      .eq("id", a.id as string)
      .maybeSingle();
    if (error) throw new Error(`get_leadership_content: ${error.message}`);
    return data;
  },

  patch_leadership_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("leadership")
      .update({
        content: a.content as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.id as string)
      .select("id, slug")
      .single();
    if (error) throw new Error(`patch_leadership_content: ${error.message}`);
    return { ...data, updated: true };
  },

  // ── Mentorship ────────────────────────────────────────────────────────────
  list_mentorship: () => listMentorship(false),

  get_mentorship: (a) => getMentorship(a.id as string),

  create_mentorship: async (a) => {
    const slug = a.slug as string;
    const { data: existing } = await supabaseAdmin
      .from("mentorship")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) return { error: "slug_conflict", existing_id: existing.id };
    return upsertMentorship({
      slug,
      programme: a.programme as string,
      organiser: a.organiser as string,
      start_date: a.start_date as string,
      end_date: (a.end_date as string | undefined) ?? null,
      description: (a.description as string | undefined) ?? null,
      tags: (a.tags as string[]) ?? [],
      published: (a.published as boolean) ?? false,
      content: (a.content as string | undefined) ?? null,
    });
  },

  update_mentorship: async (a) => {
    const id = a.id as string;
    const existing = await getMentorship(id);
    if (!existing) return { error: "not_found", id };
    return upsertMentorship(
      {
        slug: (a.slug as string | undefined) ?? existing.slug,
        programme: (a.programme as string | undefined) ?? existing.programme,
        organiser: (a.organiser as string | undefined) ?? existing.organiser,
        start_date: (a.start_date as string | undefined) ?? existing.start_date,
        end_date: (a.end_date as string | undefined) ?? null,
        description: (a.description as string | undefined) ?? null,
        tags: (a.tags as string[]) ?? [],
        published: (a.published as boolean | undefined) ?? existing.published,
        content: (a.content as string | undefined) ?? existing.content,
      },
      id,
    );
  },

  delete_mentorship: (a) => deleteMentorship(a.id as string),

  get_mentorship_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("mentorship")
      .select("id, slug, programme, content")
      .eq("id", a.id as string)
      .maybeSingle();
    if (error) throw new Error(`get_mentorship_content: ${error.message}`);
    return data;
  },

  patch_mentorship_content: async (a) => {
    const { data, error } = await supabaseAdmin
      .from("mentorship")
      .update({
        content: a.content as string,
        updated_at: new Date().toISOString(),
      })
      .eq("id", a.id as string)
      .select("id, slug")
      .single();
    if (error) throw new Error(`patch_mentorship_content: ${error.message}`);
    return { ...data, updated: true };
  },
};

const TOOL_SCHEMAS = [
  // ── Blog ─────────────────────────────────────────────────────────────────
  {
    name: "list_posts",
    description:
      "List blog posts. Returns slug, title, date, summary, tags, status. Published only by default.",
    inputSchema: {
      type: "object",
      properties: { include_drafts: { type: "boolean", default: false } },
    },
  },
  {
    name: "get_post",
    description: "Get a single blog post by slug, including full content.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "create_post",
    description: "Create a new blog post. Status defaults to 'draft'.",
    inputSchema: {
      type: "object",
      required: ["slug", "title", "content"],
      properties: {
        slug: {
          type: "string",
          description: "URL-safe identifier, e.g. 'my-first-post'",
        },
        title: { type: "string" },
        content: { type: "string", description: "MDX/Markdown body" },
        summary: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", enum: ["draft", "published"] },
      },
    },
  },
  {
    name: "update_post",
    description:
      "Update an existing blog post by slug. Only provided fields are changed.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        content: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", enum: ["draft", "published"] },
      },
    },
  },
  {
    name: "delete_post",
    description: "Permanently delete a blog post by slug.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  // ── Media ─────────────────────────────────────────────────────────────────
  {
    name: "list_media",
    description:
      "List media assets. Filter by destination or processed status. Returns id, url, label, description, destinations, focal_point, crop_hint, processed.",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: ["landing", "about", "blog", "hackathon", "projects", "other"],
        },
        processed: {
          type: "boolean",
          description: "Pass false to fetch only unanalysed images.",
        },
        limit: { type: "integer", default: 50, minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: "get_media_asset",
    description:
      "Get a single media asset by ID. Returns the public URL — fetch it to analyse the image with vision.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "update_media_asset",
    description:
      "Write analysis results back to a media asset. Set processed=true once done so the asset is skipped on future runs.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        label: { type: "string" },
        description: {
          type: "string",
          description: "Human-readable description / alt text.",
        },
        destinations: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "landing",
              "about",
              "blog",
              "hackathon",
              "projects",
              "other",
            ],
          },
        },
        focal_point: {
          type: "object",
          description: "Normalised 0–1 coordinates of the main subject centre.",
          required: ["x", "y"],
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        crop_hint: {
          type: "object",
          description:
            "Normalised 0–1 crop rectangle that keeps the most useful area.",
          required: ["x", "y", "width", "height"],
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
            width: { type: "number", minimum: 0, maximum: 1 },
            height: { type: "number", minimum: 0, maximum: 1 },
          },
        },
        processed: {
          type: "boolean",
          description: "Set true after analysis is complete.",
        },
      },
    },
  },
  // ── Resume ────────────────────────────────────────────────────────────────
  {
    name: "get_resume",
    description:
      "Read the current resume. Returns the full markdown content and when it was last updated.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "update_resume",
    description:
      "Write or fully replace the resume. Always call get_resume first, edit the content, then write back the complete updated markdown. Overwrites whatever is currently stored.",
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: {
          type: "string",
          description: "Full resume in markdown format.",
        },
      },
    },
  },
  // ── Resume versions ────────────────────────────────────────────────────────
  {
    name: "list_resume_versions",
    description:
      "List all named resume variants (AI Engineer, Blockchain Engineer, Software Engineer) with their content, pdf_url, and timestamps.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_resume_version",
    description:
      "Read the markdown content for a specific resume variant. Call list_resume_versions first to see available variant names.",
    inputSchema: {
      type: "object",
      required: ["variant"],
      properties: {
        variant: {
          type: "string",
          description:
            "Exact variant name as stored in the database, e.g. 'AI Engineer'.",
        },
      },
    },
  },
  {
    name: "update_resume_version",
    description:
      "Write or replace the markdown content for a resume variant. If the variant does not exist yet it will be created. Call get_resume_version first, edit, then write back the full content.",
    inputSchema: {
      type: "object",
      required: ["variant", "content"],
      properties: {
        variant: {
          type: "string",
          description:
            "Variant name. Can be an existing one or a new name to create a new entry.",
        },
        content: {
          type: "string",
          description: "Full resume variant in markdown format.",
        },
      },
    },
  },
  {
    name: "patch_resume_section",
    description:
      "Replace a single named section within a resume variant without touching the rest of the document. The section is identified by its heading text (without # marks). If the section does not exist it will be appended.",
    inputSchema: {
      type: "object",
      required: ["variant", "section", "content"],
      properties: {
        variant: {
          type: "string",
          description: "Variant name, e.g. 'AI Engineer'.",
        },
        section: {
          type: "string",
          description:
            "Heading text of the section to replace, e.g. 'Experience' or 'Skills'. Case-insensitive.",
        },
        content: {
          type: "string",
          description:
            "New body content for the section (do not include the heading line).",
        },
      },
    },
  },
  {
    name: "append_resume_section",
    description: "Add a new section to the end of a resume variant.",
    inputSchema: {
      type: "object",
      required: ["variant", "heading", "content"],
      properties: {
        variant: {
          type: "string",
          description: "Variant name, e.g. 'AI Engineer'.",
        },
        heading: {
          type: "string",
          description: "Heading text for the new section.",
        },
        content: {
          type: "string",
          description: "Body content for the new section.",
        },
        level: {
          type: "integer",
          minimum: 1,
          maximum: 3,
          default: 2,
          description: "Heading level (1–3). Defaults to 2 (##).",
        },
      },
    },
  },
  // ── Hackathons ─────────────────────────────────────────────────────────────
  {
    name: "list_hackathons",
    description:
      "List all hackathon entries (including drafts). Returns id, name, date, location, awards, tags, published status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_hackathon",
    description: "Get a single hackathon by id, including full writeup.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the hackathon." },
      },
    },
  },
  {
    name: "create_hackathon",
    description:
      "Create a new hackathon entry. Awards is an array of objects with title and optional track.",
    inputSchema: {
      type: "object",
      required: ["name", "date", "slug"],
      properties: {
        name: { type: "string" },
        slug: {
          type: "string",
          description:
            "URL-safe identifier, e.g. 'hackomania-2026'. Must be unique.",
        },
        date: {
          type: "string",
          description: "ISO date string, e.g. '2024-03-15'.",
        },
        organizer: { type: "string" },
        location: { type: "string" },
        awards: {
          type: "array",
          description:
            'Awards won. Multiple allowed. e.g. [{"title":"Champion","track":"AI"},{"title":"Special Award"}]',
          items: {
            type: "object",
            required: ["title"],
            properties: {
              title: {
                type: "string",
                description:
                  "e.g. Champion, Second Place, Finalist, Special Award",
              },
              track: {
                type: "string",
                description: "Optional track or category name.",
              },
            },
          },
        },
        demo_url: {
          type: "string",
          description: "URL to demo video (YouTube supported) or live project.",
        },
        writeup: {
          type: "string",
          description: "Markdown writeup about the hackathon.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: 'e.g. ["ai","fintech"]',
        },
        thumbnail_url: { type: "string" },
        published: { type: "boolean", default: false },
        team: {
          type: "array",
          items: { type: "string" },
          description: "Team member names.",
        },
        tier: {
          type: "string",
          enum: ["coding", "non-coding"],
          default: "coding",
          description:
            "coding = built something; non-coding = case study / ideathon.",
        },
        project_name: {
          type: "string",
          description: "Name of the project built, e.g. 'EZBIZ'.",
        },
      },
    },
  },
  {
    name: "update_hackathon",
    description:
      "Update an existing hackathon entry. All fields are replaced — call get_hackathon first and carry over unchanged fields. Slug is preserved from the existing record if not provided.",
    inputSchema: {
      type: "object",
      required: ["id", "name", "date"],
      properties: {
        id: { type: "string", description: "UUID of the hackathon to update." },
        name: { type: "string" },
        date: { type: "string" },
        slug: {
          type: "string",
          description:
            "Optional. Only provide to rename the slug — existing slug is preserved otherwise.",
        },
        organizer: { type: "string" },
        location: { type: "string" },
        awards: {
          type: "array",
          items: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" },
              track: { type: "string" },
            },
          },
        },
        demo_url: { type: "string" },
        writeup: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        thumbnail_url: { type: "string" },
        published: { type: "boolean" },
        team: {
          type: "array",
          items: { type: "string" },
          description: "Team member names.",
        },
        tier: {
          type: "string",
          enum: ["coding", "non-coding"],
          description:
            "coding = built something; non-coding = case study / ideathon.",
        },
        project_name: {
          type: "string",
          description: "Name of the project built, e.g. 'EZBIZ'.",
        },
      },
    },
  },
  {
    name: "delete_hackathon",
    description: "Permanently delete a hackathon entry by id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  // ── Career ─────────────────────────────────────────────────────────────────
  {
    name: "list_career",
    description:
      "List all career entries (including unpublished). Returns id, slug, company, role, start_date, end_date, description, tags, published.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_career_by_slug",
    description:
      "Get all published career entries for a given slug (e.g. 'prudential' returns both internships).",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: {
          type: "string",
          description:
            "Company slug, e.g. 'prudential', 'asiaverify', 'setel'.",
        },
      },
    },
  },
  {
    name: "create_career",
    description:
      "Create a new career entry. Use the same slug for multiple roles at the same company.",
    inputSchema: {
      type: "object",
      required: ["slug", "company", "role", "start_date"],
      properties: {
        slug: {
          type: "string",
          description:
            "Company slug, e.g. 'prudential'. Multiple roles at same company share a slug.",
        },
        company: { type: "string" },
        role: { type: "string" },
        start_date: {
          type: "string",
          description: "ISO date, e.g. '2025-05-01'.",
        },
        end_date: {
          type: "string",
          description: "ISO date. Omit if current role.",
        },
        description: {
          type: "string",
          description: "Markdown bullet points of responsibilities.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['ai','internship']",
        },
        published: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "update_career",
    description:
      "Update an existing career entry. All fields are replaced — call list_career or get_career_by_slug first and carry over unchanged fields.",
    inputSchema: {
      type: "object",
      required: ["id", "slug", "company", "role", "start_date"],
      properties: {
        id: {
          type: "string",
          description: "UUID of the career entry to update.",
        },
        slug: { type: "string" },
        company: { type: "string" },
        role: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        published: { type: "boolean" },
      },
    },
  },
  {
    name: "delete_career",
    description: "Permanently delete a career entry by id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  // ── Hackathon content ──────────────────────────────────────────────────────
  {
    name: "get_hackathon_content",
    description:
      "Get the long-form content field for a hackathon by id. Returns id, slug, name, content.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the hackathon." },
      },
    },
  },
  {
    name: "patch_hackathon_content",
    description:
      "Set or replace the content field of a hackathon. Returns id, slug, updated: true.",
    inputSchema: {
      type: "object",
      required: ["id", "content"],
      properties: {
        id: { type: "string", description: "UUID of the hackathon." },
        content: {
          type: "string",
          description: "Markdown/MDX content for the hackathon detail page.",
        },
      },
    },
  },
  // ── Career content ─────────────────────────────────────────────────────────
  {
    name: "get_career_content",
    description:
      "Get the long-form content field for a career entry by id. Returns id, slug, role, content.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the career entry." },
      },
    },
  },
  {
    name: "patch_career_content",
    description:
      "Set or replace the content field of a career entry. Also bumps updated_at. Returns id, slug, updated: true.",
    inputSchema: {
      type: "object",
      required: ["id", "content"],
      properties: {
        id: { type: "string", description: "UUID of the career entry." },
        content: {
          type: "string",
          description: "Markdown/MDX content for the career detail page.",
        },
      },
    },
  },
  // ── Leadership ─────────────────────────────────────────────────────────────
  {
    name: "list_leadership",
    description:
      "List all leadership entries (including unpublished). Returns id, slug, organisation, body, role, start_date, end_date, description, tags, published, content.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_leadership",
    description: "Get a single leadership entry by id, including all fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the leadership entry." },
      },
    },
  },
  {
    name: "create_leadership",
    description: "Create a new leadership entry. Slug must be unique.",
    inputSchema: {
      type: "object",
      required: ["slug", "organisation", "role", "start_date"],
      properties: {
        slug: {
          type: "string",
          description:
            "URL-safe identifier, e.g. 'ntu-cca-president'. Must be unique.",
        },
        organisation: {
          type: "string",
          description:
            "Name of the organisation, e.g. 'NTU Chinese Cultural Association'.",
        },
        body: {
          type: "string",
          description:
            "Governing body or club name if different from organisation.",
        },
        role: {
          type: "string",
          description: "Role title, e.g. 'President', 'Vice-Chair'.",
        },
        start_date: {
          type: "string",
          description: "ISO date, e.g. '2024-08-01'.",
        },
        end_date: {
          type: "string",
          description: "ISO date. Omit if current role.",
        },
        description: {
          type: "string",
          description: "Markdown description of responsibilities and impact.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['leadership','student-life']",
        },
        published: { type: "boolean", default: false },
        content: {
          type: "string",
          description: "Long-form Markdown case study content.",
        },
      },
    },
  },
  {
    name: "update_leadership",
    description:
      "Update an existing leadership entry by id. All fields are replaced — call get_leadership first and carry over unchanged fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "UUID of the leadership entry to update.",
        },
        slug: { type: "string" },
        organisation: { type: "string" },
        body: { type: "string" },
        role: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        published: { type: "boolean" },
        content: { type: "string" },
      },
    },
  },
  {
    name: "delete_leadership",
    description: "Permanently delete a leadership entry by id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "get_leadership_content",
    description:
      "Get the long-form content field for a leadership entry by id. Returns id, slug, role, content.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the leadership entry." },
      },
    },
  },
  {
    name: "patch_leadership_content",
    description:
      "Set or replace the content field of a leadership entry. Also bumps updated_at. Returns id, slug, updated: true.",
    inputSchema: {
      type: "object",
      required: ["id", "content"],
      properties: {
        id: { type: "string", description: "UUID of the leadership entry." },
        content: {
          type: "string",
          description: "Markdown/MDX content for the leadership detail page.",
        },
      },
    },
  },
  // ── Mentorship ─────────────────────────────────────────────────────────────
  {
    name: "list_mentorship",
    description:
      "List all mentorship entries (including unpublished). Returns id, slug, programme, organiser, start_date, end_date, description, tags, published, content.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_mentorship",
    description: "Get a single mentorship entry by id, including all fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the mentorship entry." },
      },
    },
  },
  {
    name: "create_mentorship",
    description: "Create a new mentorship entry. Slug must be unique.",
    inputSchema: {
      type: "object",
      required: ["slug", "programme", "organiser", "start_date"],
      properties: {
        slug: {
          type: "string",
          description:
            "URL-safe identifier, e.g. 'google-mentorship-2024'. Must be unique.",
        },
        programme: {
          type: "string",
          description:
            "Name of the mentorship programme, e.g. 'Google Developer Student Club Mentorship'.",
        },
        organiser: {
          type: "string",
          description: "Organising institution or company, e.g. 'Google'.",
        },
        start_date: {
          type: "string",
          description: "ISO date, e.g. '2024-01-01'.",
        },
        end_date: { type: "string", description: "ISO date. Omit if ongoing." },
        description: {
          type: "string",
          description: "Markdown description of the mentorship and outcomes.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "e.g. ['mentorship','google','career']",
        },
        published: { type: "boolean", default: false },
        content: {
          type: "string",
          description: "Long-form Markdown case study content.",
        },
      },
    },
  },
  {
    name: "update_mentorship",
    description:
      "Update an existing mentorship entry by id. All fields are replaced — call get_mentorship first and carry over unchanged fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "UUID of the mentorship entry to update.",
        },
        slug: { type: "string" },
        programme: { type: "string" },
        organiser: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        published: { type: "boolean" },
        content: { type: "string" },
      },
    },
  },
  {
    name: "delete_mentorship",
    description: "Permanently delete a mentorship entry by id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "get_mentorship_content",
    description:
      "Get the long-form content field for a mentorship entry by id. Returns id, slug, programme, content.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the mentorship entry." },
      },
    },
  },
  {
    name: "patch_mentorship_content",
    description:
      "Set or replace the content field of a mentorship entry. Also bumps updated_at. Returns id, slug, updated: true.",
    inputSchema: {
      type: "object",
      required: ["id", "content"],
      properties: {
        id: { type: "string", description: "UUID of the mentorship entry." },
        content: {
          type: "string",
          description: "Markdown/MDX content for the mentorship detail page.",
        },
      },
    },
  },
  // ── Projects ───────────────────────────────────────────────────────────────
  {
    name: "list_projects",
    description:
      "List all projects (including unpublished). Returns all fields.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_project",
    description: "Get a single project by id, including all fields.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the project." },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a new project. Slug must be unique.",
    inputSchema: {
      type: "object",
      required: ["slug", "name"],
      properties: {
        slug: {
          type: "string",
          description:
            "URL-safe identifier, e.g. 'my-project'. Must be unique.",
        },
        name: { type: "string" },
        tagline: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["active", "shipped", "archived"] },
        type: {
          type: "string",
          description: "e.g. 'saas', 'personal', 'open-source'",
        },
        tech_stack: { type: "array", items: { type: "string" } },
        external_url: { type: "string" },
        published: { type: "boolean", default: false },
      },
    },
  },
  {
    name: "update_project",
    description:
      "Update an existing project by id. Only provided fields are changed. Fetches existing record to preserve slug/name if not provided.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the project to update." },
        slug: { type: "string" },
        name: { type: "string" },
        tagline: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["active", "shipped", "archived"] },
        type: { type: "string" },
        tech_stack: { type: "array", items: { type: "string" } },
        external_url: { type: "string" },
        published: { type: "boolean" },
      },
    },
  },
  {
    name: "patch_project_content",
    description:
      "Set or replace the content field of a project. Also bumps updated_at. Returns id, slug, updated: true.",
    inputSchema: {
      type: "object",
      required: ["id", "content"],
      properties: {
        id: { type: "string", description: "UUID of the project." },
        content: {
          type: "string",
          description: "Markdown/MDX content for the project detail page.",
        },
      },
    },
  },
  {
    name: "get_project_content",
    description:
      "Get the long-form content field for a project by id. Returns id, slug, name, content.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "UUID of the project." },
      },
    },
  },
];

async function checkAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  // This legacy tool catalogue has no per-tool scope enforcement. Only the
  // configured owner's full-scope, revocable tokens may use it. Narrow tokens
  // use /api/mcp/whatelz, which checks individual tool scopes.
  const credential = token ? await findActiveToken(token) : null;
  if (!credential || !credential.scopes.includes(OWNER_SCOPE)) {
    const url = new URL(req.url);
    const resourceMetadata = `${url.protocol}//${url.host}/api/mcp/function/.well-known/oauth-protected-resource`;
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" } },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer realm="whatelz-function-mcp", resource_metadata="${resourceMetadata}"`,
        },
      },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authFail = await checkAuth(req);
  if (authFail) return authFail;

  const body = await req.json().catch(() => null);
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32600, message: "Invalid Request" },
      },
      { status: 400 },
    );
  }

  const { id, method, params } = body;

  try {
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "whatelz-function", version: "1.0.0" },
        },
      });
    }

    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOL_SCHEMAS },
      });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;
      const handler = TOOLS[name];
      if (!handler) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool not found: ${name}` },
        });
      }
      const result = await handler(args ?? {});
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result ?? { ok: true }, null, 2),
            },
          ],
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Mcp-Session-Id",
    },
  });
}
