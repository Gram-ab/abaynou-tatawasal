# Public Visual Assets

All assets in this folder are ready for direct development use. The official commune artwork is preserved; do not regenerate or rewrite its embedded identity.

| Asset | Dimensions | Transparency | Intended use |
| --- | ---: | --- | --- |
| `commune-emblem-abaynou.png` | 1600×960 | RGBA | Full formal commune identity when there is enough space |
| `commune-mark-abaynou.png` | 1200×523 | RGBA | Compact public/citizen header mark beside “أباينو تتواصل” |
| `abaynou-architecture-transparent.png` | 650×390 | RGBA | Homepage and authentication illustration |
| `zellige-edge-transparent.png` | 175×430 | RGBA | Very faint hero-edge ornament only |
| `.webp` equivalents | Same aspect ratio | Alpha | Optional optimized delivery versions |

## Placement rules

### Header mark

```css
.brand img {
  width: 88px;
  height: 52px;
  object-fit: contain;
}

@media (max-width: 820px) {
  .brand img { width: 72px; height: 43px; }
}
```

Do not add a white tile, badge, border, circle, or shadow behind the mark.

### Architecture illustration

```css
.hero-illustration {
  width: 100%;
  max-height: 390px;
  object-fit: contain;
}
```

The supplied PNG already has alpha. Do not use `mix-blend-mode`, a mask, or CSS background removal.

### Zellige edge

```css
.hero-zellige {
  position: absolute;
  inset-inline-end: -55px;
  top: 0;
  width: 155px;
  height: 400px;
  object-fit: contain;
  opacity: .28;
  pointer-events: none;
}

@media (max-width: 820px) {
  .hero-zellige { display: none; }
}
```

The motif must stay at the outer edge and must not compete with text. Do not repeat it as a page background.

## Optimization guidance

- Prefer PNG for the official identity when exact edge fidelity matters.
- Prefer transparent WebP for the architecture and zellige in production if the framework optimizes images correctly.
- Preserve aspect ratio; never stretch assets.
- Use explicit width/height or aspect ratio to prevent layout shift.
- Decorative zellige uses `alt=""`; the architecture illustration needs a concise descriptive Arabic/French alt.

