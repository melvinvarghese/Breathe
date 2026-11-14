# Breathe

A quiet, browser-based space for guided breathing exercises. Breathe is designed to feel calm and uncomplicated: begin with an optional three-cycle introduction, or go straight to the exercise library.

**Live site:** https://melvinvarghese.github.io/Breathe/

## What is included

- A glass-orb breathing guide with inhale, pause and exhale phases
- An optional three-cycle introduction that can be paused, restarted or skipped
- 24 starter exercises across six categories
- Search and category filtering
- Focused practice sessions with adjustable duration, pause, restart and fullscreen controls
- Optional audio cues and spoken phase guidance
- Light and dark themes
- Recent-practice details stored locally in the browser
- Installable web-app support and an offline app shell on supported browsers
- Keyboard navigation and reduced-motion support

## Privacy by design

Breathe does not require an account and does not use analytics, advertising, remote fonts or third-party APIs. Theme, voice preference and recent-practice details are stored locally in the browser. The service worker caches the app shell so it can reopen offline after the first successful visit.

## Run locally

Open `index.html` in a browser to use the core experience. For testing install and offline behaviour, serve the folder over localhost (service workers require a secure context such as HTTPS or localhost).

## Project files

- `index.html` — page structure, metadata and structured data
- `assets/css/styles.css` — design tokens and components
- `assets/js/exercises.js` — the 24 exercises (data)
- `assets/js/app.js` — breath model, guided sessions, library, preferences
- `manifest.webmanifest` — install and display settings
- `sw.js` — app-shell caching for offline use
- `404.html` — not-found page for GitHub Pages
- `icon.svg` — app icon
- `DESIGN.md` — v3 design system
- `previews/V2/` — earlier approved v2 reference, notes and test report

## Safety note

Breathing patterns are optional starting points, not medical treatment. Never force a count or hold. Stop and return to natural breathing if you feel dizzy, strained or light-headed. Do not practise timed breathing or breath holds while driving or in water. The exercise content is general wellbeing guidance and is not clinically validated.

## Deployment

The site is served from the `main` branch using GitHub Pages. The manifest and service worker are relative-path aware for the `/Breathe/` project site.
