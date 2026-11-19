"use client";
import { useState } from "react";
import { finishCommitment } from "./actions";
export function CompleteTask({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="mt-2 rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await finishCommitment({ id, revision });
            setNotice(result.error ?? result.success ?? "");
          } catch {
            setNotice("Could not update. Reload and try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Mark complete
      </button>
      <p role="status" className="text-xs">
        {notice}
      </p>
    </>
  );
}
