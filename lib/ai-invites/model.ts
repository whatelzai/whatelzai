import { z } from "zod";
export const locations = {
  SG: "Singapore",
  KL: "Kuala Lumpur",
  PG: "Penang",
} as const;
export type InviteLocation = keyof typeof locations;
export function matchesInviteLocation(
  contact: { locations?: InviteLocation[]; location?: InviteLocation | null },
  location: string,
) {
  const tags =
    contact.locations ?? (contact.location ? [contact.location] : []);
  return (
    location === "all" ||
    (location === "unset"
      ? tags.length === 0
      : tags.some((tag) => tag === location))
  );
}
export const relationships = {
  getting_to_know: "Getting to know",
  interested: "Interested",
  collaborator: "Potential collaboration",
  client: "Client",
} as const;
export const statuses = {
  active: "Active",
  paused: "Paused",
  do_not_contact: "Do not contact",
} as const;
export const channels = {
  whatsapp: "WhatsApp",
  in_person: "In person",
  email: "Email",
  phone: "Phone",
  other: "Other",
} as const;
export const responses = {
  awaiting_reply: "Awaiting reply",
  interested: "Interested",
  maybe: "Maybe",
  declined: "Declined",
  unavailable: "Couldn’t attend",
  no_reply: "No reply",
} as const;
export function singaporeToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
const day = z.iso.date();
const revision = z.number().int().min(0).max(2147483645);
export const contactInput = z
  .object({
    action: z.literal("contact"),
    id: z.uuid(),
    revision,
    name: z.string().trim().min(1).max(160),
    email: z
      .union([z.literal(""), z.email()])
      .transform((s) => s.toLowerCase())
      .nullable(),
    phone: z.string().trim().max(40),
    location: z.enum(["SG", "KL", "PG"]).nullable().optional(),
    locations: z
      .array(z.enum(["SG", "KL", "PG"]))
      .max(3)
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Choose each location once",
      )
      .optional(),
    how_met: z.string().trim().max(2000).optional(),
    interests: z.string().trim().max(2000),
    context: z.string().trim().max(4000),
    collaboration: z.string().trim().max(2000),
    next_step: z.string().trim().max(500),
    follow_up_on: day.nullable(),
    relationship: z.enum(
      Object.keys(relationships) as [
        keyof typeof relationships,
        ...(keyof typeof relationships)[],
      ],
    ),
    status: z.enum(["active", "paused", "do_not_contact"]),
    priority: z.boolean(),
  })
  .strict();
export const invitationInput = z
  .object({
    action: z.literal("invitation"),
    id: z.uuid(),
    contact_id: z.uuid(),
    revision,
    invited_on: day.nullable(),
    event_label: z.string().trim().max(200),
    channel: z
      .enum(["whatsapp", "in_person", "email", "phone", "other"])
      .nullable(),
    response: z.enum([
      "awaiting_reply",
      "interested",
      "maybe",
      "declined",
      "unavailable",
      "no_reply",
    ]),
    notes: z.string().trim().max(2000),
    voided: z.boolean(),
  })
  .strict();
export const inviteWriteInput = z.discriminatedUnion("action", [
  contactInput,
  invitationInput,
]);
export type Contact = Omit<
  z.infer<typeof contactInput>,
  "action" | "location" | "locations" | "how_met"
> & {
  how_met: string;
  location: InviteLocation | null;
  locations: InviteLocation[];
  event_person_id: string | null;
  created_at: string;
  updated_at: string;
};
export type Invitation = Omit<z.infer<typeof invitationInput>, "action"> & {
  created_at: string;
};
export type Attendance = {
  ref: string;
  title: string;
  date: string;
  source: "ticket" | "historical";
};
export type InviteContact = Contact & {
  attendance: Attendance[];
  invitations: Invitation[];
};
export type TicketEvidence = {
  id: string;
  event_key: string;
  person_id: string | null;
  email: string;
  status: string;
  checked_in_at: string | null;
};
export type HistoricalEvidence = {
  id: string;
  event_id: string;
  person_id: string | null;
  status: string;
  attendance_on: string;
};
export type AttendanceLink = {
  contact_id: string;
  ticket_id: string | null;
  historical_id: string | null;
};
export function attendanceFor(
  contact: Pick<Contact, "id" | "event_person_id" | "email">,
  links: AttendanceLink[],
  tickets: TicketEvidence[],
  history: HistoricalEvidence[],
  events: Record<string, { title: string; date: string; ref?: string }>,
) {
  const linked = links.filter((x) => x.contact_id === contact.id),
    attendance = new Map<string, Attendance>();
  for (const t of tickets) {
    if (t.status !== "confirmed" || !t.checked_in_at) continue;
    if (
      !linked.some((x) => x.ticket_id === t.id) &&
      !(contact.event_person_id && contact.event_person_id === t.person_id) &&
      !(contact.email && contact.email === t.email.trim().toLowerCase())
    )
      continue;
    const e = events[t.event_key] ?? {
      title: "Event details unavailable",
      date: "",
    };
    const ref = e.ref || t.event_key;
    attendance.set(ref, {
      ref,
      title: e.title,
      date: e.date,
      source: "ticket",
    });
  }
  for (const h of history) {
    if (h.status !== "checked_in") continue;
    if (
      !linked.some((x) => x.historical_id === h.id) &&
      !(contact.event_person_id && contact.event_person_id === h.person_id)
    )
      continue;
    const e = events[h.event_id] ?? {
      title: "Event details unavailable",
      date: h.attendance_on,
    };
    const ref = e.ref || h.event_id;
    attendance.set(ref, {
      ref,
      title: e.title,
      date: h.attendance_on,
      source: "historical",
    });
  }
  return [...attendance.values()].sort((a, b) => b.date.localeCompare(a.date));
}
export function inviteAdminHost(request: Request) {
  const h = new URL(request.url).hostname;
  return (
    h === "admin.whatelz.ai" ||
    (process.env.VERCEL_ENV === "preview" &&
      [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].some(
        (value) => !!value && h === value.toLowerCase(),
      )) ||
    (process.env.VERCEL_ENV !== "production" &&
      ["localhost", "admin.localhost", "127.0.0.1"].includes(h))
  );
}
