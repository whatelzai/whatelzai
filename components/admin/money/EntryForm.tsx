"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  accounts,
  currencies,
  jars,
  kinds,
  minorUnits,
  singaporeDay,
  entrySchema,
  recurringSchema,
  type Rule,
} from "@/lib/money/model";
export default function EntryForm({
  mode,
  rule,
  onClose,
  onSaved,
}: {
  mode: "entry" | "recurring" | "paid";
  rule?: Rule;
  onClose: () => void;
  onSaved: (day?: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState("expense");
  const [jar, setJar] = useState("NECC");
  const [account, setAccount] = useState("GXS");
  const [dirty, setDirty] = useState(false);
  const close = () => {
    if (!dirty || window.confirm("Discard this unsaved entry?")) onClose();
  };
  const [currency, setCurrency] = useState("SGD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [id] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const title =
    mode === "recurring"
      ? "Add recurring expense"
      : mode === "paid"
        ? "Record payment"
        : "Add entry";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || "");
    setError("");
    setBusy(true);
    try {
      let command;
      if (mode === "paid" && rule) {
        command = {
          action: "paid",
          id: rule.id,
          request_id: id,
          expected_due: rule.next_due,
          paid_on: get("date"),
          amount_minor: minorUnits(get("amount")),
        };
      } else if (mode === "recurring") {
        const date = get("date");
        command = {
          action: "recurring",
          rule: recurringSchema.parse({
            id,
            name: get("description"),
            amount_minor: minorUnits(get("amount")),
            currency: get("currency"),
            account: get("account"),
            jar: get("jar"),
            category: get("category"),
            scope: get("scope"),
            cadence: get("cadence"),
            next_due: date,
            anchor_day: Number(date.slice(8)),
            anchor_month: Number(date.slice(5, 7)),
            decision: get("decision"),
            notes: get("notes"),
          }),
        };
      } else {
        const transfer = kind === "transfer";
        command = {
          action: "entry",
          entry: entrySchema.parse({
            id,
            kind,
            occurred_on: get("date"),
            amount_minor: minorUnits(get("amount")),
            currency: get("currency"),
            account: get("account"),
            jar: get("jar"),
            description: get("description"),
            category: get("category"),
            scope: get("scope"),
            to_account: transfer ? get("to_account") : null,
            to_jar: transfer ? get("to_jar") : null,
            to_currency: transfer ? get("to_currency") : null,
            to_amount_minor: transfer ? minorUnits(get("to_amount")) : null,
          }),
        };
      }
      const res = await fetch("/api/admin/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error || "Could not save.");
      onSaved(mode === "recurring" ? undefined : get("date"));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.startsWith("[")
            ? "Please check all fields and transfer amounts."
            : e.message
          : "Save failed. Your input is kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      className="money-dialog"
      aria-labelledby="money-form-title"
    >
      <header>
        <h2 id="money-form-title">{title}</h2>
        <button type="button" onClick={close} disabled={busy}>
          Close
        </button>
      </header>
      <form onSubmit={submit} onChange={() => setDirty(true)}>
        {mode === "paid" ? (
          <p>
            {rule?.name} · due {rule?.next_due}
            <br />
            Records a payment you already made. It does not charge a card.
          </p>
        ) : null}
        {mode === "entry" ? (
          <label>
            Entry type
            <select
              value={kind}
              onChange={(e) => {
                const v = e.target.value;
                setKind(v);
                if (v === "income") {
                  setJar("UNALLOCATED");
                  setAccount("DBS");
                }
              }}
              name="kind"
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k === "opening"
                    ? "Opening funds"
                    : k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="money-fields">
          <label>
            Amount
            <input
              autoFocus
              name="amount"
              inputMode="decimal"
              placeholder="0.00"
              required
              defaultValue={rule ? (rule.amount_minor / 100).toFixed(2) : ""}
            />
          </label>
          {mode === "paid" ? (
            <p className="money-field-unit">{rule?.currency}</p>
          ) : (
            <label>
              Currency
              <select
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {mode !== "paid" ? (
          <>
            <label>
              {mode === "recurring" ? "Service or bill" : "What was it for?"}
              <input
                name="description"
                maxLength={200}
                required
                placeholder="Lunch, rent, hosting…"
              />
            </label>
            <div className="money-fields">
              <label>
                Jar
                <select
                  name="jar"
                  value={jar}
                  onChange={(e) => setJar(e.target.value)}
                >
                  {jars.map((j) => (
                    <option key={j} value={j}>
                      {j === "UNALLOCATED"
                        ? "Income / unallocated"
                        : j === "BUSINESS"
                          ? "Business costs"
                          : j}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Account / payment method
                <input
                  name="account"
                  list="money-accounts"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <details>
              <summary>More details</summary>
              <div className="money-fields">
                <label>
                  Category
                  <input
                    name="category"
                    list="money-categories"
                    defaultValue="General"
                    required
                    maxLength={60}
                  />
                </label>
                <label>
                  Purpose
                  <select name="scope">
                    <option value="personal">Personal</option>
                    <option value="ai_business">AI business</option>
                    <option value="network_marketing">Network marketing</option>
                  </select>
                </label>
              </div>
            </details>
          </>
        ) : null}
        <label>
          {mode === "recurring" ? "Next billing date" : "Date"}
          <input
            type="date"
            name="date"
            defaultValue={singaporeDay()}
            required
            min="2000-01-01"
            max="2100-12-31"
          />
        </label>
        {mode === "entry" && kind === "opening" ? (
          <p className="money-note">
            Record verified funds at your tracking start date. Opening funds are
            excluded from income.
          </p>
        ) : null}
        {mode === "entry" && kind === "transfer" ? (
          <fieldset>
            <legend>Received into</legend>
            <div className="money-fields">
              <label>
                Destination account
                <input
                  name="to_account"
                  list="money-accounts"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                Destination jar
                <select name="to_jar">
                  {jars.map((j) => (
                    <option key={j}>{j}</option>
                  ))}
                </select>
              </label>
              <label>
                Received amount
                <input
                  name="to_amount"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                />
              </label>
              <label>
                Received currency
                <select name="to_currency" defaultValue={currency}>
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="money-note">
              Use exact amounts on both sides for currency exchange. Record fees
              as a separate expense. Jar transfers do not count as spending.
            </p>
          </fieldset>
        ) : null}
        {mode === "recurring" ? (
          <>
            <div className="money-fields">
              <label>
                Repeats
                <select name="cadence">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label>
                Decision
                <select name="decision">
                  <option value="keep">Keep</option>
                  <option value="review">Review</option>
                  <option value="cancel">Plan to cancel</option>
                </select>
              </label>
            </div>
            <label>
              Notes
              <input
                name="notes"
                maxLength={500}
                placeholder="Cancellation reminder or plan details"
              />
            </label>
            <p className="money-note">
              Tracking only. No bank charge, auto-payment or push reminder is
              created.
            </p>
          </>
        ) : null}
        <datalist id="money-accounts">
          {accounts.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <datalist id="money-categories">
          {[
            "General",
            "Food",
            "Rent",
            "Transport",
            "Utilities",
            "Health",
            "Subscriptions",
            "Software",
            "Education",
            "Family",
            "Travel",
            "Tax",
          ].map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {error ? (
          <p role="alert" className="money-error">
            {error}
          </p>
        ) : null}
        <button className="money-primary" type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : mode === "paid"
              ? "Record paid & advance date"
              : "Save"}
        </button>
      </form>
    </dialog>
  );
}
