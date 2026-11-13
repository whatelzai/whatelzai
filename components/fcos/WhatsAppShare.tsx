"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { whatsappHref } from "@/lib/fcos/whatsapp";

export function WhatsAppShare({ text }: { text: string }) {
  const [copyStatus, setCopyStatus] = useState("");
  if (!text.trim()) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      <a
        href={whatsappHref(text)}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 px-4 text-zinc-700 hover:bg-zinc-50"
        aria-label="Share to WhatsApp"
      >
        <Share2 size={15} aria-hidden="true" /> Share to WhatsApp
      </a>
      <button
        type="button"
        className="min-h-11 underline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopyStatus("Copied");
          } catch {
            setCopyStatus(
              "Could not copy. Select and copy the message instead.",
            );
          }
        }}
      >
        Copy text
      </button>
      {copyStatus && <span role="status">{copyStatus}</span>}
    </div>
  );
}
