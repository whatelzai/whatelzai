import { AppHeader } from "./AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";

export function LoadingRows({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4 py-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-zinc-100 p-5"
          >
            <div className="h-4 w-2/5 rounded bg-zinc-100" />
            <div className="h-3 w-3/4 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Data-free shell: never queries private data, auth, notes or model services. */
export function RouteLoading({
  title,
  current,
}: {
  title: string;
  current: string;
}) {
  return (
    <main className="fcos-tab-page mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-8">
      <AppHeader title={title} chat={current === "/assistant"} />
      <MemberNav
        current={current}
        compact
        persistent
        accent={current === "/profile" ? "orange" : "yellow"}
      />
      <LoadingRows label={`Loading ${title.toLowerCase()}…`} />
    </main>
  );
}
