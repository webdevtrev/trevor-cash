# trevor-cash

Personal portfolio website for Trevor Cash, a web developer. The site lives at [webdevtrev.io](https://webdevtrev.io) / [trevorcash.com](https://trevorcash.com) and showcases projects, skills, and contact information.

## Tech stack

Static, vanilla HTML/CSS/JS — no framework, no bundler, no build step. Pages are plain `.html` files that load plain `.css` and ES module `.js` files directly in the browser.

## Structure

| Path | Description |
|---|---|
| `index.html` | Home page (`/`) |
| `about/` | About page (`/about`) |
| `portfolio/` | Portfolio page (`/portfolio`) |
| `photos/` | Photo gallery (`/photos`), fed by Sanity |
| `studio/` | Sanity Studio (own `package.json`; not served publicly) |
| `contact/` | Contact page (`/contact`) — form handled by Netlify |
| `global.css` | Shared styles used by every page |
| `Components/` | Vanilla Web Components (`<custom-header>`, `<custom-footer>`, `<photo-lightbox>`) |
| `images/` | Site imagery |
| `assets/` | Hubot-Sans variable font |

## Running locally

Serve the repo root with any static file server:

```bash
npx serve .
```

Or open `index.html` directly in a browser.

## Photo gallery & Sanity Studio

The `/photos` page reads photos from a Sanity project (dataset `production`) using the public HTTP API. Edit the project ID in `photos/config.js` (and `studio/sanity.config.js` + `studio/sanity.cli.js`).

Run the Studio locally (Node 22.12 or newer):

```bash
cd studio
npm install
npm run dev   # http://localhost:3333
```

In the Studio, add **People** and tag them on photos, and group photos into optional **Series**, and use the **Bulk upload** tool (top bar): add many images, optionally set a series, film type, colour/B&W and location for the whole batch, reorder the list (drag or arrows; the order becomes the frame numbers), press **Upload**, then **Reset** to start the next batch. Each image becomes a draft photo (tick **Publish immediately** to skip drafts); optionally add alt text, then publish each.

Deploy the Studio to Sanity's hosting:

```bash
cd studio
npx sanity deploy
```

One-time Sanity setup: the dataset must be public, and CORS origins are needed for the site's domains and `http://localhost:3000` (add without credentials) and for `http://localhost:3333` (with credentials, for the local Studio).

## Deployment

Deployed via Netlify. Pushing to `main` triggers an automatic deploy. `_redirects` keeps `/studio/*` from being served.

