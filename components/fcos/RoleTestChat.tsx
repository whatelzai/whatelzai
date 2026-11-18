"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Plus } from "lucide-react";
import { readReply } from "@/lib/member-ai/stream";
import { ChatMarkdown } from "@/app/assistant/ChatMarkdown";
import { roleLabels, type WeosRole } from "@/lib/weos-roles";
export function RoleTestChat({ role }: { role: WeosRole }) {
  const conversation = useRef<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; body: string }[]>(
    [],
  );
  const [text, setText] = useState(""),
    [reply, setReply] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [interrupted, setInterrupted] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = transcript.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [reply, messages, busy]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy || interrupted) return;
    const message = text.trim();
    pinned.current = true;
    conversation.current ??= crypto.randomUUID();
    setBusy(true);
    setError("");
    setReply("");
    setText("");
    setMessages((previous) => [...previous, { role: "user", body: message }]);
    let body = "";
    try {
      const response = await fetch("/api/weos/preview/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          conversationId: conversation.current,
          text: message,
        }),
      });
      const outcome = await readReply(response, (chunk) => {
        body += chunk;
        setReply(body);
      });
      if (outcome.duplicate)
        throw Error("This reply is already being prepared. Start a new test.");
      setMessages((previous) => [...previous, { role: "assistant", body }]);
      setReply("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role test interrupted.");
      setInterrupted(true);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    conversation.current = null;
    pinned.current = true;
    setMessages([]);
    setReply("");
    setError("");
    setText("");
    setInterrupted(false);
  }
  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label={`${roleLabels[role]} Chat test`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-2">
        <h2 className="text-lg font-semibold">Test {roleLabels[role]} Chat</h2>
        <button
          type="button"
          disabled={busy}
          onClick={reset}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm disabled:opacity-40"
        >
          <Plus size={18} />
          New test
        </button>
      </div>
      <div
        ref={transcript}
        data-fcos-scroll
        role="log"
        aria-label="Test conversation"
        aria-busy={busy}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 py-3"
        onScroll={() => {
          const el = transcript.current;
          if (el)
            pinned.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        }}
      >
        <div className="text-xs leading-5 text-zinc-500">
          <p>Uses your AI allowance · separate test history.</p>
          <details>
            <summary className="min-h-11 cursor-pointer py-3">
              What can this test access?
            </summary>
            <p>
              Your permitted Baobeis and references are filtered by the selected
              role. Private owner workspaces, connected vaults and other
              people’s chats stay excluded. This does not impersonate another
              member.
            </p>
          </details>
        </div>
        <div className="space-y-5">
          {!messages.length && (
            <p className="py-8 text-center text-sm text-zinc-500">
              Ask a question to test this role’s access.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-8 rounded-3xl bg-zinc-100 px-5 py-3"
                  : "py-2"
              }
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {m.body}
                </p>
              ) : (
                <ChatMarkdown body={m.body} />
              )}
            </div>
          ))}
          {reply && <ChatMarkdown body={reply} />}
          {busy && !reply && (
            <p role="status" className="text-sm text-zinc-500">
              Thinking…
            </p>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <form onSubmit={send} className="fcos-chat-composer shrink-0 pt-3">
        <div className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white p-2 shadow-sm">
          <textarea
            aria-label="Message role test"
            placeholder={`Message as ${roleLabels[role]}…`}
            value={text}
            maxLength={6000}
            rows={2}
            disabled={busy || interrupted}
            onChange={(e) => setText(e.target.value)}
            className="fcos-chat-input min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-base outline-none focus:ring-0"
          />
          <button
            aria-label="Send test message"
            disabled={busy || interrupted || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-300 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            <ArrowUp size={22} />
          </button>
        </div>
      </form>
    </section>
  );
}
