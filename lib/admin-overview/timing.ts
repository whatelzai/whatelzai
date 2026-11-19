import "server-only";

export async function timedRead<T>(
  source: string,
  read: () => PromiseLike<T>,
): Promise<T> {
  const started = Date.now();
  let outcome = "ok";
  try {
    return await read();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    console.info("admin-read", {
      source,
      duration_ms: Date.now() - started,
      outcome,
    });
  }
}
