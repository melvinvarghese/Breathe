# Breathe — Design system v2

## Product point of view
Breathe is a browser-based breathing guide. The first action is an optional three-cycle reset; the exercise library remains available by scrolling at any time. The interface should help people follow a comfortable breathing rhythm without forcing completion or turning the experience into a dashboard.

## Visual direction
- **Brand presence:** small wordmark; the breathing experience is the focus.
- **Style:** optical minimalism with a restrained editorial layout.
- **Signature object:** a hand-authored SVG glass sphere with layered refraction, airflow filaments and a soft grounded shadow. It expands on inhale, holds during a pause and contracts on exhale.
- **Layout:** asymmetrical split hero, six-category bento composition with a wide final tile, compact filtered exercise directory, and focused full-screen practice view.
- **Typography:** system sans-serif stack; no remote fonts.
- **Artwork:** inline SVG and CSS only; no stock photographs, generated mockups, icon fonts or external assets.

## Tokens
| Token | Light | Dark |
|---|---|---|
| paper | `#f2f6f2` | `#101f1c` |
| paper-2 | `#eaf1ec` | `#152a25` |
| surface | `#fbfdfb` | `#1a302a` |
| ink | `#16312b` | `#e8f2ed` |
| ink-2 | `#36534b` | `#c6d8cf` |
| muted | `#586e65` | `#a1b9ae` |
| action | `#1d6255` | `#9bcdbb` |
| mint | `#9dcbbb` | `#5f9b87` |
| sea | `#88bdb8` | `#4f8e8d` |
| peach | `#e5c1a5` | `#bd9170` |

- Radius family: 12 / 18 / 28px, with pill controls only where the control semantics call for it.
- Spacing is built on a compact 4px-derived scale.
- One filled action colour; secondary controls use outline or quiet surface treatment.
- Text contrast is checked against the background tokens; focus states are visible.

## Interaction model
- Introductory exercise: 4s inhale / 2s optional pause / 6s exhale, repeated 3 times (36 seconds total).
- Intro can be paused, restarted, or skipped; scrolling is never locked.
- Six categories: Settle, Focus, Rest, Awareness, Techniques and Energy.
- Twenty-four starter exercises; directory supports live search and category filters.
- Each exercise opens a focused session view with a duration selector, start, pause, restart, fullscreen and close controls.
- Theme preference is stored locally only. No analytics, account, API or network font is used.

## Accessibility and safety
- Semantic headings, navigation, buttons, labels, search input and dialog semantics.
- Keyboard Escape closes the session; focus is trapped in the dialog and returned to its trigger.
- Reduced-motion preference reduces animation.
- No audio autoplay.
- Breathing instructions are presented as optional starting points. Holds can be skipped; users are told to stop if dizzy, strained or light-headed.

## Prototype limitations
This is a design and interaction prototype, not a clinically validated breathing program. Durations and descriptions need a final content review before public launch. It does not yet include a PWA manifest/service worker or a dedicated help/about page. The container's browser automation is blocked, so HTML structure, CSS parsing, JavaScript syntax and mocked interaction smoke tests pass. A true browser screenshot review at desktop and phone widths remains outstanding because Chromium is blocked in this environment.
