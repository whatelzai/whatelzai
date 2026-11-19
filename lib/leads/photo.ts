import sharp from "sharp";
export async function prepareLeadPhoto(bytes: Buffer) {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024)
    throw Error("Choose a photo under 3 MB.");
  const image = sharp(bytes, { limitInputPixels: 25_000_000, animated: false });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
    throw Error("Choose a JPG, PNG or WebP photo.");
  return image
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
}
