import { AppHeader } from "@/components/fcos/AppHeader";
import { LeadAvatar } from "@/components/leads/LeadAvatar";
import { loadSharedLeads } from "@/lib/leads/sharing";
import { Search } from "lucide-react";
import Link from "@/components/fcos/MemberLink";
import { LeadCard } from "@/components/leads/LeadCard";
import { groupPlans } from "@/lib/leads/plans";
import { redirect } from "next/navigation";
import { ensureUserRow } from "@/lib/users";
import { loadLeads } from "@/lib/leads/server";
import { todayUtc8 } from "@/lib/leads/model";
import { MemberNav } from "@/components/culture/MemberNav";
import { NewLead } from "@/components/leads/LeadForms";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Baobeis",
  robots: { index: false, follow: false },
};
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    region?: string;
    stage?: string;
    page?: string;
  }>;
}) {
  if (!(await ensureUserRow())) redirect("/sign-in?redirect_url=/leads");
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 160);
  const [data, shared] = await Promise.all([
    loadLeads({ q, page: query.page }),
    loadSharedLeads(q),
  ]);
  const today = todayUtc8();
  const plans = groupPlans(data.upcoming);
  const cards = (leads: typeof data.leads) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          plans={plans.filter((plan) => plan.leadId === lead.id)}
          today={today}
        />
      ))}
    </div>
  );
  const pageLink = (page: number) =>
    `/leads?${new URLSearchParams({ q: data.q, page: String(page) })}`;
  return (
    <main className="fcos-tab-page fcos-lead-controls mx-auto max-w-5xl space-y-6 px-5 py-10 sm:px-8">
      <AppHeader title="Baobeis" end={<NewLead />} />
      <MemberNav current="/leads" compact persistent />
      <form
        role="search"
        className="fcos-baobei-search flex items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50/80 px-4"
      >
        <Search
          size={19}
          className="shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          aria-label="Search baobeis"
          placeholder="Search baobeis…"
          defaultValue={data.q}
          enterKeyHint="search"
          className="min-w-0 flex-1 py-3 text-base placeholder:text-zinc-400"
        />
      </form>
      {data.plansUnavailable && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          Upcoming plans could not be loaded. Open a profile to check its
          history or reload.
        </p>
      )}
      {cards(data.leads)}
      {!data.leads.length && !shared.length && (
        <p className="py-8 text-center text-sm text-zinc-500">
          {data.q ? "No baobeis found." : "Add your first baobei with +."}
        </p>
      )}
      {shared.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">Team Baobeis</h2>
          <p className="mt-3 text-xs text-zinc-500">
            Team-visible profiles · read only. Showing up to 50 profiles from
            the first 500 permitted leads.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {shared.map(({ photo_path, ...lead }) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center gap-4 rounded-2xl bg-zinc-50 p-4"
              >
                <LeadAvatar
                  lead={{ ...lead, has_photo: Boolean(photo_path) }}
                />
                <div>
                  <h3 className="font-semibold">{lead.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {lead.region} · {lead.stage}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <nav aria-label="Baobeis pages" className="flex gap-4">
        {data.page > 1 && (
          <Link href={pageLink(data.page - 1)}>← Previous</Link>
        )}
        {data.page * 50 < data.count && (
          <Link href={pageLink(data.page + 1)}>Next →</Link>
        )}
      </nav>
    </main>
  );
}
