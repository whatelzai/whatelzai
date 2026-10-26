"use client";
import { AppHeader } from "@/components/fcos/AppHeader";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, SquarePen, X } from "lucide-react";

type Conversation = { id: string; title: string; created_at: string };
const date = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ChatMenu({
  chats,
  selected,
}: {
  chats: Conversation[];
  selected: string | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const newChat = () => {
    dialog.current?.close();
    setSearch("");
    router.push(`/assistant?new=1&draft=${crypto.randomUUID()}`);
  };
  const visible = chats.filter((chat) =>
    `${chat.title} ${date.format(new Date(chat.created_at))}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <AppHeader
        title="Chat"
        chat
        start={
          <button
            type="button"
            aria-label="Chat menu"
            aria-haspopup="dialog"
            onClick={() => {
              dialog.current?.showModal();
              router.refresh();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-zinc-100"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        }
        end={
          <button
            type="button"
            aria-label="New chat"
            title="New chat"
            onClick={newChat}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-zinc-100"
          >
            <SquarePen size={21} aria-hidden="true" />
          </button>
        }
      />
      <dialog
        ref={dialog}
        aria-labelledby="chat-menu-title"
        className="m-0 h-[var(--fcos-viewport-height,100dvh)] max-h-none w-[min(90vw,360px)] max-w-none overflow-hidden border-r border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-zinc-950/25"
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a"))
            dialog.current?.close();
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-5 flex shrink-0 items-center justify-between">
            <h2 id="chat-menu-title" className="text-xl font-semibold">
              Your chats
            </h2>
            <button
              type="button"
              aria-label="Close chat menu"
              onClick={() => dialog.current?.close()}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-zinc-100"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={newChat}
            className="flex min-h-12 shrink-0 items-center gap-3 rounded-xl bg-yellow-300 px-4 py-3 font-semibold"
          >
            <SquarePen size={20} aria-hidden="true" />
            New chat
          </button>
          <label className="my-5 flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 px-3 focus-within:border-zinc-500">
            <Search
              size={18}
              className="shrink-0 text-zinc-500"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base outline-none focus:outline-none"
            />
          </label>
          <h3 className="mb-2 shrink-0 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Recent conversations
          </h3>
          <nav
            aria-label="Your conversations"
            className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain"
          >
            {visible.map((chat) => (
              <Link
                key={chat.id}
                href={`/assistant?chat=${chat.id}`}
                aria-current={chat.id === selected ? "page" : undefined}
                className={`block rounded-xl px-3 py-3 ${chat.id === selected ? "bg-yellow-100" : "hover:bg-zinc-100"}`}
              >
                <span className="block truncate text-sm font-medium">
                  {chat.title}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {date.format(new Date(chat.created_at))}
                </span>
              </Link>
            ))}
            {!visible.length && (
              <p role="status" className="px-3 py-4 text-sm text-zinc-500">
                {search.trim()
                  ? "No matching conversations."
                  : "Your conversations will appear here after your first message."}
              </p>
            )}
          </nav>
          <footer className="mt-4 shrink-0 border-t border-zinc-100 pt-4 pb-[env(safe-area-inset-bottom)]">
            <Link
              href="/profile?tab=usage"
              className="block rounded-lg px-3 py-3 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Profile & usage →
            </Link>
          </footer>
        </div>
      </dialog>
    </>
  );
}
