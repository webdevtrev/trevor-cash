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

Deployed via Netlify (see the contact form's `netlify` attribute in [contact/index.html](contact/index.html), which relies on Netlify's built-in form handling — no backend code exists for form submission). Pushing to `main` on the `webdevtrev/trevor-cash` GitHub repo is expected to trigger a Netlify deploy.

## Site structure

Each route is its own directory with a self-contained `index.html`, `style.css`, and `app.js` (page-specific behavior), plus shared root-level files:
- `index.html` / `app.js` / `style.css` — Home page (`/`)
- `about/` — About page (`/about`)
- `portfolio/` — Portfolio page (`/portfolio`)
- `contact/` — Contact page (`/contact`), has a Netlify-powered contact form
- `global.css` — shared styles/resets used by every page (font-face, dark mode, header/footer, base typography)
- `style.css` (root) — home-page-specific styles; each route directory has its own `style.css` for page-specific styles
- `Components/` — vanilla Web Components (Custom Elements), shared across pages via `<script type="module">` imports:
  - `header.js` defines `<custom-header>` — renders nav links and the dark-mode toggle button, reads/writes `localStorage.dark`, page directories pass `page="About"` etc. as an attribute for the header to know the active page
  - `footer.js` defines `<custom-footer>` — just a copyright line
- `images/` — all site imagery (logos, project screenshots, personal photos)
- `assets/` — the `Hubot-Sans.woff2` variable font, preloaded in every page's `<head>`

Every page independently repeats the same `<head>` boilerplate (font preload, `global.css` + local `style.css` links, header/footer component script tags, Google Analytics `gtag.js` snippet with tracking ID `G-15G72Q4KRZ`). There's no shared templating — when editing shared boilerplate (e.g. the GA snippet or font preload), it must be updated in each `index.html` individually.

## Conventions to follow

- No framework, no build tooling, no dependencies — keep additions to plain HTML/CSS/JS consistent with the existing style.
- Web Components are defined with the raw Custom Elements API (`class extends HTMLElement`, `customElements.define`), not any component framework.
- Dark mode is a single `.Dark` class toggled on `<body>`, persisted via `localStorage.dark`, styled with `.Dark` overrides at the bottom of `global.css`.
- CSS class names use PascalCase (e.g. `.Skill-Cards`, `.Placeholder-Height`), not BEM or utility classes.
- Relative paths differ by depth: root-level pages reference `./images/...` and `./Components/...`; pages inside a route directory (e.g. `about/`) reference `../images/...` and `../Components/...`.
