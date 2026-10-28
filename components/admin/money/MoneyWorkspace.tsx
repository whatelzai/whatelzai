"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  RefreshCw,
  Download,
  MoreHorizontal,
  Repeat2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { MoneyIcon, jarVisuals } from "./MoneyVisuals";
const MoneyDetails = dynamic(() => import("./MoneyDetails"), {
  ssr: false,
  loading: () => <p role="status">Opening details…</p>,
});
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import {
  currencies,
  money,
  singaporeDay,
  type Currency,
  type Entry,
  type Rule,
  type MoneyData,
} from "@/lib/money/model";
const EntryForm = dynamic(() => import("./EntryForm"), {
  ssr: false,
  loading: () => <p role="status">Opening entry form…</p>,
});
const EntryDateForm = dynamic(() => import("./EntryDateForm"), {
  ssr: false,
  loading: () => <p role="status">Opening date editor…</p>,
});
export default function MoneyWorkspace({
  initialEntry = false,
  initialView = "jars",
}: {
  initialEntry?: boolean;
  initialView?: string;
}) {
  const [includeVoided, setIncludeVoided] = useState(false);
  const [includePaused, setIncludePaused] = useState(false);
  const [detail, setDetail] = useState<
    | { kind: "entry"; entry: Entry }
    | { kind: "jar"; jar: string }
    | { kind: "rule"; rule: Rule }
    | null
  >(null);
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
  const [dateEntry, setDateEntry] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const load = useCallback(async () => {
    const request = ++serial.current;
    try {
      const r = await fetch(
        `/api/admin/money?month=${month}&page=${page}&include_voided=${includeVoided ? 1 : 0}`,
        {
          cache: "no-store",
        },
      );
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
  }, [month, page, includeVoided]);
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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      return false;
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
      data-focusing={form || dateEntry || detail ? "true" : undefined}
    >
      <Link href={adminUrl("/admin/personal")} className="money-back">
        Personal
      </Link>
      <header className="money-heading">
        <div>
          <h1>Money</h1>
        </div>
        <button
          type="button"
          className="money-primary"
          onClick={() => setForm({ mode: "entry" })}
        >
          <Plus size={18} aria-hidden="true" /> Add
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
          <RefreshCw
            size={18}
            className={loading ? "money-refreshing" : undefined}
            aria-hidden="true"
          />
          <span className="sr-only">{loading ? "Refreshing…" : "Refresh"}</span>
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
          <p>
            <ArrowUpRight size={16} aria-hidden="true" /> Spent · {currency}
          </p>
          <strong>{data ? money(spent, currency) : "—"}</strong>
        </div>
        <div>
          <p>
            <ArrowDownLeft size={16} aria-hidden="true" /> Income
          </p>
          <strong>{data ? money(sum("income"), currency) : "—"}</strong>
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
            <div className="money-section-title">
              <h2>Jar spending</h2>
              <span className="money-muted">
                {data?.plan
                  ? money(data.plan.jar_base_minor, "SGD")
                  : loading
                    ? "Loading…"
                    : "No plan"}
              </span>
            </div>
            <div className="money-jar-grid">
              {data?.plan?.jar_plan.map((p) => {
                const visual = jarVisuals[p.jar as keyof typeof jarVisuals];
                const Icon = visual?.Icon ?? Wallet;
                const spent = sum("expense", p.jar) - sum("refund", p.jar);
                return (
                  <button
                    type="button"
                    key={p.jar}
                    className={`money-jar-tile tone-${visual?.tone ?? "neutral"}`}
                    onClick={() => setDetail({ kind: "jar", jar: p.jar })}
                    aria-label={`${p.jar} ${visual?.name ?? ""}, ${money(spent, currency)} spent. View jar details`}
                  >
                    <div className="money-tile-top">
                      <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
                      <span>{p.percent}%</span>
                    </div>
                    <div className="money-tile-name">
                      <strong>{p.jar}</strong>
                      <span>{visual?.name}</span>
                    </div>
                    <div className="money-tile-amount">
                      {money(spent, currency)}
                      <small>
                        {currency === "SGD" ? "of " : "Plan: "}
                        {money(p.cents, "SGD")}
                        {currency === "SGD" ? " plan" : ""}
                      </small>
                    </div>
                    {currency === "SGD" && p.cents > 0 ? (
                      <progress
                        aria-label={`${p.jar} spent against plan`}
                        value={Math.min(p.cents, Math.max(0, spent))}
                        max={p.cents}
                      />
                    ) : null}
                  </button>
                );
              })}
              {loading && !data
                ? Array.from({ length: 6 }, (_, i) => (
                    <div
                      className="money-jar-skeleton"
                      key={i}
                      aria-hidden="true"
                    />
                  ))
                : null}
            </div>
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
              <Plus size={18} aria-hidden="true" /> Add bill
            </button>
            {due.length ? (
              <p className="money-note">
                {due.length} bill{due.length === 1 ? "" : "s"} due or overdue.
                Record payments in Recurring.
              </p>
            ) : null}
            <details>
              <summary>Account plan</summary>
              <dl className="money-detail-values">
                <dt>Income account</dt>
                <dd>{data?.plan?.income_account ?? "Not configured"}</dd>
                <dt>Tax provision</dt>
                <dd>{data?.plan ? money(data.plan.tax_minor, "SGD") : "—"}</dd>
                <dt>LTSS target</dt>
                <dd>
                  {data?.plan
                    ? money(data.plan.reserve_target_minor, "SGD")
                    : "—"}
                </dd>
              </dl>
            </details>
          </aside>
        </div>
      ) : null}
      {view === "activity" ? (
        <section>
          <div className="money-section-title">
            <h2>Activity</h2>
            <a
              href={`/api/admin/money?month=${month}&export=csv`}
              title="Export month CSV (including voided entries)"
            >
              <Download size={18} aria-hidden="true" />
              <span className="sr-only">Export month CSV</span>
            </a>
          </div>
          <label className="money-history-filter">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(e) => {
                setIncludeVoided(e.target.checked);
                setPage(0);
                setLoading(true);
                setData(null);
              }}
            />
            Show voided
          </label>
          {data && !data.entries.length ? (
            <p className="money-empty">No entries this month.</p>
          ) : null}
          <div className="money-history">
            {data?.entries.map((e) => (
              <button
                type="button"
                className={`money-activity-row ${e.voided ? "is-voided" : ""}`}
                key={e.id}
                onClick={() => setDetail({ kind: "entry", entry: e })}
                aria-label={`Details for ${e.description}`}
              >
                <MoneyIcon jar={e.jar} kind={e.kind} />
                <span className="money-row-copy">
                  <strong>{e.description}</strong>
                  <small>
                    {e.occurred_on.slice(8)}{" "}
                    {new Date(e.occurred_on + "T12:00:00Z").toLocaleDateString(
                      "en-SG",
                      { month: "short", timeZone: "Asia/Singapore" },
                    )}{" "}
                    · {e.account}
                    {e.voided ? " · Voided" : ""}
                  </small>
                </span>
                <span className="money-row-value">
                  {e.kind === "income" || e.kind === "refund" ? "+" : ""}
                  {money(e.amount_minor, e.currency)}
                  <MoreHorizontal size={18} aria-hidden="true" />
                </span>
              </button>
            ))}
          </div>
          {data && data.total > 50 ? (
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
          ) : null}
        </section>
      ) : null}
      {view === "recurring" ? (
        <section>
          <div className="money-section-title">
            <h2>Recurring</h2>
            <button
              type="button"
              onClick={() => setForm({ mode: "recurring" })}
            >
              Add recurring expense
            </button>
          </div>
          <label className="money-history-filter">
            <input
              type="checkbox"
              checked={includePaused}
              onChange={(e) => setIncludePaused(e.target.checked)}
            />
            Show paused
          </label>
          {data &&
          !data.rules.filter((r) => includePaused || r.active).length ? (
            <p className="money-empty">No recurring bills.</p>
          ) : null}
          {data?.rules
            .filter((r) => includePaused || r.active)
            .map((r) => (
              <button
                type="button"
                className="money-activity-row"
                key={r.id}
                onClick={() => setDetail({ kind: "rule", rule: r })}
                aria-label={`Details for ${r.name}`}
              >
                <MoneyIcon jar={r.jar} />
                <span className="money-row-copy">
                  <strong>{r.name}</strong>
                  <small>
                    {r.active ? r.next_due : "Paused"}
                    {r.active && r.next_due < today ? " · Overdue" : ""}
                  </small>
                </span>
                <span className="money-row-value">
                  {money(r.amount_minor, r.currency)}
                  <Repeat2 size={17} aria-hidden="true" />
                </span>
              </button>
            ))}
        </section>
      ) : null}
      {detail ? (
        <MoneyDetails
          title={
            detail.kind === "jar"
              ? `${detail.jar} · ${jarVisuals[detail.jar as keyof typeof jarVisuals]?.name ?? "Jar"}`
              : detail.kind === "entry"
                ? detail.entry.description
                : detail.rule.name
          }
          onClose={() => setDetail(null)}
        >
          {error ? (
            <p role="alert" className="money-error">
              {error}
            </p>
          ) : null}
          {detail.kind === "jar" ? (
            (() => {
              const p = data?.plan?.jar_plan.find((p) => p.jar === detail.jar);
              return (
                <>
                  <MoneyIcon jar={detail.jar} />
                  <dl className="money-detail-values">
                    <dt>Spent · {currency}</dt>
                    <dd>
                      {money(
                        sum("expense", detail.jar) - sum("refund", detail.jar),
                        currency,
                      )}
                    </dd>
                    <dt>Monthly plan · SGD</dt>
                    <dd>{p ? money(p.cents, "SGD") : "Not configured"}</dd>
                    <dt>Account</dt>
                    <dd>
                      {p?.account}
                      {p?.planned ? " · planned" : ""}
                    </dd>
                  </dl>
                  <p>Plan, not a bank balance. Currencies stay separate.</p>
                </>
              );
            })()
          ) : detail.kind === "entry" ? (
            <>
              <MoneyIcon jar={detail.entry.jar} kind={detail.entry.kind} />
              <dl className="money-detail-values">
                <dt>Amount</dt>
                <dd>
                  {money(detail.entry.amount_minor, detail.entry.currency)}
                </dd>
                <dt>Date</dt>
                <dd>{detail.entry.occurred_on}</dd>
                <dt>Type</dt>
                <dd>
                  {detail.entry.category} · {detail.entry.kind}
                </dd>
                <dt>Account</dt>
                <dd>{detail.entry.account}</dd>
                <dt>Jar</dt>
                <dd>{detail.entry.jar}</dd>
                <dt>Purpose</dt>
                <dd>{detail.entry.scope.replaceAll("_", " ")}</dd>
                {detail.entry.kind === "transfer" ? (
                  <>
                    <dt>Received into</dt>
                    <dd>
                      {detail.entry.to_account} · {detail.entry.to_jar} ·{" "}
                      {money(
                        detail.entry.to_amount_minor!,
                        detail.entry.to_currency!,
                      )}
                    </dd>
                  </>
                ) : null}
              </dl>
              <div className="money-detail-actions">
                {!detail.entry.voided ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDateEntry(detail.entry);
                      setDetail(null);
                    }}
                  >
                    Edit date
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      detail.entry.voided ||
                      window.confirm(
                        `Void “${detail.entry.description}”? It stays in history and can be restored.`,
                      )
                    ) {
                      if (
                        await action({
                          action: "void",
                          id: detail.entry.id,
                          voided: !detail.entry.voided,
                        })
                      )
                        setDetail(null);
                    }
                  }}
                >
                  {busy ? "Saving…" : detail.entry.voided ? "Restore" : "Void"}
                </button>
              </div>
            </>
          ) : (
            <>
              <MoneyIcon jar={detail.rule.jar} />
              <dl className="money-detail-values">
                <dt>Amount</dt>
                <dd>{money(detail.rule.amount_minor, detail.rule.currency)}</dd>
                <dt>Next due</dt>
                <dd>{detail.rule.next_due}</dd>
                <dt>Repeats</dt>
                <dd>{detail.rule.cadence}</dd>
                <dt>Account / jar</dt>
                <dd>
                  {detail.rule.account} · {detail.rule.jar}
                </dd>
                <dt>Decision</dt>
                <dd>{detail.rule.decision}</dd>
              </dl>
              {detail.rule.notes ? <p>{detail.rule.notes}</p> : null}
              <div className="money-detail-actions">
                {detail.rule.active ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ mode: "paid", rule: detail.rule });
                      setDetail(null);
                    }}
                  >
                    Record paid
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await action({
                        action: "recurring_status",
                        id: detail.rule.id,
                        active: !detail.rule.active,
                      })
                    )
                      setDetail(null);
                  }}
                >
                  {busy ? "Saving…" : detail.rule.active ? "Pause" : "Resume"}
                </button>
              </div>
              <p>Tracking only. Pausing does not cancel the subscription.</p>
            </>
          )}
        </MoneyDetails>
      ) : null}
      {dateEntry ? (
        <EntryDateForm
          entry={dateEntry}
          onClose={() => setDateEntry(null)}
          onSaved={(day) => {
            setDateEntry(null);
            setNotice("Date updated. Viewing the entry’s month.");
            setLoading(true);
            setPage(0);
            if (day.slice(0, 7) !== month) {
              setMonth(day.slice(0, 7));
              setData(null);
            } else if (page === 0) {
              void load();
            }
          }}
        />
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
