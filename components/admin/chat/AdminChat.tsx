"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Plus,
  MessageCircle,
  History,
  X,
  LoaderCircle,
  Check,
} from "lucide-react";
import { BriefMarkdown } from "@/components/admin/BriefMarkdown";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
import type { z } from "zod";
import type { taskProposal } from "@/lib/admin-chat/planner";
type Turn = {
  id: string;
  user_text: string;
  reply: string | null;
  proposal: z.infer<typeof taskProposal> | null;
  status: string;
  applied_task_id: string | null;
};
type Thread = { id: string; title: string; updated_at: string };
export function AdminChat() {
  const query = useSearchParams();
  return <SavedAdminChat key={query.toString()} />;
}
function SavedAdminChat() {
  const { t } = useAdminPreferences();
  const router = useRouter();
  const search = useSearchParams();
  const chosen = search.get("thread"),
    fresh = search.get("new") === "1";
  const [turns, setTurns] = useState<Turn[]>([]),
    [threads, setThreads] = useState<Thread[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [applying, setApplying] = useState("");
  const selected = useRef<string | null>(null),
    pending = useRef<{ id: string; text: string } | null>(null),
    lock = useRef(false),
    end = useRef<HTMLDivElement>(null),
    history = useRef<HTMLDialogElement>(null),
    root = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch(
        adminUrl(
          "/api/admin/chat" +
            (chosen ? "?thread=" + encodeURIComponent(chosen) : ""),
        ),
        { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setThreads(d.threads);
      setTurns(fresh ? [] : d.turns);
      selected.current = fresh ? null : d.selected;
      setError("");
    } catch {
      setError("Chat history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [chosen, fresh]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);
  useEffect(() => {
    if (!turns.some((turn) => turn.status === "pending")) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 3000);
    return () => clearInterval(timer);
  }, [turns, load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns, busy]);
  useEffect(() => {
    const element = root.current,
      shell = element?.closest<HTMLElement>(".admin-workspace-shell");
    if (!element || !shell) return;
    const viewport = window.visualViewport;
    let baseline = window.innerHeight;
    const update = () => {
      const focused =
        element.contains(document.activeElement) &&
        document.activeElement?.tagName === "TEXTAREA";
      if (!focused) baseline = Math.max(baseline, window.innerHeight);
      const keyboard =
        focused && (viewport?.height ?? window.innerHeight) < baseline - 100;
      shell.dataset.adminKeyboardOpen = String(keyboard);
      const head =
        shell.querySelector(".admin-nav-header")?.getBoundingClientRect()
          .height ?? 68;
      const dock = keyboard
        ? 0
        : (shell.querySelector("[data-ledger-dock]")?.getBoundingClientRect()
            .height ?? 0);
      element.style.height = `${Math.max(260, (viewport?.height ?? window.innerHeight) - head - dock - 20)}px`;
    };
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      delete shell.dataset.adminKeyboardOpen;
    };
  }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || loading || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const content = text.trim();
    if (pending.current?.text !== content)
      pending.current = { id: crypto.randomUUID(), text: content };
    try {
      const r = await fetch(adminUrl("/api/admin/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: selected.current,
          request_id: pending.current!.id,
          text: content,
        }),
      });
      const d = await r.json();
      if (d.thread_id) selected.current = d.thread_id;
      if (!r.ok) throw Error(d.error);
      setTurns((v) => [
        ...v.filter((x) => x.id !== d.turn_id),
        {
          id: d.turn_id,
          user_text: content,
          reply: d.reply,
          proposal: d.proposal,
          status: "complete",
          applied_task_id: null,
        },
      ]);
      setText("");
      pending.current = null;
      router.replace(adminUrl("/admin/chat?thread=" + d.thread_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply unavailable.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function apply(turn: Turn) {
    if (applying) return;
    setApplying(turn.id);
    try {
      const r = await fetch(adminUrl("/api/admin/chat/tasks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turn_id: turn.id }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setTurns((v) =>
        v.map((x) =>
          x.id === turn.id ? { ...x, applied_task_id: d.task_id } : x,
        ),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Task update unavailable.");
    } finally {
      setApplying("");
    }
  }
  return (
    <div
      ref={root}
      className="admin-owner-chat admin-ledger admin-saved-chat"
      aria-busy={busy || loading}
    >
      <h1 className="sr-only">{t("Chat")}</h1>
      <header className="admin-chat-toolbar">
        <button
          type="button"
          disabled={busy}
          aria-label={t("Chat history")}
          onClick={() => {
            history.current?.showModal();
            void load();
          }}
        >
          <History size={19} />
          <span>{t("Saved conversations")}</span>
        </button>
        <span className="chat-model">GPT-6.1 Sol</span>
        <button
          type="button"
          disabled={busy}
          aria-label={t("New chat")}
          onClick={() => {
            pending.current = null;
            setText("");
            router.push(adminUrl("/admin/chat?new=1"));
            if (fresh) {
              setTurns([]);
              selected.current = null;
            }
          }}
        >
          <Plus size={21} />
        </button>
      </header>
      <div className="admin-chat-transcript" aria-live="polite">
        {loading && <p role="status">{t("Loading…")}</p>}
        {!loading && !turns.length && (
          <div className="admin-chat-welcome">
            <MessageCircle size={32} />
            <p>{t("What would you like to work through?")}</p>
            <div>
              {["Capture an idea", "Review my tasks", "Plan my next step"].map(
                (s) => (
                  <button type="button" key={s} onClick={() => setText(t(s))}>
                    {t(s)}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id}>
            <article data-role="user">
              <BriefMarkdown body={turn.user_text} />
            </article>
            {turn.reply && (
              <article data-role="assistant">
                <BriefMarkdown body={turn.reply} />
                {turn.proposal && (
                  <div className="admin-chat-proposal">
                    <strong>
                      {t(
                        turn.proposal.operation === "create"
                          ? "New task"
                          : "Task update",
                      )}
                    </strong>
                    <p>{turn.proposal.title}</p>
                    <small>
                      {turn.proposal.lane} · {turn.proposal.due_on} ·{" "}
                      {turn.proposal.status}
                    </small>
                    <p>{turn.proposal.reason}</p>
                    {turn.applied_task_id ? (
                      <span>
                        <Check size={16} />
                        {t("Task saved")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!!applying}
                        onClick={() => void apply(turn)}
                      >
                        {t(applying === turn.id ? "Saving…" : "Apply task")}
                      </button>
                    )}
                  </div>
                )}
              </article>
            )}
            {(turn.status === "failed" || turn.status === "pending") && (
              <button
                type="button"
                className="chat-retry"
                disabled={busy}
                onClick={() => {
                  pending.current = { id: turn.id, text: turn.user_text };
                  setText(turn.user_text);
                }}
              >
                {t("Retry reply")}
              </button>
            )}
            {turn.status === "failed" && (
              <p className="chat-limit">{t("Message saved · reply failed")}</p>
            )}
          </div>
        ))}
        {busy && (
          <div>
            <article data-role="user">
              <BriefMarkdown body={text} />
            </article>
            <p role="status">
              <LoaderCircle size={16} className="animate-spin" />
              {t("Preparing a reply…")}
            </p>
          </div>
        )}
        <div ref={end} />
      </div>
      {error && (
        <p role="alert" className="chat-error">
          {t(error)}
        </p>
      )}
      <form onSubmit={send} className="admin-chat-composer">
        <textarea
          aria-label={t("Message")}
          placeholder={t("An idea, a question, a next step…")}
          value={text}
          maxLength={6000}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          rows={2}
        />
        <button
          type="submit"
          disabled={busy || loading || !text.trim()}
          aria-label={t("Send message")}
        >
          <ArrowUp size={21} />
        </button>
      </form>
      <p className="chat-limit">
        {t("Saved privately · task changes need your confirmation")}
      </p>
      <dialog ref={history} className="admin-chat-history">
        <header>
          <h2>{t("Chat history")}</h2>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={() => history.current?.close()}
          >
            <X size={20} />
          </button>
        </header>
        {threads.length ? (
          threads.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => {
                history.current?.close();
                router.push(adminUrl("/admin/chat?thread=" + c.id));
              }}
            >
              <strong>{c.title}</strong>
              <small>
                {new Date(c.updated_at).toLocaleDateString("en-SG", {
                  timeZone: "Asia/Singapore",
                })}
              </small>
            </button>
          ))
        ) : (
          <p>{t("No conversations yet.")}</p>
        )}
      </dialog>
    </div>
  );
}
