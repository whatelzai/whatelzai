import { notFound } from "next/navigation";
import { dailyOwner } from "@/lib/daily/server";
import { loadRhythms } from "@/lib/admin-rhythm/server";
import {
  rhythmKinds,
  rhythmTitle,
  type RhythmKind,
} from "@/lib/admin-rhythm/model";
import { BriefDocument } from "@/components/admin/BriefDocument";
import { AdminText } from "@/components/admin/AdminPreferences";
import { RhythmReadReceipt } from "@/components/admin/RhythmReadReceipt";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const owner = await dailyOwner(),
    { kind } = await params;
  if (!rhythmKinds.includes(kind as RhythmKind)) notFound();
  const result = await loadRhythms(owner),
    snapshot = result.snapshots.find((s) => s.kind === kind);
  return (
    <article className="admin-ledger max-w-3xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">
          <AdminText text={rhythmTitle(kind as RhythmKind)} />
        </h1>
        {snapshot && (
          <p className="mt-2 text-sm text-zinc-500">{snapshot.entry_key}</p>
        )}
      </header>
      {!result.fresh && (
        <p className="text-xs text-zinc-500">
          <AdminText text="Showing the latest saved copy." />{" "}
          <Link
            className="underline"
            href={adminUrl("/admin/today/connections")}
          >
            <AdminText text="Reconnect EMDEE" />
          </Link>
        </p>
      )}
      {snapshot ? (
        <>
          <RhythmReadReceipt kind={snapshot.kind} version={snapshot.version} />
          <BriefDocument body={snapshot.body} />
        </>
      ) : (
        <p>
          <AdminText text="No saved entry yet." />
        </p>
      )}
    </article>
  );
}
