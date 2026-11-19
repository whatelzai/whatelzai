import { dailyOwner } from "@/lib/daily/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { modelSchema, money } from "@/lib/member-ai/model";
import { MemberControls } from "./MemberControls";
export async function AIAllowances() {
  await dailyOwner();
  const [users, access, cycles, links, events] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id,name,email,supabase_auth_user_id")
      .not("supabase_auth_user_id", "is", null)
      .order("name")
      .limit(200),
    supabaseAdmin.from("member_ai_access").select("*"),
    supabaseAdmin
      .from("member_ai_cycles")
      .select(
        "id,user_id,spent_micro,reserved_micro,allowance_micro,started_at,ends_at,reason",
      )
      .order("started_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("member_emdee_links")
      .select("user_id,subject,vault_id,handle"),
    supabaseAdmin
      .from("member_ai_admin_events")
      .select("user_id,action,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if ([users, access, cycles, links, events].some((result) => result.error))
    return (
      <p role="status" className="text-sm text-zinc-500">
        AI allowances are unavailable. The user directory above is still
        current.
      </p>
    );
  const loadedAt = new Date().getTime();
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        Owner controls
      </p>
      <h1 className="mt-2 text-3xl font-semibold">AI allowances & usage</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-600">
        Every tree-activated member can use AI Chat. Each person receives US$1
        per seven-day window. The reset timestamp is shown in Singapore time.
        Full and half resets are managed above and keep previous usage. API chat
        runs on app.whatelz.ai; personal Daily remains on ChatGPT. Registered
        accounts shown: up to 200.
      </p>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {users.data?.map((user) => {
          const member = access.data?.find((a) => a.user_id === user.id);
          const history =
            cycles.data?.filter((c) => c.user_id === user.id) ?? [];
          const cycle = history.find((c) => c.id === member?.current_cycle_id);
          const current =
            cycle && Date.parse(cycle.ends_at) > loadedAt ? cycle : null;
          const link = links.data?.find((l) => l.user_id === user.id);
          return (
            <article key={user.id} className="min-w-0 rounded-2xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {user.name || "Registered member"}
                </h2>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${member?.active ? "bg-yellow-100" : "bg-zinc-100"}`}
                >
                  {member?.active ? "AI enabled" : "AI paused"}
                </span>
              </div>
              <p className="mt-1 break-all text-sm text-zinc-600">
                {user.email}
              </p>
              <details className="mt-2 text-xs text-zinc-500">
                <summary>Permanent identity</summary>
                <p className="mt-2 break-all">Whatelzai: {user.id}</p>
                <p className="mt-1 break-all">
                  EMDEE:{" "}
                  {link
                    ? `${link.subject} · vault ${link.vault_id}`
                    : "Awaiting verified member connection"}
                </p>
              </details>
              <p className="mt-4 text-sm">
                <strong>{money(Number(current?.spent_micro ?? 0), 6)}</strong>{" "}
                used · {money(Number(current?.reserved_micro ?? 0), 6)} reserved
                this allowance
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Cap: {money(Number(current?.allowance_micro ?? 1000000))} ·{" "}
                {current
                  ? `Renews ${new Date(current.ends_at).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })}`
                  : "Fresh allowance begins on first message"}
              </p>
              <MemberControls
                userId={user.id}
                model={modelSchema.parse(member?.model ?? "gpt-6-luna")}
              />
              {!!history.length && (
                <details className="mt-3 text-xs">
                  <summary>
                    Allowance history (latest 300 across members)
                  </summary>
                  <ul className="mt-2 space-y-2">
                    {history.map((c) => (
                      <li key={c.id}>
                        {new Date(c.started_at).toLocaleString("en-SG", {
                          timeZone: "Asia/Singapore",
                        })}{" "}
                        · {c.reason} · {money(Number(c.spent_micro), 6)} used /{" "}
                        {money(Number(c.reserved_micro), 6)} reserved
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
      <details className="mt-8 text-sm">
        <summary>Recent access changes and resets</summary>
        <ul className="mt-3 space-y-2">
          {events.data?.map((event, i) => (
            <li key={i}>
              {users.data?.find((u) => u.id === event.user_id)?.name ??
                event.user_id}{" "}
              · {event.action} ·{" "}
              {new Date(event.created_at).toLocaleString("en-SG", {
                timeZone: "Asia/Singapore",
              })}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
