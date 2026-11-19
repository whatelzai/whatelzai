export function AdminSectionLoading({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`${className} min-w-0 rounded-2xl border border-zinc-200 p-5`}
    >
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="admin-loading-dot" aria-hidden="true" />
        {label}
      </p>
      <div aria-hidden="true" className="admin-skeleton mt-5 space-y-3">
        <div className="h-4 w-2/3 rounded bg-zinc-100" />
        <div className="h-3 w-full rounded bg-zinc-100" />
        <div className="h-3 w-4/5 rounded bg-zinc-100" />
      </div>
    </div>
  );
}
