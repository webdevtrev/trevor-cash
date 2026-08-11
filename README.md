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
| `contact/` | Contact page (`/contact`) — form handled by Netlify |
| `global.css` | Shared styles used by every page |
| `Components/` | Vanilla Web Components (`<custom-header>`, `<custom-footer>`) |
| `images/` | Site imagery |
| `assets/` | Hubot-Sans variable font |

## Running locally

Serve the repo root with any static file server:

```bash
npx serve .
```

Or open `index.html` directly in a browser.

## Deployment

Deployed via Netlify. Pushing to `main` triggers an automatic deploy.

