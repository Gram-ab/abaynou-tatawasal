# Responsive public hero image — 2026-10-21

Replaced the homepage hero with the owner's final supplied transparent PNG, archived unchanged as `design/public/abaynou_emblem_transparent.png` (2464 × 976; 2,823,511 bytes). The earlier JPEG upload was not used. Existing handoff/reference assets remain unchanged.

The three WebP files were resized independently from that PNG with Lanczos3 resampling, WebP quality 92, full alpha quality and no cropping, padding, background flattening, recoloring or regenerated artwork. Lossless alternatives were compared; the smaller quality-92 outputs were visually checked against the resized original, including lettering.

| File | Dimensions | Bytes |
| --- | --- | ---: |
| hero-commune-640.webp | 640 × 254 | 70,002 |
| hero-commune-1024.webp | 1024 × 406 | 149,688 |
| hero-commune-1600.webp | 1600 × 634 | 299,158 |

The browser chooses from this static width-based source set using layout width and pixel density. An equivalent responsive preload avoids downloading the desktop fallback as a second image. The hero alone bypasses runtime image transformations; other images retain their existing behavior. Next/Image retains intrinsic dimensions, alt text and high fetch priority. Existing hero spacing, RTL/LTR mirroring and mobile/tablet ordering are preserved. The non-rendering picture source is explicitly excluded from the grid layout.

Validation: six focused Chromium viewport/density cases PASS (AR desktop/tablet/mobile/320px; FR desktop; EN mobile). Checks cover successful image loading, all three selected variants, exactly one hero request, direct static delivery, desktop side-by-side alignment, smaller-screen image-first ordering, aspect ratio, transparent styling, no blend mode and no horizontal overflow. Desktop/tablet/mobile screenshots were visually reviewed. All generated files retain alpha transparency. Typecheck and lint PASS. The existing public-design assertion now expects the new WebP fallback. Production build PASS; no historical database/Auth/E2E suite was rerun for this asset-only update.

No database, authentication, session, complaint or notification behavior changed. The separate pending initial-Admin setup files are excluded from this hero commit.
