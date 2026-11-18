import { loadRhythms } from "@/lib/admin-rhythm/server";
import { RhythmRail } from "./RhythmRail";
export async function RhythmPanel({ owner }: { owner: string }) {
  const { snapshots } = await loadRhythms(owner);
  return (
    <RhythmRail
      initial={snapshots.map(({ kind, entry_key, version, read_version }) => ({
        kind,
        entry_key,
        version,
        read_version,
      }))}
    />
  );
}
