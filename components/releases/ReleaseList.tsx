import { releaseDate, type ReleaseNote } from "@/lib/releases/model";
export function ReleaseList({ releases }: { releases: ReleaseNote[] }) {
  return (
    <ol className="divide-y divide-zinc-100">
      {releases.map((release) => (
        <li key={release.id} className="py-5 first:pt-0 last:pb-0">
          <article>
            <time
              dateTime={release.published_at}
              className="text-xs text-zinc-500"
            >
              {releaseDate(release.published_at)}
            </time>
            <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-950">
              {release.title}
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-zinc-600">
              {release.body
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
            </ul>
          </article>
        </li>
      ))}
    </ol>
  );
}
