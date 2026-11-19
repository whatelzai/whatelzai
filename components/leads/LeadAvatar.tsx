/* Private authenticated photo route: never expose storage paths or signed URLs. */
export function LeadAvatar({
  lead,
  large = false,
}: {
  lead: { id: string; name: string; has_photo?: boolean; updated_at?: string };
  large?: boolean;
}) {
  const initials = lead.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow-50 font-medium text-weos-ink ring-4 ring-white ${large ? "h-24 w-24 text-3xl" : "h-14 w-14 text-lg"}`}
    >
      {lead.has_photo /* eslint-disable-next-line @next/next/no-img-element */ ? (
        <img
          src={`/api/member/leads/${lead.id}/photo?v=${encodeURIComponent(lead.updated_at ?? "")}`}
          alt={lead.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
