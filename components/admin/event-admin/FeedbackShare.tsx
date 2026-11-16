"use client";
import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
export default function FeedbackShare({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="event-feedback-share">
      <label>
        Feedback link
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setMessage("Link copied.");
            } catch {
              setMessage("Select and copy the link above.");
            }
          }}
        >
          <Copy size={16} />
          Copy link
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} />
          Open form
        </a>
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
