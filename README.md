# Vice Cover — GTA-style Poster Maker

[![Rank](https://make.fun/badge/gta6-cover-art-01/chany0p/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/chany0p/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photos into a bold, GTA-style poster cover — multi-panel layouts, sunset/neon/noir grades, big condensed poster lettering, and one-click PNG export. All art, lettering, and fonts are original or freely licensed; there is no Rockstar logo, official artwork, or official font in this app.

## Run it offline

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. The app is plain static files under `app/` — no build step, no network requests at runtime. The two bundled fonts (Anton and Bebas Neue, both OFL) are vendored in `app/fonts/`, and the two sample photos live in `app/samples/`.

## Features

- **5 cover layouts**: 4-panel grid, hero + 3, full-bleed, 9-panel grid, tilted polaroid snapshots.
- **Per-panel photos**: upload your own (file picker or drag & drop onto the cover), click a panel to select it, drag to reposition, zoom slider. Two free sample photos included (boulevard, pier).
- **5 grades**: sunset, neon, noir, vice, heat — canvas gradient-map / overlay grades applied over the whole cover.
- **Caption editing**: main title + subtitle, three condensed fonts (Anton, Bebas Neue, system), size and colour, gradient fill, outline, drop shadow, top / centre / bottom position.
- **Polish**: film grain, vignette, badge ribbon, thin inner frame.
- **Export PNG** at 1080×1080, 1080×1350, and 1920×1080 — one click each, or all three at once.

## How it works

`app/src/cover.js` renders the whole cover onto a canvas at any size, so the live preview and every export share one renderer. `app/src/main.js` wires the editor UI and the `?shot=` screenshot scenes (`app/src/shots.js`).

## License

MIT — see `LICENSE`. Fonts: Anton and Bebas Neue, both under the SIL Open Font License 1.1. Sample photos were made for make.fun and are free to use.
