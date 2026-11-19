// weOS: the reviewed Whatelz W, with the Admin icon's colours reversed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../", import.meta.url);
const brand = JSON.parse(
  await readFile(new URL("public/brand/identity.json", root), "utf8"),
);
await mkdir(new URL("public/weos/", root), { recursive: true });
const save = (path, data) => writeFile(new URL(path, root), data);
const icon = (maskable = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${brand.colors.ink}"/><g transform="translate(${maskable ? "88 151" : "64 136"}) scale(${maskable ? ".65625" : ".75"})"><path fill="${brand.colors.yellow}" d="${brand.path}"/></g></svg>`;
await save("public/weos/icon-v1.svg", icon());
await save("public/fcos/icon.svg", icon());
for (const size of [32, 180, 192, 512]) {
  const png = await sharp(Buffer.from(icon()))
    .resize(size, size)
    .png()
    .toBuffer();
  await save(`public/weos/icon-${size}-v1.png`, png);
  if (size !== 32) await save(`public/fcos/icon-${size}.png`, png);
}
const maskable = await sharp(Buffer.from(icon(true)))
  .resize(512, 512)
  .png()
  .toBuffer();
await save("public/weos/icon-maskable-512-v1.png", maskable);
await save("public/fcos/icon-maskable-512.png", maskable);
console.log("Generated weOS dark-background/yellow-W icons.");
