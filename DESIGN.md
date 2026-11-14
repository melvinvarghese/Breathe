# Breathe — Design system v3

Evolves the approved v2 (`previews/V2/`): same sea-glass orb and teal-on-green-paper identity, with the generic template tells removed and the breath itself made the organising idea.

## Concept: the breath is a line
Every exercise is a shape in time: rise (inhale), plateau (hold), fall (exhale). One model (`buildModel` in `assets/js/app.js`) drives everything:
- the **orb scale** (so pause truly freezes it, holds after an exhale stay small, multi-step inhales like the physiological sigh climb in steps),
- the **trace** under the orb (a playhead shows what is coming),
- the **library glyphs** and **category index**, which show each pattern's real shape instead of decorative orbs.

Phase colours are semantic everywhere: inhale `--inhale` (sea), hold `--hold` (sand), exhale `--exhale` (deep teal). Two hairline rings mark the orb's full and empty extents.

## Type
System fonts only (privacy promise: no remote fonts). Display: humanist serif stack (Iowan Old Style / Palatino / Georgia), weight 400, -0.015em. UI: system sans. Headings `text-wrap: balance`, body `pretty`, `tabular-nums` for timers and counts. No all-caps labels, no numbered markers (nothing here is sequential).

## Tokens
See `:root` in `assets/css/styles.css`. Radius: 8 (inputs), 14 (buttons, search), 28 (practice stage), full for icon buttons and chips. One filled action colour; everything else is outline or quiet. Light text contrast (checked): ink 12.97, muted 5.3–5.7, action on paper 6.58, button label 6.82; dark: 6.7–15.

## Layout
Split hero → hairline category index (no cards) → filterable list (sticky rail; scrollable chip row on mobile) → note → FAQ → footer. Practice view: title, stage (orb + trace + controls, Start lives inside the stage), then pattern/guidance; on phones the stage sits directly under the title.

## Motion
One orchestrated moment on load (hero stagger + orb fade-in). Press feedback `scale(.97)` at 160ms with a strong ease-out. Hover only under `(hover: hover)`. No scroll reveals, no `transition: all`. The breathing motion is driven per frame from the model; under `prefers-reduced-motion` its amplitude is reduced (it is the content) and all decoration is removed.

## State and URLs
`?category=`, `?view=`, `?q=` mirror the library filters; `?exercise=<id>` deep-links to a practice. Canonical stays the site root. Storage keys and the backup format (`version: 1`) are unchanged.

## Files
`index.html` · `assets/css/styles.css` · `assets/js/exercises.js` (data) · `assets/js/app.js` · `sw.js` · `manifest.webmanifest` · `404.html`.
