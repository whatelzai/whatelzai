// Regenerate all Whatelz identity assets from the reviewed vector + palette.
// weOS and Whatelz Admin share this identity. Legacy /fcos paths stay compatible.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const brand = JSON.parse(
  await readFile(
    new URL("../public/brand/identity.json", import.meta.url),
    "utf8",
  ),
);
const root = new URL("../", import.meta.url);
const save = (path, data) => writeFile(new URL(path, root), data);
const svg = (body, viewBox = brand.viewBox) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const mark = (fill) => `<path fill="${fill}" d="${brand.path}"/>`;
const icon = (maskable = false) =>
  svg(
    `<rect width="512" height="512" fill="${brand.colors.yellow}"/><g transform="translate(${maskable ? "88 151" : "64 136"}) scale(${maskable ? ".65625" : ".75"})">${mark(brand.colors.ink)}</g>`,
    "0 0 512 512",
  );
for (const [name, color] of Object.entries(brand.colors))
  await save(`public/brand/mark-${name}.svg`, svg(mark(color)));
await save("public/brand/icon.svg", icon());
await save("public/admin-pwa/icon.svg", icon());
await save("public/fcos/icon.svg", icon());
for (const size of [32, 180, 192, 512]) {
  const png = await sharp(Buffer.from(icon()))
    .resize(size, size)
    .png()
    .toBuffer();
  await save(`public/brand/icon-${size}.png`, png);
  if (size !== 32) {
    await save(`public/admin-pwa/icon-${size}.png`, png);
    await save(`public/fcos/icon-${size}.png`, png);
    await save(`public/admin-pwa/icon-${size}-v2.png`, png);
  }
}
const maskable = await sharp(Buffer.from(icon(true)))
  .resize(512, 512)
  .png()
  .toBuffer();
await save("public/admin-pwa/icon-maskable-512.png", maskable);
await save("public/fcos/icon-maskable-512.png", maskable);
await save("public/admin-pwa/icon-maskable-512-v2.png", maskable);
// ICO directory with PNG entries; modern browsers support PNG-compressed ICO.
const sizes = [16, 32, 48];
const entries = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(icon())).resize(size, size).png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach((entry, i) => {
  const p = 6 + 16 * i;
  header[p] = sizes[i];
  header[p + 1] = sizes[i];
  header.writeUInt16LE(1, p + 4);
  header.writeUInt16LE(32, p + 6);
  header.writeUInt32LE(entry.length, p + 8);
  header.writeUInt32LE(offset, p + 12);
  offset += entry.length;
});
await save("app/favicon.ico", Buffer.concat([header, ...entries]));
// Transparent high-resolution standalone logo for external use.
await save(
  "public/brand/mark-yellow.png",
  await sharp(Buffer.from(svg(mark(brand.colors.yellow))))
    .resize(1024, 640)
    .png()
    .toBuffer(),
);
console.log("Generated Whatelz SVG, PNG, favicon and Admin PWA assets.");

// Outline Geist so the downloadable wordmark has no installed-font dependency.
// The existing Next.js font distribution supplies Geist under the SIL OFL.
const { default: fontkit } =
  await import("next/dist/compiled/@next/font/dist/fontkit/index.js");
const font = fontkit.default(
  await readFile(
    new URL(
      "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
      import.meta.url,
    ),
  ),
);
const run = font.layout("whatelz.ai");
let cursor = 0;
const letters = run.glyphs
  .map((glyph, i) => {
    const pos = run.positions[i];
    const letter = `<path transform="translate(${cursor + pos.xOffset} ${pos.yOffset})" d="${glyph.path.toSVG()}"/>`;
    cursor += pos.xAdvance - 35;
    return letter;
  })
  .join("");
const wordWidth = (cursor + 35) * 0.15;
for (const [name, color] of Object.entries(brand.colors)) {
  const logo = svg(
    `<g transform="translate(8 30) scale(.29)">${mark(color)}</g><g fill="${color}" stroke="${color}" stroke-width="14" stroke-linejoin="round" transform="translate(180 130) scale(.15 -.15)">${letters}</g>`,
    `0 0 ${Math.ceil(190 + wordWidth)} 152`,
  );
  await save(`public/brand/logo-${name}.svg`, logo);
  await save(
    `public/brand/logo-${name}.png`,
    await sharp(Buffer.from(logo)).resize(1600).png().toBuffer(),
  );
}
