import { PROJECT_ID, DATASET, API_VERSION } from "./config.js";

const QUERY = `*[_type == "photo" && defined(image.asset)] | order(takenAt desc, _createdAt desc) {
  _id,
  title,
  alt,
  takenAt,
  location,
  caption,
  featured,
  "url": image.asset->url,
  "dimensions": image.asset->metadata.dimensions,
  "lqip": image.asset->metadata.lqip
}`;
const ENDPOINT = `https://${PROJECT_ID}.apicdn.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(QUERY)}`;

const WIDTHS = [240, 480, 800, 1200, 1800];
// Match the column widths in style.css for each density.
const SIZES = {
  S: "(max-width: 600px) 34vw, 220px",
  M: "(max-width: 600px) 50vw, 340px",
  L: "(max-width: 600px) 100vw, 520px",
};

const grid = document.getElementById("grid");
const status = document.getElementById("status");
const count = document.getElementById("count");
const density = document.querySelector(".Density");
const strip = document.getElementById("strip");
const stripTrack = document.getElementById("strip-track");
const lightbox = document.getElementById("lightbox");

const imageUrl = (base, w) => `${base}?w=${w}&auto=format&fit=max`;
const srcsetFor = (base) =>
  WIDTHS.map((w) => `${imageUrl(base, w)} ${w}w`).join(", ");

// takenAt is a plain date; build it in local time so it can't shift a day.
function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toItem(p) {
  const { width, height } = p.dimensions;
  return {
    src: imageUrl(p.url, 1800),
    srcset: srcsetFor(p.url),
    base: p.url,
    alt: p.alt || p.title || "",
    lqip: p.lqip,
    width,
    height,
    title: p.title || "",
    location: p.location || "",
    date: formatDate(p.takenAt),
    meta: [p.location, formatDate(p.takenAt)].filter(Boolean).join(" · "),
    caption: p.caption || "",
    featured: !!p.featured,
  };
}

function makeImage(item, sizes, eager) {
  const img = document.createElement("img");
  img.src = imageUrl(item.base, 800);
  img.srcset = srcsetFor(item.base);
  img.sizes = sizes;
  img.alt = item.alt;
  img.width = item.width;
  img.height = item.height;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (item.lqip) img.style.backgroundImage = `url("${item.lqip}")`;
  return img;
}

function openAt(items, index, opener) {
  lightbox.open(items, index, opener);
}

function renderGrid(items) {
  grid.replaceChildren();
  items.forEach((item, i) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "Tile";
    tile.setAttribute(
      "aria-label",
      `Open photo: ${item.title || item.alt}`,
    );
    tile.append(makeImage(item, SIZES[grid.dataset.density], i < 4));
    if (item.meta) {
      const cap = document.createElement("span");
      cap.className = "Tile-Meta";
      const place = document.createElement("span");
      place.textContent = item.location;
      const date = document.createElement("span");
      date.textContent = item.date;
      cap.append(place, date);
      tile.append(cap);
    }
    tile.addEventListener("click", () => openAt(items, i, tile));
    grid.append(tile);
  });
}

function frame(item, items, index, clone) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "Strip-Frame";
  btn.setAttribute("aria-label", `Open photo: ${item.title || item.alt}`);
  const img = makeImage(item, "(max-width: 600px) 70vw, 480px", !clone && index < 3);
  if (clone) {
    // The marquee duplicate is decorative: keep it out of the a11y tree and tab order.
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    img.alt = "";
  }
  const cap = document.createElement("span");
  cap.className = "Strip-Meta";
  const place = document.createElement("span");
  place.textContent = item.location;
  const date = document.createElement("span");
  date.textContent = item.date;
  cap.append(place, date);
  btn.append(img, cap);
  btn.addEventListener("click", () => openAt(items, index, btn));
  return btn;
}

function renderStrip(all) {
  const featured = all.filter((i) => i.featured);
  const items = featured.length ? featured : all;
  stripTrack.replaceChildren(...items.map((it, i) => frame(it, items, i, false)));
  strip.hidden = false;
  // Only scroll automatically when the frames overflow the viewport; otherwise
  // duplicating a couple of photos would just look like a mistake.
  requestAnimationFrame(() => {
    if (stripTrack.scrollWidth <= strip.clientWidth) return;
    items.forEach((it, i) => stripTrack.append(frame(it, items, i, true)));
    stripTrack.style.setProperty("--Strip-Duration", `${items.length * 8}s`);
    strip.classList.add("Marquee");
  });
}

function showStatus(kind, title, text, retry) {
  grid.replaceChildren();
  grid.hidden = true;
  density.hidden = true;
  strip.hidden = true;
  count.textContent = "";
  status.className = `Status Status-${kind}`;
  status.replaceChildren();
  const h = document.createElement("p");
  h.className = "Status-Title";
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = text;
  status.append(h, p);
  if (retry) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "Status-Retry";
    b.textContent = "Try again";
    b.addEventListener("click", load);
    status.append(b);
  }
  status.hidden = false;
  grid.setAttribute("aria-busy", "false");
}

function showLoading() {
  status.hidden = true;
  grid.hidden = false;
  grid.setAttribute("aria-busy", "true");
  grid.replaceChildren();
  // Fixed ratios so the skeleton columns look like a gallery, not a stack.
  ["4 / 5", "1 / 1", "3 / 2", "4 / 5", "3 / 2", "1 / 1"].forEach((ratio) => {
    const s = document.createElement("div");
    s.className = "Skeleton";
    s.style.aspectRatio = ratio;
    grid.append(s);
  });
}

async function load() {
  showLoading();
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`Sanity responded ${res.status}`);
    const json = await res.json();
    const items = (json.result || [])
      .filter((p) => p.url && p.dimensions)
      .map(toItem);
    if (!items.length) {
      showStatus(
        "Empty",
        "No photos yet",
        "Nothing has been published here yet. Check back soon.",
        false,
      );
      return;
    }
    renderStrip(items);
    renderGrid(items);
    grid.setAttribute("aria-busy", "false");
    density.hidden = false;
    count.textContent = `${items.length} ${items.length === 1 ? "photo" : "photos"}`;
  } catch (err) {
    // Network failures, CORS rejections and a placeholder project id all land here.
    console.error(err);
    showStatus(
      "Error",
      "Couldn't load the photos",
      "Something went wrong reaching the gallery. Check your connection and try again.",
      true,
    );
  }
}

density.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-density]");
  if (!btn) return;
  setDensity(btn.dataset.density);
  try {
    localStorage.photoDensity = btn.dataset.density;
  } catch (_) {}
});

function setDensity(d) {
  grid.dataset.density = d;
  density.querySelectorAll("button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.density === d));
  });
  grid.querySelectorAll(".Tile img").forEach((img) => (img.sizes = SIZES[d]));
}

let saved = "M";
try {
  saved = localStorage.photoDensity || "M";
} catch (_) {}
setDensity(SIZES[saved] ? saved : "M");
load();
