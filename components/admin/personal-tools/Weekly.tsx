"use client";
import { Flower2, Dumbbell, Mic, Wallet } from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { money } from "@/lib/money/model";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import { clock } from "@/lib/personal-tools/model";
import type { ToolProps } from "./ToolsWorkspace";
export default function Weekly({ data }: ToolProps) {
  const zh = useAdminPreferences().preferences.language === "zh";
  const records = data.records.filter(
    (r) => r.occurred_on >= data.week.start && r.occurred_on <= data.week.end,
  );
  const sessions = (kind: string) => records.filter((r) => r.kind === kind);
  const totalSeconds = (kind: string) =>
    sessions(kind).reduce(
      (n, r) => n + ("seconds" in r.data ? r.data.seconds : 0),
      0,
    );
  return (
    <section>
      <h1>{zh ? "本周记录" : "This week, recorded"}</h1>
      <p className="tool-hint">
        {data.week.start} – {data.week.end} · {zh ? "新加坡时间" : "Singapore"}
      </p>
      <div className="weekly-tool-grid">
        {[
          [
            Flower2,
            zh ? "静心" : "Meditation",
            `${sessions("meditation").length} ${zh ? "次" : "sessions"} · ${clock(totalSeconds("meditation"))}`,
          ],
          [
            Dumbbell,
            zh ? "训练" : "Training",
            `${sessions("training").length} ${zh ? "次" : sessions("training").length === 1 ? "session" : "sessions"}`,
          ],
          [
            Mic,
            zh ? "表达练习" : "Teaching practice",
            `${sessions("practice").length} ${zh ? "次" : "sessions"} · ${clock(totalSeconds("practice"))}`,
          ],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Flower2;
          return (
            <div key={String(label)}>
              <I size={24} />
              <span>{String(label)}</span>
              <strong>{String(value)}</strong>
            </div>
          );
        })}
        <div>
          <Wallet size={24} />
          <span>{zh ? "净支出" : "Net spending"}</span>
          {data.spending.length ? (
            data.spending.map((s) => (
              <strong key={s.currency}>
                {money(s.minor, s.currency as "SGD" | "MYR" | "USD")}
              </strong>
            ))
          ) : (
            <strong>—</strong>
          )}
        </div>
      </div>
      <h2>{zh ? "我选择的成果" : "My chosen outcome"}</h2>
      <p>
        {data.focus
          ? `${data.focus.done ? "✓ " : ""}${data.focus.title}`
          : zh
            ? "尚未选择"
            : "No outcome chosen yet."}
      </p>
      <Link href={adminUrl("/admin/personal")}>
        {zh ? "回到个人页" : "Open Personal"}
      </Link>
      <p className="tool-hint">
        {zh
          ? "这里只显示已保存的记录，未记录不代表没有做。支出减去退款，币种分开。"
          : "Saved records only; unrecorded activity is unknown. Spending is expenses less refunds, with currencies separate."}
      </p>
      <div className="tool-links">
        <Link href={adminUrl("/admin/today")}>
          {zh ? "阅读每日简报" : "Read daily briefings"}
        </Link>
        <Link href={adminUrl("/admin/today/routines")}>
          {zh ? "周复盘与例行流程" : "Weekly closeout & routines"}
        </Link>
      </div>
      <details>
        <summary>{zh ? "本周活动明细" : "This week’s activity"}</summary>
        {records.filter((r) =>
          ["meditation", "practice", "training"].includes(r.kind),
        ).length === 0 ? (
          <p>{zh ? "尚无记录" : "No sessions recorded yet."}</p>
        ) : (
          records
            .filter((r) =>
              ["meditation", "practice", "training"].includes(r.kind),
            )
            .map((r) => (
              <p key={r.id}>
                {r.occurred_on} · {r.kind}
                {"name" in r.data ? " · " + r.data.name : ""}
                {"topic" in r.data && r.data.topic ? " · " + r.data.topic : ""}
              </p>
            ))
        )}
      </details>
    </section>
  );
}
