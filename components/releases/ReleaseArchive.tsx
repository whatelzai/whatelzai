import { memberTranslator } from "@/lib/fcos/language-server";
import { releasePosition } from "@/lib/releases/model";
import Link from "@/components/fcos/MemberLink";
import { loadReleaseArchive } from "@/lib/releases/server";
import { ReleaseList } from "./ReleaseList";
export async function ReleaseArchive({ before }: { before?: string }) {
  const { t } = await memberTranslator();
  let data;
  try {
    data = await loadReleaseArchive(before);
  } catch {
    data = null;
  }
  if (!data)
    return (
      <section className="rounded-3xl bg-white p-5">
        <h2 className="text-xl font-semibold">{t("Release notes")}</h2>
        <p role="status" className="mt-3 text-sm text-zinc-500">
          {t("Updates couldn’t be loaded. Please try again.")}
        </p>
        <Link
          href="/profile?tab=releases"
          className="mt-3 inline-flex min-h-11 items-center text-sm underline"
        >
          {t("Try again")}
        </Link>
      </section>
    );

  const { releases, next } = data;
  return (
    <section
      className="rounded-3xl bg-white p-5 sm:p-7"
      aria-labelledby="release-archive-title"
    >
      <h2 id="release-archive-title" className="mb-5 text-xl font-semibold">
        {t("Release notes")}
      </h2>
      {releases.length ? (
        <ReleaseList releases={releases} />
      ) : (
        <p className="text-sm text-zinc-500">{t("No release notes yet.")}</p>
      )}
      {next || before ? (
        <nav
          aria-label="Release history pages"
          className="mt-6 flex min-h-11 items-center justify-between gap-4 border-t border-zinc-100 pt-4 text-sm font-medium"
        >
          <Link href="/profile?tab=releases">{t("Latest releases")}</Link>
          {next ? (
            <Link
              href={`/profile?tab=releases&before=${encodeURIComponent(releasePosition(next))}`}
            >
              {t("Older releases →")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
