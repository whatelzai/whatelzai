import { isOwnerUser } from "@/lib/admin-policy";
import Link from "@/components/admin/AdminLink";
import { ensureUserRow } from "@/lib/users";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  personas,
  personaDescriptions,
  isPersona,
} from "@/lib/community-calendar/personas";
import { saveCalendarPersona } from "./actions";
export const dynamic = "force-dynamic";
export default async function CalendarAccess({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const actor = await ensureUserRow();
  if (!actor || !isOwnerUser(actor)) notFound();
  const [users, memberships] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id,name,email")
      .order("name")
      .range(0, 999),
    supabaseAdmin
      .from("community_calendar_memberships")
      .select("user_id,persona")
      .range(0, 999),
  ]);
  if (users.error || memberships.error)
    throw new Error("Calendar access could not be loaded");
  const assigned = new Map(
    (memberships.data ?? []).map((m) => [m.user_id, m.persona]),
  );
  const result = (await searchParams).result;
  const messages: Record<string, string> = {
    saved: "Persona saved.",
    founder: "Confirm the Oracle account belongs to Dick Lim.",
    oracle:
      "Oracle is already assigned. Change that assignment before selecting another account.",
    invalid: "Choose a valid account and persona.",
    failed: "The assignment could not be saved. Please try again.",
  };
  return (
    <div className="space-y-8">
      <Link href="/admin/network-marketing" className="text-sm underline">
        ← Network Marketing
      </Link>
      <header>
        <h1 className="text-3xl font-semibold">Founder’s Club access</h1>
        <p className="mt-3 text-zinc-600">
          Assign a persona only after confirming the person’s membership. New
          accounts start as Guests. A name, saved email or ABO number does not
          grant access.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {personas.map((p) => (
          <div key={p} className="rounded-xl border p-4">
            <h2 className="font-semibold">{p === "Guest" ? "Guests" : p}</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {personaDescriptions[p]}
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-600">
        Admin review is separate from the Oracle persona. Only Dick Lim’s
        verified login account should be assigned Oracle; there can be only one.
      </p>
      {result && messages[result] ? (
        <p role="status" className="rounded-lg bg-yellow-50 p-4">
          {messages[result]}
        </p>
      ) : null}
      <div className="space-y-4">
        {(users.data ?? []).map((u) => {
          const saved = assigned.get(u.id),
            persona = isPersona(saved) ? saved : "Guest";
          return (
            <form
              action={saveCalendarPersona}
              key={u.id}
              className="rounded-xl border p-5"
            >
              <h2 className="font-semibold">{u.name || "Unnamed account"}</h2>
              <p className="mt-1 break-all text-sm text-zinc-500">{u.email}</p>
              <input type="hidden" name="user_id" value={u.id} />
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="text-sm">
                  Persona
                  <select
                    name="persona"
                    defaultValue={persona}
                    className="mt-2 block rounded-lg border bg-white p-3"
                  >
                    {personas.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded-lg bg-zinc-900 px-5 py-3 text-sm text-white">
                  Save persona
                </button>
              </div>
              <label className="mt-4 flex gap-2 text-sm text-zinc-600">
                <input type="checkbox" name="founder_confirmed" />
                If choosing Oracle, I confirm this is Dick Lim’s account.
              </label>
            </form>
          );
        })}
      </div>
    </div>
  );
}
