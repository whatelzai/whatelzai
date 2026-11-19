export type SocialFormat = "post" | "story" | "original";
export const socialSizes = {
  post: { width: 1080, height: 1440 },
  story: { width: 1080, height: 1920 },
};
export function containRect(
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
) {
  if (
    ![width, height, targetWidth, targetHeight].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    throw Error("Image dimensions unavailable.");
  const ratio = Math.min(targetWidth / width, targetHeight / height);
  const w = width * ratio,
    h = height * ratio;
  return {
    x: (targetWidth - w) / 2,
    y: (targetHeight - h) / 2,
    width: w,
    height: h,
  };
}
export async function socialImage(
  blob: Blob,
  format: SocialFormat,
  filename: string,
) {
  if (format === "original")
    return new File([blob], filename, { type: blob.type });
  const bitmap = await createImageBitmap(blob);
  try {
    const { width, height } = socialSizes[format];
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    if (!c) throw Error("Image export unavailable.");
    c.fillStyle = "#faf9f5";
    c.fillRect(0, 0, width, height);
    const r = containRect(bitmap.width, bitmap.height, width, height);
    c.drawImage(bitmap, r.x, r.y, r.width, r.height);
    const output = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Image export failed."))),
        "image/png",
      ),
    );
    return new File(
      [output],
      `${filename.replace(/\.[^.]+$/, "")}-${format === "post" ? "3x4" : "9x16"}.png`,
      { type: "image/png" },
    );
  } finally {
    bitmap.close();
  }
}
