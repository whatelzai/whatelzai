/** Local-only decoder: ticket images never leave the browser. */
export async function decodeQrPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const { default: jsQR } = await import("jsqr");
  return (
    jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data ??
    null
  );
}
export async function decodeQrSource(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  if (!width || !height) return null;
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw Error("Image reading unavailable.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  return decodeQrPixels(pixels.data, pixels.width, pixels.height);
}
