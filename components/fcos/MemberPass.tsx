import { WhatelzMark } from "@/components/brand/WhatelzMark";
export function MemberPass({
  name,
  email,
  persona,
  title,
}: {
  name: string;
  email: string;
  persona: string;
  title: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-weos-yellow p-6 text-weos-ink sm:p-8">
      <WhatelzMark className="pointer-events-none absolute -right-8 top-7 w-48 text-black/5" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-weos-ink/80">
            weOS · Whatelz OS
          </p>
          <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        </div>
        <span className="rounded-full border border-black/10 bg-white/30 px-3 py-1.5 text-xs font-bold uppercase">
          {persona}
        </span>
      </div>
      <div className="relative mt-9">
        <p className="text-lg font-semibold">{name}</p>
        <p className="mt-1 break-all text-xs text-weos-ink/80">{email}</p>
      </div>
    </section>
  );
}
