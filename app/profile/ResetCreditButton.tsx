"use client";
import { useMemberLanguage } from "@/components/fcos/MemberLanguage";
import { useActionState } from "react";
import { useResetCredit } from "./actions";

export function ResetCreditButton({
  credit,
  cycle,
}: {
  credit: string;
  cycle: string | null;
}) {
  const { t } = useMemberLanguage();
  const [state, action, pending] = useActionState(useResetCredit, {
    message: "",
  });
  return (
    <form action={action}>
      <input type="hidden" name="credit" value={credit} />
      <input type="hidden" name="cycle" value={cycle ?? ""} />
      <button
        disabled={pending}
        className="min-h-11 whitespace-nowrap rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold transition-colors hover:bg-zinc-200 disabled:opacity-50"
      >
        {t(pending ? "Resetting…" : "Use reset")}
      </button>
      <p role="status" className="mt-2 max-w-64 text-xs text-zinc-500">
        {t(state.message)}
      </p>
    </form>
  );
}
