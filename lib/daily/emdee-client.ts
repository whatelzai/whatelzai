import "server-only";
import { randomUUID } from "node:crypto";
import type { EmdeeConnection } from "./connections";
export type Envelope = {
  authored_at?: string;
  last_edited_at?: string;
  content?: string;
  doc_content_hash: string;
  sections: { heading: string; content_hash: string }[];
  error?: string;
};
export async function emdeeCall<T>(
  connection: EmdeeConnection,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!connection.parentPath || connection.expiresAt <= Date.now())
    throw new Error("Reconnect EMDEE before using Daily.");
  const origin = new URL(process.env.EMDEE_ORIGIN || "https://emdee.tech");
  if (origin.protocol !== "https:")
    throw new Error("EMDEE requires a secure connection.");
  const res = await fetch(new URL("/api/mcp", origin), {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${connection.token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "tools/call",
      params: {
        name: ["get_doc", "search", "list_docs", "read_doc_section"].includes(
          name,
        )
          ? "read"
          : "write",
        arguments: { action: name, arguments: args },
      },
    }),
  });
  if (!res.ok)
    throw new Error("EMDEE is unavailable or its connection needs renewing.");
  const raw = await res.text();
  const rpc = JSON.parse(
    res.headers.get("content-type")?.includes("text/event-stream")
      ? raw
          .split(/\r?\n/)
          .find((l) => l.startsWith("data:"))!
          .slice(5)
      : raw,
  );
  // EMDEE also reports exact missing paths as JSON-RPC internal errors.
  // Match the documented response for this exact read, never arbitrary errors.
  if (
    name === "get_doc" &&
    typeof args.path === "string" &&
    rpc.error?.code === -32603 &&
    rpc.error?.message === `no such doc: ${args.path}`
  )
    throw new MissingDocument();
  if (rpc.error)
    throw new Error(
      "EMDEE could not complete this request. Your text has been kept in the editor.",
    );
  const resultText = rpc.result?.content?.find(
    (c: { type: string }) => c.type === "text",
  )?.text;
  if (
    name === "get_doc" &&
    typeof args.path === "string" &&
    rpc.result?.isError &&
    resultText === `no such doc: ${args.path}`
  )
    throw new MissingDocument();
  const result = JSON.parse(resultText);
  if (result.error) {
    if (
      name === "get_doc" &&
      (result.error === "not_found" || result.error === "no_such_doc")
    )
      throw new MissingDocument();
    throw new Error(
      "EMDEE rejected the change. Reload to check the latest document before saving.",
    );
  }
  if (rpc.result?.isError)
    throw Error("EMDEE could not complete this request.");
  return result as T;
}
class MissingDocument extends Error {}
export async function readEmdee(
  connection: EmdeeConnection,
  path: string,
): Promise<Envelope | null> {
  // One exact read. Only an explicit missing-document result is absence;
  // authentication, transport and malformed-response errors still fail closed.
  try {
    return await emdeeCall<Envelope>(connection, "get_doc", {
      path,
      full: true,
    });
  } catch (error) {
    if (error instanceof MissingDocument) return null;
    throw error;
  }
}
