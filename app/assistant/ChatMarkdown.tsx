import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const ChatMarkdown = memo(function ChatMarkdown({
  body,
}: {
  body: string;
}) {
  return (
    <div className="prose prose-sm prose-zinc min-w-0 max-w-none break-words text-[15px] leading-7 [overflow-wrap:anywhere] prose-headings:font-semibold prose-headings:tracking-tight prose-p:my-3 prose-a:underline prose-pre:max-w-full prose-pre:overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          table: ({ children }) => (
            <div
              role="region"
              aria-label="Reply table"
              tabIndex={0}
              className="my-4 max-w-full overflow-x-auto rounded-xl border border-zinc-200"
            >
              <table className="!my-0 min-w-full text-left">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-zinc-50 px-3 py-2 align-top whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top">{children}</td>
          ),
          // Model/source images must not trigger automatic third-party requests.
          img: ({ alt }) => <span>{alt || "Image"}</span>,
          a: ({ href, children }) => (
            <a href={href} rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
});
