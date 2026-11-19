import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Read-only presentation; canonical Markdown and editor contents stay intact. */
export function BriefMarkdown({ body }: { body: string }) {
  return (
    <div className="prose prose-sm prose-zinc min-w-0 max-w-none break-words [overflow-wrap:anywhere] prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-zinc-900 prose-pre:overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          table: ({ children }) => (
            <div
              className="my-5 max-w-full overflow-x-auto rounded-xl border border-zinc-200"
              role="region"
              aria-label="Briefing table"
              tabIndex={0}
            >
              <table className="!my-0 min-w-[32rem] text-left">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-zinc-50 px-3 py-2 align-top">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top">{children}</td>
          ),
          // Briefs are text: avoid automatic requests to embedded image URLs.
          img: ({ alt }) => <span>{alt || "Image"}</span>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
