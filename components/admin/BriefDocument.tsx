import { AdminText } from "./AdminPreferences";
import { BriefMarkdown } from "./BriefMarkdown";
import { readingSections } from "@/lib/admin-reading";
export function BriefDocument({ body }: { body: string }) {
  const sections = readingSections(body);
  if (sections.length < 2) return <BriefMarkdown body={body} />;
  const first = sections.find((section) =>
    /^(first action|next (action|step)|what moved forward|tomorrow.{0,12}handoff)$/i.test(
      section.title.trim(),
    ),
  );
  return (
    <div className="admin-document space-y-5">
      {first && (
        <section className="admin-next-action border-l-2 border-yellow-400 pl-5">
          <p className="mb-2 text-xs text-zinc-500">
            <AdminText text="From your saved entry · proposals remain proposals" />
          </p>
          <h3 className="mb-3 text-lg font-semibold">{first.title}</h3>
          <BriefMarkdown body={first.body} />
        </section>
      )}
      <div className="divide-y divide-zinc-200 border-y border-zinc-200">
        {sections.map((section, index) => (
          <details key={index} className="py-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
              {section.title || <AdminText text="Entry notes" />}
            </summary>
            <div className="pb-4 pt-3">
              <BriefMarkdown body={section.body} />
            </div>
          </details>
        ))}
      </div>
      <details className="text-xs text-zinc-500">
        <summary className="min-h-11 cursor-pointer py-3">
          <AdminText text="Read complete entry in original order" />
        </summary>
        <div className="mt-3">
          <BriefMarkdown body={body} />
        </div>
      </details>
    </div>
  );
}
