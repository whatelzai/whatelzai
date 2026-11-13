"use client";
import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { socialImage, type SocialFormat } from "@/lib/event-admin/social-image";
import { canSharePoster, sharePoster } from "@/lib/event-admin/sharing";
export default function SocialImageExport({
  source,
  filename,
}: {
  source: string;
  filename: string;
}) {
  const [format, setFormat] = useState<SocialFormat>("post"),
    [file, setFile] = useState<File | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [sharing, setSharing] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = "";
    fetch(source, { signal: abort.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error("Image unavailable. Refresh preview and retry.");
        const blob = await r.blob();
        if (!blob.type.startsWith("image/"))
          throw Error("Only photos can be exported in these formats.");
        return socialImage(blob, format, filename);
      })
      .then((f) => {
        if (abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(f);
        setFile(f);
        setUrl(objectUrl);
        setError("");
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, filename, format, retry]);
  return (
    <div className="social-export">
      <div className="social-format" aria-label="Image export format">
        {(
          [
            ["post", "Post 3:4"],
            ["story", "Story 9:16"],
            ["original", "Original"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={format === key}
            onClick={() => {
              if (format === key) return;
              setFile(null);
              setUrl("");
              setError("");
              setFormat(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {url && file ? (
        <div className="social-export-actions">
          <a href={url} download={file.name}>
            <Download size={17} />
            Download
          </a>
          {canSharePoster(navigator, file) && (
            <button
              disabled={sharing}
              type="button"
              onClick={async () => {
                setSharing(true);
                try {
                  await sharePoster(navigator, file);
                } catch {
                  setError(
                    "Share unavailable. Download and add the image in your app.",
                  );
                } finally {
                  setSharing(false);
                }
              }}
            >
              <Share2 size={17} />
              Share image
            </button>
          )}
        </div>
      ) : (
        !error && <p role="status">Preparing image…</p>
      )}
      {error && (
        <p role="alert">
          {error}
          <button
            type="button"
            onClick={() => {
              setError("");
              setFile(null);
              setUrl("");
              setRetry((v) => v + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      <small>Full image preserved. Nothing posts automatically.</small>
    </div>
  );
}
