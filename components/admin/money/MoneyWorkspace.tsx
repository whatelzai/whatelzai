"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import {
  currencies,
  money,
  singaporeDay,
  type Currency,
  type Rule,
  type MoneyData,
} from "@/lib/money/model";
const EntryForm = dynamic(() => import("./EntryForm"), {
  ssr: false,
  loading: () => <p role="status">Opening entry form…</p>,
});
export default function MoneyWorkspace({
  initialEntry = false,
  initialView = "jars",
}: {
  initialEntry?: boolean;
  initialView?: string;
}) {
  const [month, setMonth] = useState(() => singaporeDay().slice(0, 7));
  const [currency, setCurrency] = useState<Currency>("SGD");
  const [view, setView] = useState(initialView);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<{
    mode: "entry" | "recurring" | "paid";
    rule?: Rule;
  } | null>(initialEntry ? { mode: "entry" } : null);
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const load = useCallback(async () => {
    const request = ++serial.current;
    try {
      const r = await fetch(`/api/admin/money?month=${month}&page=${page}`, {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (request === serial.current) {
        setData(d);
        setError("");
      }
    } catch (e) {
      if (request === serial.current)
        setError(
          e instanceof Error ? e.message : "Could not load money records.",
        );
    } finally {
      if (request === serial.current) setLoading(false);
    }
  }, [month, page]);
  useEffect(() => {
    const counter = serial;
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
      counter.current++;
    };
  }, [load]);
  async function action(command: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice("Saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const activity =
    data?.summary.activity.filter((g) => g.currency === currency) || [];
  const sum = (kind: string, jar?: string) =>
    activity
      .filter((g) => g.kind === kind && (!jar || g.jar === jar))
      .reduce((n, g) => n + Number(g.total), 0);
  const spent = sum("expense") - sum("refund");
  const today = singaporeDay();
  const activeRules = data?.rules.filter((r) => r.active) || [];
  const due = activeRules.filter((r) => r.next_due <= today);
  return (
    <section
      className="money-workspace"
      data-focusing={form ? "true" : undefined}
    >
      <Link href={adminUrl("/admin/personal")} className="money-back">
        Personal
      </Link>
      <header className="money-heading">
        <div>
          <h1>Money</h1>
          <p>Every dollar. Every ringgit.</p>
        </div>
        <button
          type="button"
          className="money-primary"
          onClick={() => setForm({ mode: "entry" })}
        >
          Add entry
        </button>
      </header>
      <div className="money-toolbar">
        <label>
          Month
          <input
            type="month"
            value={month}
            min="2000-01"
            max="2099-12"
            onChange={(e) => {
              if (e.target.value) {
                setLoading(true);
                setMonth(e.target.value);
                setPage(0);
                setData(null);
              }
            }}
          />
        </label>
        <label>
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div role="status" className="money-status">
        {loading ? "Reading saved records…" : notice}
      </div>
      {error ? (
        <p role="alert" className="money-error">
          {error}{" "}
          <button
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Retry
          </button>
        </p>
      ) : null}
      <div className="money-figures" aria-busy={loading}>
        <div>
          <p>Recorded spending · {currency}</p>
          <strong>{data ? money(spent, currency) : "—"}</strong>
          <small>Expenses less refunds · selected month</small>
        </div>
        <div>
          <p>Recorded income</p>
          <strong>{data ? money(sum("income"), currency) : "—"}</strong>
          <small>Gross receipts · excludes opening funds</small>
        </div>
      </div>
      <nav aria-label="Money views" className="money-tabs">
        {[
          ["jars", "Jars"],
          ["activity", "Activity"],
          ["recurring", "Recurring"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={view === key ? "page" : undefined}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === "jars" ? (
        <div className="money-columns">
          <section>
            <h2>Six jars</h2>
            <p className="money-note">
              Monthly plan:{" "}
              {data?.plan
                ? `${money(data.plan.jar_base_minor, "SGD")} after ${money(data.plan.tax_minor, "SGD")} tax provision.`
                : loading
                  ? "Reading plan…"
                  : "Not configured."}{" "}
              Allocations are targets, not recorded deposits.
            </p>
            <div className="money-jar-head">
              <span>Jar / planned account</span>
              <span>Spent {currency}</span>
              <span>Plan SGD</span>
            </div>
            {data?.plan?.jar_plan.map((p) => (
              <div className="money-jar-row" key={p.jar}>
                <div>
                  <strong>{p.jar}</strong>
                  <small>
                    {p.percent}% · {p.account}
                    {p.planned ? " · planned" : ""}
                  </small>
                </div>
                <span>
                  {data
                    ? money(
                        sum("expense", p.jar) - sum("refund", p.jar),
                        currency,
                      )
                    : "—"}
                </span>
                <span>{money(p.cents, "SGD")}</span>
              </div>
            ))}
            <p className="money-note">
              Business costs, tax and unallocated money are tracked separately
              in Activity. MYR and USD spending is not compared against an SGD
              budget.
            </p>
            <details>
              <summary>Recorded jar funds · through {month}</summary>
              <p className="money-note">
                Only entered opening funds and movements. These are not verified
                bank balances.
              </p>
              {data?.summary.balances
                .filter((b) => b.currency === currency)
                .map((b) => (
                  <div className="money-pair" key={b.jar}>
                    <span>{b.jar}</span>
                    <span>{money(Number(b.total), currency)}</span>
                  </div>
                ))}
              {data &&
              !data.summary.balances.some((b) => b.currency === currency) ? (
                <p>No funds entered for {currency}.</p>
              ) : null}
            </details>
          </section>
          <aside>
            <h2>Next bills</h2>
            {data && !activeRules.length ? (
              <p className="money-empty">No recurring expenses yet.</p>
            ) : null}
            {activeRules.slice(0, 4).map((r) => (
              <div key={r.id} className="money-bill">
                <div>
                  <strong>{r.name}</strong>
                  <small>
                    {r.next_due} · {r.cadence}
                    {r.next_due < today ? " · Overdue" : ""}
                  </small>
                </div>
                <span>{money(r.amount_minor, r.currency)}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm({ mode: "recurring" })}
            >
              Add recurring expense
            </button>
            {due.length ? (
              <p className="money-note">
                {due.length} bill{due.length === 1 ? "" : "s"} due or overdue.
                Record payments in Recurring.
              </p>
            ) : null}
            <details>
              <summary>Account plan</summary>
              <p>
                {data?.plan?.income_account || "Your income account"} receives
                income and holds the accumulating tax provision. Planned
                accounts are not confirmed open.
              </p>
              <p>
                LTSS reserve target:{" "}
                {data?.plan
                  ? money(data.plan.reserve_target_minor, "SGD")
                  : loading
                    ? "Reading plan…"
                    : "Not configured"}
                . Opening funds have not been imported.
              </p>
              <p>No bank connections or automatic transfers are enabled.</p>
            </details>
          </aside>
        </div>
      ) : null}
      {view === "activity" ? (
        <section>
          <div className="money-section-title">
            <h2>Activity · {month}</h2>
            <a href={`/api/admin/money?month=${month}&export=csv`}>
              Export month CSV
            </a>
          </div>
          <p className="money-note">
            All currencies · {data?.total ?? 0} entries. Voided entries remain
            in history. To correct an entry, void it and add the replacement.
          </p>
          {data && !data.entries.length ? (
            <p className="money-empty">
              No entries this month. Add your first expense when you spend.
            </p>
          ) : null}
          <div className="money-history">
            {data?.entries.map((e) => (
              <div className="money-entry" key={e.id}>
                <div>
                  <strong>{e.description}</strong>
                  <small>
                    {e.occurred_on} · {e.kind} · {e.jar} · {e.account}
                  </small>
                  <small>
                    {e.category} · {e.scope.replaceAll("_", " ")}
                    {e.voided ? " · Voided" : ""}
                  </small>
                  {e.kind === "transfer" ? (
                    <small>
                      → {e.to_account} / {e.to_jar} ·{" "}
                      {money(e.to_amount_minor!, e.to_currency!)}
                    </small>
                  ) : null}
                </div>
                <div className="money-entry-amount">
                  <span>{money(e.amount_minor, e.currency)}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        e.voided ||
                        window.confirm(
                          `Void “${e.description}”? It stays in history and can be restored. Recurring dates do not roll back.`,
                        )
                      )
                        void action({
                          action: "void",
                          id: e.id,
                          voided: !e.voided,
                        });
                    }}
                  >
                    {e.voided ? "Restore" : "Void"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="money-pagination">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
            >
              Previous
            </button>
            <span>
              {data?.total
                ? `${page * 50 + 1}–${Math.min(page * 50 + 50, data.total)} of ${data.total}`
                : "0 entries"}
            </span>
            <button
              type="button"
              disabled={loading || !data || (page + 1) * 50 >= data.total}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              Next
            </button>
          </div>
        </section>
      ) : null}
      {view === "recurring" ? (
        <section>
          <div className="money-section-title">
            <h2>Recurring expenses</h2>
            <button
              type="button"
              onClick={() => setForm({ mode: "recurring" })}
            >
              Add recurring expense
            </button>
          </div>
          <p className="money-note">
            Planned bills in their original currencies. Record each payment once
            it happens. To change a plan, pause it and add its replacement.
            Pausing tracking does not cancel the merchant subscription.
          </p>
          {data && !data.rules.length ? (
            <p className="money-empty">
              Add subscriptions, rent, utilities and other regular commitments.
            </p>
          ) : null}
          {data?.rules.map((r) => (
            <div className="money-recurring" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <small>
                  {r.currency} · {r.account} · {r.jar} · {r.cadence}
                </small>
                <small>
                  {r.active ? `Next ${r.next_due}` : "Paused"} ·{" "}
                  {r.decision === "cancel" ? "Plan to cancel" : r.decision}
                  {r.active && r.next_due < today ? " · Overdue" : ""}
                </small>
                {r.notes ? <small>{r.notes}</small> : null}
              </div>
              <div className="money-entry-amount">
                <span>{money(r.amount_minor, r.currency)}</span>
                <div>
                  {r.active ? (
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "paid", rule: r })}
                    >
                      Record paid
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void action({
                        action: "recurring_status",
                        id: r.id,
                        active: !r.active,
                      })
                    }
                  >
                    {r.active ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {form ? (
        <EntryForm
          mode={form.mode}
          rule={form.rule}
          onClose={() => setForm(null)}
          onSaved={(savedDay) => {
            setForm(null);
            setNotice("Saved to your private ledger.");
            setLoading(true);
            if (savedDay && savedDay.slice(0, 7) !== month) {
              setMonth(savedDay.slice(0, 7));
              setPage(0);
              setData(null);
            } else {
              void load();
            }
          }}
        />
      ) : null}
    </section>
  );
}
