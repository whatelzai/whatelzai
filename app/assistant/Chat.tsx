"use client";
import Link from "next/link";
import Image from "next/image";
import { VoiceInput } from "./VoiceInput";
import { imageDraft } from "./image-draft";
import { ChatMarkdown } from "./ChatMarkdown";
import { readReply } from "@/lib/member-ai/stream";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, LoaderCircle, Plus, X } from "lucide-react";
import type { ChatMessage } from "@/lib/member-ai/model";
import { acceptCommitment, createConversation } from "./actions";
export function Chat({
  messages,
  conversationId,
  enabled,
  initialPrompt = "",
  name = "",
}: {
  messages: ChatMessage[];
  conversationId: string | null;
  enabled: boolean;
  initialPrompt?: string;
  name?: string;
}) {
  const [images, setImages] = useState<
    { key: string; file: File; url: string }[]
  >([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [submittedImages, setSubmittedImages] = useState<string[]>([]);
  const attaching = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );
  const [text, setText] = useState(initialPrompt);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [streamed, setStreamed] = useState("");
  const [startedFrom, setStartedFrom] = useState<string | undefined>(undefined);
  const [draftSaved, setDraftSaved] = useState(false);
  const pinned = useRef(true);
  const sending = useRef(false);
  const pending = useRef<{
    key: string;
    id: string;
    imageIds: string[];
  } | null>(null);
  const activeConversation = useRef(conversationId);
  const transcript = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const lastMessage = messages.at(-1)?.id;
  useLayoutEffect(() => {
    if (transcript.current && pinned.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [lastMessage, busy, streamed]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (
      sending.current ||
      busy ||
      !enabled ||
      mediaBusy ||
      text.length > 6000 ||
      (!text.trim() && !images.length)
    )
      return;
    sending.current = true;
    setBusy(true);
    setNotice("");
    const messageText = text.trim() || "Please help me understand this image.";
    setSubmitted(messageText);
    setSubmittedImages(images.map((image) => image.url));
    setStreamed("");
    setStartedFrom(lastMessage);
    setDraftSaved(false);
    pinned.current = true;
    const key = JSON.stringify([text, images.map((image) => image.key)]);
    if (pending.current?.key !== key)
      pending.current = { key, id: crypto.randomUUID(), imageIds: [] };
    const requestId = pending.current.id;
    try {
      // A blank slate stays ephemeral until the first send. Keep this ID for
      // retrying an interrupted request; never create a new chat on each retry.
      if (!activeConversation.current)
        activeConversation.current = (await createConversation()).id;
      for (let i = pending.current!.imageIds.length; i < images.length; i++) {
        const form = new FormData();
        form.set("conversationId", activeConversation.current!);
        form.set("image", images[i].file);
        const upload = await fetch("/api/member/assistant/images", {
          method: "POST",
          body: form,
        });
        const result = await upload.json();
        if (!upload.ok) throw Error(result.error ?? "Image upload failed.");
        pending.current!.imageIds.push(result.id);
      }
      const response = await fetch("/api/member/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          requestId,
          conversationId: activeConversation.current,
          text: messageText,
          imageIds: pending.current!.imageIds,
        }),
      });
      const result = await readReply(response, (chunk) =>
        setStreamed((previous) => previous + chunk),
      );
      if (result.duplicate && result.status === "running")
        setNotice("Your reply is still being prepared. Refresh shortly.");
      else {
        setDraftSaved(true);
        setText("");
        setImages([]);
        pending.current = null;
        if (textarea.current) textarea.current.style.height = "auto";
      }
      if (activeConversation.current !== conversationId)
        router.replace(`/assistant?chat=${activeConversation.current}`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Connection interrupted. Check the reply before retrying.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
      if (conversationId) router.refresh();
    }
  }
  async function attach(files: File[]) {
    if (sending.current || busy || mediaBusy || !enabled || attaching.current)
      return;
    if (images.length + files.length > 2) {
      setNotice("Attach up to two images per message.");
      return;
    }
    attaching.current = true;
    setMediaBusy(true);
    setNotice("");
    try {
      const drafts: { key: string; file: File; url: string }[] = [];
      for (const file of files) {
        const prepared = await imageDraft(file);
        const url = URL.createObjectURL(prepared);
        urls.current.add(url);
        drafts.push({ key: crypto.randomUUID(), file: prepared, url });
      }
      setImages((previous) => [...previous, ...drafts]);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Image could not be prepared.",
      );
    } finally {
      attaching.current = false;
      setMediaBusy(false);
    }
  }
  async function accept(message: string, proposal: string) {
    setBusy(true);
    try {
      const result = await acceptCommitment({ message, proposal });
      setNotice(result.error ?? result.success ?? "");
      router.refresh();
    } catch {
      setNotice("Could not save. Please reload and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Chat workspace"
    >
      <div
        ref={transcript}
        data-fcos-scroll
        role="log"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-5 md:px-5"
        onScroll={() => {
          const el = transcript.current;
          if (el)
            pinned.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        }}
        aria-label="Conversation"
        aria-live="polite"
        aria-busy={busy}
      >
        {!messages.length && !submitted && (
          <div className="grid min-h-full place-items-center">
            <div className="max-w-xs pb-10 text-center">
              <span
                className="mx-auto mb-5 block h-3 w-3 rounded-full bg-yellow-300"
                aria-hidden="true"
              />
              <h2 className="text-2xl font-medium leading-snug tracking-tight">
                What’s on your mind{name ? `, ${name}` : ""}?
              </h2>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`min-w-0 ${message.role === "user" ? "ml-10 rounded-3xl bg-zinc-100 px-4 py-3" : "px-1 py-2"}`}
            >
              <p className="sr-only">
                {message.role === "user" ? "You" : "fcOS"}
              </p>
              {!!message.images?.length && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.images.map((image) => (
                    <a
                      key={image.id}
                      href={`/api/member/assistant/images/${image.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        unoptimized
                        src={`/api/member/assistant/images/${image.id}`}
                        width={220}
                        height={180}
                        alt="Attached image"
                        className="max-h-56 max-w-full rounded-xl object-contain"
                      />
                    </a>
                  ))}
                </div>
              )}
              {message.role === "assistant" ? (
                <ChatMarkdown body={message.body} />
              ) : (
                <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
                  {message.body}
                </div>
              )}
              {message.role === "assistant" && (
                <details className="mt-2 text-xs text-zinc-500">
                  <summary className="w-fit cursor-pointer py-2">
                    Save as a note
                  </summary>
                  <div className="mt-1 flex gap-4">
                    <Link
                      className="min-h-9 py-2 underline"
                      href={`/briefings/new?kind=HQH&message=${message.id}`}
                    >
                      Review as HQH
                    </Link>
                    <Link
                      className="min-h-9 py-2 underline"
                      href={`/briefings/new?kind=HHH&message=${message.id}`}
                    >
                      Review as HHH
                    </Link>
                  </div>
                </details>
              )}
              {message.proposals?.map((proposal) => (
                <div
                  key={proposal.id}
                  className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4"
                >
                  <p className="font-medium">{proposal.title}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {proposal.due_on} · {proposal.lane}
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => accept(message.id, proposal.id)}
                    className="mt-3 min-h-11 rounded-lg bg-yellow-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    Accept commitment
                  </button>
                </div>
              ))}
            </article>
          ))}
          {submitted && lastMessage === startedFrom && (
            <article className="ml-10 rounded-3xl bg-zinc-100 px-4 py-3">
              <p className="sr-only">You</p>
              {!!submittedImages.length && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {submittedImages.map((url) => (
                    <Image
                      key={url}
                      unoptimized
                      src={url}
                      width={180}
                      height={150}
                      alt="Attached image"
                      className="max-h-44 rounded-xl object-contain"
                    />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
                {submitted}
              </p>
            </article>
          )}
          {streamed && (!draftSaved || lastMessage === startedFrom) && (
            <article
              className="min-w-0 px-1 py-2"
              aria-label={busy ? "Reply in progress" : "Reply"}
            >
              <ChatMarkdown body={streamed} />
              {busy && (
                <span
                  className="mt-2 inline-block h-2 w-2 motion-safe:animate-pulse rounded-full bg-zinc-400"
                  aria-hidden="true"
                />
              )}
            </article>
          )}
          {busy && !streamed && (
            <p className="flex items-center gap-2 px-1 text-sm text-zinc-500">
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
              Thinking…
            </p>
          )}
        </div>
      </div>
      <form
        onSubmit={send}
        className="fcos-chat-composer shrink-0 bg-white px-1 pt-3 md:px-5"
      >
        {!!images.length && (
          <div
            className="mx-auto mb-2 flex max-w-3xl gap-3"
            aria-label="Images to send"
          >
            {images.map((image, index) => (
              <div key={image.key} className="relative">
                <Image
                  unoptimized
                  src={image.url}
                  alt={`Image ${index + 1} preview`}
                  width={72}
                  height={72}
                  className="size-18 rounded-xl object-cover"
                />
                <button
                  type="button"
                  disabled={busy || mediaBusy}
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() =>
                    setImages((previous) =>
                      previous.filter((item) => item.key !== image.key),
                    )
                  }
                  className="absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full bg-white/95 shadow-sm"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose chat images"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void attach(files);
          }}
        />
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[28px] border border-zinc-200 bg-zinc-50 p-1.5 shadow-sm focus-within:border-zinc-400">
          <button
            type="button"
            aria-label="Attach images"
            disabled={busy || mediaBusy || !enabled || images.length >= 2}
            onClick={() => picker.current?.click()}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
          >
            <Plus size={22} aria-hidden="true" />
          </button>
          <label htmlFor="member-message" className="sr-only">
            Message fcOS
          </label>
          <textarea
            ref={textarea}
            id="member-message"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 144)}px`;
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                window.matchMedia("(min-width:768px)").matches
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files).filter(
                (file) => file.type.startsWith("image/"),
              );
              if (files.length) {
                event.preventDefault();
                void attach(files);
              }
            }}
            maxLength={6000}
            rows={1}
            disabled={busy || mediaBusy || !enabled}
            className="fcos-chat-input max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 outline-none disabled:opacity-60"
            placeholder="Message fcOS…"
          />
          <VoiceInput
            disabled={busy || mediaBusy || !enabled}
            onActive={setMediaBusy}
            onNotice={setNotice}
            onText={(transcript) =>
              setText((previous) =>
                previous.trim() ? `${previous}\n${transcript}` : transcript,
              )
            }
          />
          <button
            aria-label={busy ? "Preparing reply" : "Send message"}
            title="Send message"
            disabled={
              busy ||
              mediaBusy ||
              !enabled ||
              text.length > 6000 ||
              (!text.trim() && !images.length)
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-zinc-950 disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {busy ? (
              <LoaderCircle
                size={20}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowUp size={22} aria-hidden="true" />
            )}
          </button>
        </div>
        <p
          role="status"
          className="mx-auto max-w-3xl px-2 pt-2 text-xs leading-5 text-zinc-600"
        >
          {(text.length > 6000
            ? "Shorten your message to 6,000 characters before sending."
            : notice) || (!enabled ? "Chat is currently paused." : "")}
        </p>
      </form>
    </section>
  );
}
