export function AdminLoading({
  title = "Loading workspace…",
}: {
  title?: string;
}) {
  return (
    <div
      data-admin-loading=""
      className="space-y-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
        <span className="admin-loading-dot" aria-hidden="true" />
        {title}
      </div>
      <div aria-hidden="true" className="admin-skeleton space-y-8">
        <div className="space-y-3 border-b border-zinc-200 pb-6">
          <div className="h-3 w-28 rounded bg-yellow-100" />
          <div className="h-9 w-2/3 max-w-md rounded-lg bg-zinc-100" />
          <div className="h-4 w-4/5 max-w-xl rounded bg-zinc-100" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          {[0, 1].map((column) => (
            <div key={column} className="min-w-0 space-y-6">
              {[0, 1].map((card) => (
                <div
                  key={card}
                  className="space-y-5 rounded-2xl border border-zinc-200 p-5 sm:p-6"
                >
                  <div className="h-5 w-1/2 rounded bg-zinc-100" />
                  <div className="space-y-3">
                    <div className="h-3 w-full rounded bg-zinc-100" />
                    <div className="h-3 w-5/6 rounded bg-zinc-100" />
                    <div className="h-3 w-2/3 rounded bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
