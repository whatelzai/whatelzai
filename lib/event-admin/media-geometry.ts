export type ImageTransform = { scale: number; x: number; y: number };
export function boundTransform(
  t: ImageTransform,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
): ImageTransform {
  const scale = Math.max(1, Math.min(5, t.scale));
  const fit =
    imageWidth > 0 && imageHeight > 0
      ? Math.min(width / imageWidth, height / imageHeight)
      : 1;
  const maxX = Math.max(0, (imageWidth * fit * scale - width) / 2),
    maxY = Math.max(0, (imageHeight * fit * scale - height) / 2);
  return {
    scale,
    x: Math.max(-maxX, Math.min(maxX, t.x)) || 0,
    y: Math.max(-maxY, Math.min(maxY, t.y)) || 0,
  };
}
