# Whatelz.ai identity

Approved direction: the rounded W with a subtle smile counterform (concept 01 of the second exploration, approved by Edmund). The flat vector follows the approved silhouette; it is not a crop of the concept sheet.

## Source and colours

`public/brand/identity.json` is the authoritative vector path, viewBox and palette. `WhatelzMark` consumes that source directly. Regenerate exports with `node scripts/generate-brand-assets.mjs`.

- Yellow: **#FACC15**, the existing primary brand colour.
- Ink: **#18181B**.
- Warm white: **#FFFCF5**.
- Wordmark: lowercase **whatelz.ai**, Geist Sans semibold, tight spacing. Use the website's loaded Geist font for the live lockup.

Use a single flat fill. Yellow on ink, ink on yellow, and ink on warm white are preferred; yellow on light backgrounds is a decorative brand accent, not text. Do not stretch, rotate, add eyes, gradients, outlines or shadows. Keep at least one-quarter mark-height clear space. Minimum digital mark width: 24px; use icon assets for tiny browser tabs.

## Assets

- `/brand/logo-{yellow,ink,paper}.svg` and corresponding PNGs: complete outlined logo lockups; Geist glyphs are outlined from the existing Next.js font distribution (SIL OFL). No external font required to open an exported SVG.
- `/brand/mark-yellow.svg`, `/brand/mark-ink.svg`, `/brand/mark-paper.svg`: transparent vector symbols.
- `/brand/mark-yellow.png`: transparent 1024×640 symbol.
- `/brand/icon.svg`, `/brand/icon-{32,180,192,512}.png`: ink symbol on a full-bleed yellow background.
- `/favicon.ico`: 16, 32 and 48px PNG-compressed entries.
- Admin PWA has versioned PNG URLs to refresh browser asset caches, with an independently padded maskable export. Keep all artwork inside the central safe circle; let the OS choose the outer icon mask.

Admin Settings → Brand & design system displays previews, palette and downloadable assets. The public header/footer and Admin header use the shared vector. fcOS retains its separate product branding.

## Installed apps

Manifest ID, scope and launch URL remain unchanged. Chromium may refresh installed icons after its manifest update cycle. iOS home-screen artwork can remain fixed to the installation-time image; removing and re-adding the shortcut may be necessary to see the new icon. Updating the website cannot force an immediate OS home-screen refresh.

## Social image formats

Default future event poster art direction: 3:4 portrait,1080×1440, for feed/carousel assets. Prepare a separate9:16,1080×1920 Story version. Do not assume one crop works for both. Keep important text within comfortable margins and inspect each output. Admin Share/Media exports support these sizes plus Original; existing artwork is contained on a warm-white canvas to preserve every face and text block. These are file exports for manual assembly/publication in the receiving app, not automatic posting or a multi-slide content composition engine.
