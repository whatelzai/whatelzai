// Both transports decode incrementally: network chunks need not align with lines,
// JSON objects, SSE events, or UTF-8 characters.
export async function* readLines(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let ended = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        if (newline > 1_000_000) throw Error("Reply stream is too large.");
        yield buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
      }
      if (buffer.length > 1_000_000) throw Error("Reply stream is too large.");
      if (done) {
        ended = true;
        break;
      }
    }
    if (buffer) yield buffer.replace(/\r$/, "");
  } finally {
    if (!ended) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function* readSse(body: ReadableStream<Uint8Array>) {
  let data = "";
  for await (const line of readLines(body)) {
    if (line === "") {
      if (data && data.trim() !== "[DONE]") yield JSON.parse(data);
      data = "";
    } else if (line.startsWith("data:")) {
      data += (data ? "\n" : "") + line.slice(5).replace(/^ /, "");
      if (data.length > 1_000_000) throw Error("Reply event is too large.");
    }
  }
  if (data && data.trim() !== "[DONE]") yield JSON.parse(data);
}

export async function readReply(
  response: Response,
  onText: (text: string) => void,
) {
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/x-ndjson")
  ) {
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error ?? "Your reply could not be prepared.");
    if (result.duplicate && result.status === "failed")
      throw Error(
        "Your previous reply failed. Reload to check its status before sending a new request.",
      );
    return result as { duplicate?: boolean; status?: string };
  }
  if (!response.body) throw Error("The reply stream is unavailable.");
  let complete = false;
  let length = 0;
  for await (const line of readLines(response.body)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type === "delta" && typeof event.text === "string") {
      length += event.text.length;
      if (length > 20000) throw Error("Reply is too long.");
      onText(event.text);
    } else if (event.type === "error") {
      throw Error(
        typeof event.error === "string"
          ? event.error
          : "Your reply was interrupted.",
      );
    } else if (event.type === "done") {
      complete = true;
    }
  }
  if (!complete)
    throw Error(
      "Connection interrupted. Reload to check the saved reply before retrying.",
    );
  return {};
}
