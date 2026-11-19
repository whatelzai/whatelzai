/** Keep generation/settlement alive if the reader leaves. The route registers
 * `finished` with Next after(), within its existing maxDuration. */
export function createReplyStream(
  generate: (onText: (text: string) => void) => Promise<Response>,
) {
  const encoder = new TextEncoder();
  let connected = true;
  let finished!: Promise<void>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: unknown) => {
        if (!connected) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          connected = false;
        }
      };
      emit({ type: "start" });
      finished = (async () => {
        try {
          const result = await generate((text) =>
            emit({ type: "delta", text }),
          );
          const value = await result.json();
          emit(
            result.ok
              ? { type: "done", ...value }
              : { type: "error", error: value.error },
          );
        } catch {
          emit({
            type: "error",
            error:
              "Reply interrupted. Reload to check its status before retrying; its allowance may remain reserved.",
          });
        } finally {
          if (connected) controller.close();
        }
      })();
    },
    cancel() {
      connected = false;
    },
  });
  return {
    response: new Response(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    }),
    finished,
  };
}
