"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreditMember } from "@/lib/admin-users/credits";
import { money } from "@/lib/member-ai/model";
import { resetCredits } from "./credit-actions";
export function CreditControls({ members }: { members: CreditMember[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "selected">("selected");
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState<"full" | "half">("full");
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const targets =
    scope === "all"
      ? members
      : members.filter((member) => selected.includes(member.userId));
  const dollars = amount === "full" ? 1 : 0.5;
  async function apply() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await resetCredits({
        action: "reset",
        scope,
        amount,
        targets: targets.map((member) => ({
          userId: member.userId,
          cycle: member.cycle,
        })),
      });
      setNotice(result.error ?? result.success ?? "");
      setConfirm(false);
      if (result.success) setSelected([]);
      router.refresh();
    } catch {
      setNotice(
        "The reset result could not be confirmed. Refresh balances before trying again.",
      );
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-5 rounded-2xl border border-zinc-200 p-5 sm:p-6"
      aria-labelledby="credits-heading"
    >
      <div>
        <h2 id="credits-heading" className="text-xl font-semibold">
          AI credits
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Every activated member can use Chat with US$1 per seven days. Restore
          a full or half allowance for selected members or everyone activated.
        </p>
      </div>
      <fieldset disabled={busy || confirm} className="space-y-4">
        <legend className="text-sm font-medium">Who receives the reset?</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {(["selected", "all"] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="reset-scope"
                value={value}
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {value === "all"
                ? `All activated (${members.length})`
                : "Selected members"}
            </label>
          ))}
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {members.map((member) => (
            <label
              key={member.userId}
              className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 text-sm"
            >
              <input
                className="mt-1"
                type="checkbox"
                aria-label={`Select ${member.name}`}
                checked={scope === "all" || selected.includes(member.userId)}
                disabled={scope === "all"}
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked
                      ? [...previous, member.userId]
                      : previous.filter((id) => id !== member.userId),
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{member.name}</span>
                <span className="block break-all text-xs text-zinc-500">
                  {member.email}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {money(
                    Math.max(
                      0,
                      member.allowance - member.spent - member.reserved,
                    ),
                  )}{" "}
                  left · {money(member.spent, 6)} used ·{" "}
                  {money(member.reserved, 6)} reserved
                </span>
              </span>
            </label>
          ))}
        </div>
        <label className="block text-sm font-medium">
          Reset amount
          <select
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value as "full" | "half")
            }
            className="mt-2 block w-full rounded-xl border border-zinc-200 p-3"
          >
            <option value="full">Full reset · 100% · US$1 per person</option>
            <option value="half">Half reset · 50% · US$0.50 per person</option>
          </select>
        </label>
      </fieldset>
      <p className="text-xs leading-6 text-zinc-500">
        A reset replaces the current remaining balance with a fresh allowance;
        it does not add to unused credit. Previous usage and in-progress replies
        stay recorded. The next full allowance renews seven days after the
        reset.
      </p>
      {confirm ? (
        <div
          className="rounded-xl bg-yellow-50 p-4 text-sm"
          role="region"
          aria-label="Confirm credit reset"
        >
          <p className="font-semibold">
            Restore {money(dollars * 1000000)} each for {targets.length}{" "}
            {targets.length === 1 ? "member" : "members"}?
          </p>
          <p className="mt-2 break-words">
            {targets.map((member) => member.name).join(", ")}
          </p>
          <p className="mt-2">
            Total fresh allowance: {money(dollars * 1000000 * targets.length)}.
            This permits additional API usage.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={apply}
              className="rounded-lg bg-zinc-950 px-4 py-3 text-white disabled:opacity-50"
            >
              {busy ? "Resetting…" : "Confirm reset"}
            </button>
            <button
              disabled={busy}
              onClick={() => setConfirm(false)}
              className="rounded-lg border px-4 py-3"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          disabled={!targets.length || busy}
          onClick={() => {
            setNotice("");
            setConfirm(true);
          }}
          className="rounded-xl bg-yellow-300 px-5 py-3 text-sm font-semibold disabled:opacity-40"
        >
          Review {amount} reset · {targets.length} selected
        </button>
      )}
      <p role="status" className="text-sm">
        {notice}
      </p>
    </section>
  );
}
