"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Bot, LoaderCircle } from "lucide-react";
import { BriefMarkdown } from "@/components/admin/BriefMarkdown";
import { useAdminPreferences } from "@/components/admin/AdminPreferences";
import { adminUrl } from "@/lib/admin-url";
type Message = { role: "user" | "assistant"; content: string };
export function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length || busy)
      end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, busy]);
  const { t } = useAdminPreferences();
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const next: Message[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    try {
      const response = await fetch(adminUrl("/api/admin/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error ?? "Reply unavailable.");
      if (typeof body.reply !== "string") throw Error("Reply unavailable.");
      setMessages([...next, { role: "assistant", content: body.reply }]);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reply unavailable.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="admin-owner-chat admin-ledger">
      <header className="ledger-title">
        <h1>{t("Chat")}</h1>
        <button
          type="button"
          disabled={busy || !messages.length}
          onClick={() => {
            setMessages([]);
            setError("");
          }}
        >
          <Plus size={17} />
          {t("New chat")}
        </button>
      </header>
      <p className="chat-model">
        <Bot size={16} />
        GPT-6.1 Sol · {t("Not saved")}
      </p>
      <div className="admin-chat-transcript" aria-live="polite">
        {!messages.length && (
          <p className="chat-empty">
            {t("What would you like to work through?")}
          </p>
        )}
        {messages.map((m, i) => (
          <article
            key={i}
            data-role={m.role}
            aria-label={m.role === "user" ? t("You") : "GPT-6.1 Sol"}
          >
            <BriefMarkdown body={m.content} />
          </article>
        ))}
        {busy && (
          <p role="status">
            <LoaderCircle size={17} className="animate-spin" />
            {t("Preparing a reply…")}
          </p>
        )}
      </div>
      <div ref={end} />
      {error && (
        <p role="alert" className="chat-error">
          {error}
        </p>
      )}
      <form onSubmit={send} className="admin-chat-composer">
        <textarea
          aria-label={t("Message")}
          placeholder={t("Think it through…")}
          value={text}
          maxLength={6000}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label={t("Send message")}
        >
          <ArrowUp size={22} />
        </button>
      </form>
      <p className="chat-limit">
        {t(
          "Uses API credits. No calendar, vault or email access in this chat yet.",
        )}
      </p>
    </div>
  );
}
