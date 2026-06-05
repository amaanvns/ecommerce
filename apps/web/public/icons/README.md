# PWA Icons

The PWA install prompt and home-screen icon need three PNG files in this folder:

- `icon-192.png` — 192×192, transparent background, full-bleed (any-purpose)
- `icon-512.png` — 512×512, same as above
- `icon-maskable-512.png` — 512×512, with the design centered inside a safe area
  (the outer 10% of the canvas may be cropped on Android adaptive icon shapes)

Easiest path: use https://realfavicongenerator.net or https://maskable.app
with the STAR ENTERPRISES wordmark on a `#FAFAF7` (paper) background and ink (`#111111`)
type, then drop the three PNGs here.

Until those files exist, the manifest still validates but the install prompt
won't fire on Android.
