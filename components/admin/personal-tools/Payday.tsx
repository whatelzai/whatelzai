"use client";
import { useState } from "react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { allocate, type ToolRecord } from "@/lib/personal-tools/model";
import { minorUnits, money } from "@/lib/money/model";
import { singaporeDay } from "@/lib/daily/model";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import type { ToolProps } from "./ToolsWorkspace";
export default function Payday({ data, save }: ToolProps) {
  const zh = useAdminPreferences().preferences.language === "zh";
  const [incomeId, setIncomeId] = useState(""),
    [tax, setTax] = useState(""),
    [confirmed, setConfirmed] = useState<string[]>([]),
    [record, setRecord] = useState<ToolRecord | null>(null),
    [message, setMessage] = useState("");
  const income = data.incomes.find((i) => i.id === incomeId);
  let allocations: ReturnType<typeof allocate> = [];
  let taxMinor = 0;
  try {
    taxMinor = tax.trim() === "0" ? 0 : minorUnits(tax);
    if (income && data.plan)
      allocations = allocate(income.amount_minor, taxMinor, data.plan);
  } catch {}
  const choose = (id: string) => {
    setIncomeId(id);
    setMessage("");
    const old =
      data.records.find(
        (r) =>
          r.kind === "payday" &&
          "income_id" in r.data &&
          r.data.income_id === id,
      ) || null;
    setRecord(old);
    setTax(
      old && "tax_minor" in old.data
        ? (old.data.tax_minor / 100).toFixed(2)
        : "",
    );
    setConfirmed(old && "confirmed" in old.data ? old.data.confirmed : []);
  };
  return (
    <section>
      <h1>{zh ? "发薪分配" : "Payday allocation"}</h1>
      <p className="tool-hint">
        {zh
          ? "预计每月27–28日到账 · 先确认实际收入"
          : "Expected 27–28 each month · confirm actual receipt first"}
      </p>
      <label>
        {zh ? "已记录的工资（SGD）" : "Recorded salary (SGD)"}
        <select value={incomeId} onChange={(e) => choose(e.target.value)}>
          <option value="">
            {zh ? "选择一笔实际收入" : "Choose actual income"}
          </option>
          {data.incomes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.occurred_on} · {i.description} · {money(i.amount_minor, "SGD")}
            </option>
          ))}
        </select>
      </label>
      <Link href={adminUrl("/admin/personal/money?entry=income")}>
        {zh ? "先记录收入" : "Record income first"}
      </Link>
      {income && (
        <>
          <label>
            {zh
              ? "本次税务预留（SGD）"
              : "Tax provision for this receipt (SGD)"}
            <input
              inputMode="decimal"
              value={tax}
              onChange={(e) => {
                setTax(e.target.value);
                setConfirmed([]);
                setMessage("");
              }}
              placeholder="0.00"
            />
          </label>
          <p className="tool-hint">
            {zh
              ? "完整月薪计划预留500；部分月薪请自行确认金额。"
              : "Full-month plan: $500 provision. Review the amount for a partial salary."}
          </p>
          {allocations.length > 0 ? (
            <div className="allocation-list">
              {allocations.map((a) => (
                <label key={a.jar}>
                  <input
                    type="checkbox"
                    checked={confirmed.includes(a.jar)}
                    onChange={(e) => {
                      setMessage("");
                      setConfirmed(
                        e.target.checked
                          ? [...confirmed, a.jar]
                          : confirmed.filter((j) => j !== a.jar),
                      );
                    }}
                  />
                  <span>
                    <strong>{a.jar}</strong>
                    <small>
                      {a.account}
                      {a.planned
                        ? zh
                          ? " · 账户待开通"
                          : " · account planned"
                        : ""}
                    </small>
                  </span>
                  <strong>{money(a.minor, "SGD")}</strong>
                </label>
              ))}
            </div>
          ) : (
            <p>
              {zh
                ? "填写小于收入的税务预留金额"
                : "Enter a tax provision smaller than the receipt."}
            </p>
          )}
          <p className="tool-hint">
            {zh
              ? "勾选表示你已自行预留或转账；此处不会操作银行，也不会重复记账。"
              : "Tick only after you retain or transfer the money yourself. This checklist does not move money or add ledger transfers."}
          </p>
          <button
            className="tool-primary"
            disabled={allocations.length === 0}
            onClick={async () => {
              if (!income) return;
              const r = await save({
                id: income.id,
                revision: record?.revision || 0,
                occurred_on: singaporeDay(),
                data: {
                  kind: "payday",
                  income_id: income.id,
                  tax_minor: taxMinor,
                  confirmed: confirmed as (
                    | "TAX"
                    | "FFA"
                    | "LTSS"
                    | "EDU"
                    | "NECC"
                    | "PLAY"
                    | "GIVE"
                  )[],
                },
              });
              if (r) {
                setRecord(r);
                setMessage(
                  zh ? "已保存分配清单" : "Allocation checklist saved.",
                );
              }
            }}
          >
            {zh ? "保存清单" : "Save checklist"}
          </button>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
