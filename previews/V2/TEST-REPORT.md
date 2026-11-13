# Breathe prototype v2 — test report

## Passed

- HTML parsed and structural checks passed.
- No duplicate element IDs.
- All JavaScript `getElementById` references resolve to an element in the page.
- All in-page anchor targets exist.
- No unnamed buttons found in the static markup.
- CSS parsed with no syntax errors.
- JavaScript passed `node --check`.
- Six category tiles and 24 exercise definitions are present.
- No remote images, scripts, stylesheets or font dependencies are referenced.
- Reduced-motion stylesheet is present.
- Main text contrast pairs tested at or above WCAG AA 4.5:1:
  - Light body text: 7.71:1
  - Light muted text: 4.77:1
  - Primary button text: 6.82:1
  - Dark body text: 11.44:1
  - Dark muted text: 8.15:1
- A mocked-DOM interaction smoke test passed for rendering, category filtering, search, opening a practice, timer updates, pause/resume, restart, completion, modal close, focus restoration, Escape close, the three-cycle introductory exercise and theme switching.

## Not verified

- A real Chromium screenshot review at desktop and mobile viewport sizes could not be completed in this environment. The available Chromium browser is blocked/hangs during headless startup, and downloading a separate browser is unavailable due to network restrictions.
- This is a prototype, not a clinically validated breathing programme. Exercise content, suitability and safety language need a final review before public launch.
- Offline/PWA installation and real-device assistive-technology testing have not been completed.

## Scope

This package is a local prototype only. No files were pushed to the GitHub repository.
