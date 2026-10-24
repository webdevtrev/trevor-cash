# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Trevor Cash's personal portfolio site (webdevtrev.io / trevorcash.com). It is a **static, vanilla HTML/CSS/JS site with no build step, no bundler, and no package.json** — pages are plain `.html` files loading plain `.css` and ES module `.js` files directly via `<script type="module">`. There is no npm install, no build command, no test suite, and no linter configured.

## Running locally

Serve the repo root with any static file server, e.g.:
```
npx serve .
```
or open `index.html` directly in a browser. There is no dev server or hot reload built into the project.

## Deployment

Deployed via Netlify (see the contact form's `netlify` attribute in [contact/index.html](contact/index.html), which relies on Netlify's built-in form handling — no backend code exists for form submission). Pushing to `main` on the `webdevtrev/trevor-cash` GitHub repo is expected to trigger a Netlify deploy. `_redirects` at the repo root blocks `/studio` and `/studio/*` (status `404!`, forced because the files exist on disk); it does not touch the other routes or the form.

## Photos & Sanity Studio

Photos are content in Sanity (dataset `production`, document types `photo`: image, title, optional alt, takenAt, location, caption, featured, optional `series` reference, optional `people` (references to `person`), optional `tone` (colour/bw), `filmStock` and `frame`; and `series`: title, slug, description, location, date, coverPhoto; and `person`: name, used only for tagging photos in the Studio, the public site does not read it). The Studio has a Bulk upload tool (`studio/src/BulkUpload.jsx`) that stages many files, applies shared details (series, film type, colour/B&W, date taken, location) on an explicit Upload press, and creates one draft photo per file, titled from the filename and editable in the staged list (or publishes them straight away when "Publish immediately" is ticked); the staged list can be reordered (drag or arrows) and each photo's position becomes its frame number; Reset clears the batch. The public `/photos` page shows series. The Studio lives in `studio/`; the site reads the public dataset through the CDN API, so the dataset must be public and the site's origins must be in the project's CORS list (without credentials).

Run the Studio locally (needs Node >= 22.12):
```
cd studio && npm install && npm run dev   # http://localhost:3333
```
Deploy the Studio to Sanity's hosting with `cd studio && npx sanity deploy`. Netlify never builds or serves it.

When changing the schema, update the GROQ query in `photos/app.js` too. `photos/style.css` overrides the global grayscale `img` filter, since gallery photos must show in colour.

## Site structure

Each route is its own directory with a self-contained `index.html`, `style.css`, and `app.js` (page-specific behavior), plus shared root-level files:
- `index.html` / `app.js` / `style.css` — Home page (`/`)
- `about/` — About page (`/about`)
- `portfolio/` — Portfolio page (`/portfolio`)
- `photos/` — Photo gallery (`/photos`): `index.html`, `style.css`, `app.js` plus `config.js` (the Sanity `PROJECT_ID`/`DATASET`, the only place the public site stores them). `app.js` fetches photos from the Sanity HTTP API with plain `fetch` (no `@sanity/client`) and is a small hash-routed page (`#/` overview with film-strip hero and series list, `#/index` masonry grid, `#/series/<slug>` series page with a Frames/Grid toggle (the grid has the same colour filter and S/M/L size as the index), matching the Claude Design mockup "Cash Photography") with loading/empty/error states. The page loads Archivo and IBM Plex Mono from Google Fonts in its own `<head>` (gallery content only; the footer keeps Hubot Sans). The page deliberately has **no `<custom-header>`** (its own sub-nav replaces it) and is **not linked from the site nav**: it is shared by direct URL for now. Add `Photos` to the `pages` array in `Components/header.js` to publish it
- `studio/` — Sanity Studio for the photo gallery. **The only part of the repo with dependencies** (its own `package.json`; never add one at the repo root). It is not part of the public site: `_redirects` forces `/studio` and `/studio/*` to 404
- `contact/` — Contact page (`/contact`), has a Netlify-powered contact form
- `global.css` — shared styles/resets used by every page (font-face, dark mode, header/footer, base typography)
- `style.css` (root) — home-page-specific styles; each route directory has its own `style.css` for page-specific styles
- `Components/` — vanilla Web Components (Custom Elements), shared across pages via `<script type="module">` imports:
  - `header.js` defines `<custom-header>` — renders nav links and the dark-mode toggle button, reads/writes `localStorage.dark`, page directories pass `page="About"` etc. as an attribute for the header to know the active page
  - `footer.js` defines `<custom-footer>` — just a copyright line
  - `photo-lightbox.js` defines `<photo-lightbox>` — modal photo viewer for `/photos`, built on `<dialog>.showModal()` (Esc closes, arrows navigate, Tab wraps, focus returns to the opener). Its styles live in `photos/style.css`
- `images/` — all site imagery (logos, project screenshots, personal photos)
- `assets/` — the `Hubot-Sans.woff2` variable font, preloaded in every page's `<head>`

Every page independently repeats the same `<head>` boilerplate (font preload, `global.css` + local `style.css` links, header/footer component script tags, Google Analytics `gtag.js` snippet with tracking ID `G-15G72Q4KRZ`). There's no shared templating — when editing shared boilerplate (e.g. the GA snippet or font preload), it must be updated in each `index.html` individually.

## Conventions to follow

- No framework, no build tooling, no dependencies — keep additions to plain HTML/CSS/JS consistent with the existing style.
- Web Components are defined with the raw Custom Elements API (`class extends HTMLElement`, `customElements.define`), not any component framework.
- Dark mode is a single `.Dark` class toggled on `<body>`, persisted via `localStorage.dark`, styled with `.Dark` overrides at the bottom of `global.css`.
- CSS class names use PascalCase (e.g. `.Skill-Cards`, `.Placeholder-Height`), not BEM or utility classes.
- Relative paths differ by depth: root-level pages reference `./images/...` and `./Components/...`; pages inside a route directory (e.g. `about/`) reference `../images/...` and `../Components/...`.
