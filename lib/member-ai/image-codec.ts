import sharp from "sharp";
import { MAX_UPLOAD_BYTES, MAX_CHAT_IMAGE_BYTES } from "./media";
export async function prepareChatImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES)
    throw Error("Choose a photo under 3 MB.");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp) throw Error("Choose a JPG, PNG or WebP photo.");
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
    throw Error("Choose a JPG, PNG or WebP photo.");
  const output = await image
    .rotate()
    .resize({
      width: 1024,
      height: 1024,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  if (output.length > MAX_CHAT_IMAGE_BYTES)
    throw Error("This image is too detailed. Crop it and try again.");
  return output;
}
