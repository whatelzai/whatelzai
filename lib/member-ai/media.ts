export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_CHAT_IMAGE_BYTES = 256 * 1024;
export const MAX_CONTEXT_IMAGES = 2;
export const VOICE_RATE = 16000;
export const VOICE_SECONDS = 60;
export function wavSamples(bytes: Uint8Array) {
  const b = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + 4));
  if (
    bytes.length < 3244 ||
    bytes.length > VOICE_RATE * VOICE_SECONDS * 2 + 44 ||
    tag(0) !== "RIFF" ||
    tag(8) !== "WAVE" ||
    tag(12) !== "fmt " ||
    tag(36) !== "data" ||
    b.getUint32(4, true) !== bytes.length - 8 ||
    b.getUint32(16, true) !== 16 ||
    b.getUint16(20, true) !== 1 ||
    b.getUint16(22, true) !== 1 ||
    b.getUint32(24, true) !== VOICE_RATE ||
    b.getUint32(28, true) !== VOICE_RATE * 2 ||
    b.getUint16(32, true) !== 2 ||
    b.getUint16(34, true) !== 16 ||
    b.getUint32(40, true) !== bytes.length - 44 ||
    (bytes.length - 44) % 2
  )
    throw Error("Choose a recording of up to one minute.");
  return (bytes.length - 44) / 2;
}
export function encodeVoice(samples: Float32Array[], rate: number) {
  const size = samples.reduce((n, x) => n + x.length, 0);
  const all = new Float32Array(size);
  let cursor = 0;
  for (const chunk of samples) {
    all.set(chunk, cursor);
    cursor += chunk.length;
  }
  const count = Math.min(
    VOICE_RATE * VOICE_SECONDS,
    Math.floor((size * VOICE_RATE) / rate),
  );
  const bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      bytes[offset + i] = text.charCodeAt(i);
  };
  tag(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, VOICE_RATE, true);
  view.setUint32(28, VOICE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * rate) / VOICE_RATE),
      end = Math.max(start + 1, Math.floor(((i + 1) * rate) / VOICE_RATE));
    let sum = 0;
    for (let j = start; j < end && j < all.length; j++) sum += all[j];
    const value = Math.max(-1, Math.min(1, sum / (end - start)));
    view.setInt16(
      44 + i * 2,
      Math.round(value * (value < 0 ? 32768 : 32767)),
      true,
    );
  }
  return bytes;
}
export async function limitedForm(request: Request, max: number) {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw Error("Upload too large.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("Upload unavailable.");
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw Error("Upload too large.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  return new Response(bytes, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
