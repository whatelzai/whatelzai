"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  Wallet,
  Flower2,
  Dumbbell,
  Mic,
  CalendarDays,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import Link from "@/components/admin/AdminLink";
import { adminUrl } from "@/lib/admin-url";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import {
  toolNames,
  type Tool,
  type Save,
  type ToolsData,
  type ToolRecord,
} from "@/lib/personal-tools/model";
const loading = () => <p role="status">Opening…</p>;
const Payday = dynamic(() => import("./Payday"), { loading });
const Timer = dynamic(() => import("./SessionTimer"), { loading });
const Training = dynamic(() => import("./Training"), { loading });
const Weekly = dynamic(() => import("./Weekly"), { loading });
export type ToolProps = {
  data: ToolsData;
  save: (value: Save) => Promise<ToolRecord | null>;
  onDirty?: (dirty: boolean) => void;
};
export default function ToolsWorkspace() {
  const query = useSearchParams();
  const initial = query.get("tool");
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<Tool>(
    toolNames.includes(initial as Tool) ? (initial as Tool) : "payday",
  );
  const [data, setData] = useState<ToolsData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(true);
  const { preferences } = useAdminPreferences();
  const zh = preferences.language === "zh";
  const read = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/personal-tools", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load records.");
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/personal-tools", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error);
        return body as ToolsData;
      })
      .then((body) => {
        if (!controller.signal.aborted) setData(body);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Could not load records.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, []);
  const save = async (value: Save) => {
    if (busy) return null;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/personal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      const record = d.record as ToolRecord;
      setData((old) =>
        old
          ? {
              ...old,
              records: [
                record,
                ...old.records.filter((x) => x.id !== record.id),
              ],
            }
          : old,
      );
      setDirty(false);
      return record;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const tabs = [
    ["payday", Wallet, "Payday", "发薪"],
    ["meditation", Flower2, "Meditate", "静心"],
    ["training", Dumbbell, "Train", "训练"],
    ["practice", Mic, "Practise", "练习"],
    ["weekly", CalendarDays, "This week", "本周"],
  ] as const;
  return (
    <div className="personal-tools" data-focusing={dirty}>
      <header>
        <Link
          href={adminUrl("/admin/personal")}
          aria-label={zh ? "返回个人" : "Back to Personal"}
        >
          <ArrowLeft size={18} />
          {zh ? "个人" : "Personal"}
        </Link>
        <button
          aria-label={zh ? "刷新" : "Refresh"}
          disabled={refreshing || busy}
          onClick={() => {
            setRefreshing(true);
            void read();
          }}
        >
          <RefreshCw size={18} />
        </button>
      </header>
      <nav aria-label={zh ? "个人工具" : "Personal tools"}>
        {tabs.map(([key, Icon, en, cn]) => (
          <button
            key={key}
            aria-current={tool === key ? "page" : undefined}
            onClick={() => {
              if (
                tool !== key &&
                dirty &&
                !window.confirm(
                  zh
                    ? "离开会丢失尚未保存的内容。继续？"
                    : "Leave this tool? Unsaved changes or a running timer will be lost.",
                )
              )
                return;
              setDirty(false);
              setTool(key);
              window.history.replaceState(null, "", `?tool=${key}`);
            }}
          >
            <Icon size={22} />
            <span>{zh ? cn : en}</span>
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setRefreshing(true);
              void read();
            }}
          >
            {zh ? "重试读取" : "Retry reading"}
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">
          {refreshing
            ? zh
              ? "读取记录中…"
              : "Reading saved records…"
            : zh
              ? "暂无数据"
              : "Records unavailable."}
        </p>
      ) : (
        <div
          aria-busy={busy}
          className="tool-content"
          onInputCapture={() => setDirty(true)}
          onChangeCapture={() => setDirty(true)}
        >
          <fieldset disabled={busy} className="tool-boundary">
            {tool === "payday" && (
              <Payday data={data} save={save} onDirty={setDirty} />
            )}
            {(tool === "meditation" || tool === "practice") && (
              <Timer
                key={tool}
                kind={tool}
                data={data}
                save={save}
                onDirty={setDirty}
              />
            )}
            {tool === "training" && (
              <Training data={data} save={save} onDirty={setDirty} />
            )}
            {tool === "weekly" && (
              <Weekly data={data} save={save} onDirty={setDirty} />
            )}
          </fieldset>
          {busy && <p role="status">{zh ? "保存中…" : "Saving…"}</p>}
        </div>
      )}
    </div>
  );
}
