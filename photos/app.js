import { PROJECT_ID, DATASET, API_VERSION } from "./config.js";

const QUERY = `*[_type == "photo" && defined(image.asset)] | order(takenAt desc, _createdAt desc) {
  _id,
  title,
  alt,
  takenAt,
  location,
  caption,
  featured,
  tone,
  filmStock,
  frame,
  "people": people[]->name,
  "avatars": people[]->{ name, "url": avatar.asset->url, "hotspot": avatar.hotspot, "crop": avatar.crop, "dimensions": avatar.asset->metadata.dimensions },
  "series": series->{ _id, title, "slug": slug.current, description, location, date },
  "url": image.asset->url,
  "dimensions": image.asset->metadata.dimensions,
  "lqip": image.asset->metadata.lqip
}`;
const ENDPOINT = `https://${PROJECT_ID}.apicdn.sanity.io/${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(QUERY)}`;

const WIDTHS = [240, 480, 800, 1200, 1800];
const MAX_WIDTH = 2400; // largest rendition requested, for retina lightbox
// Match the column widths in style.css for each density.
const SIZES = {
  S: "(max-width: 600px) 34vw, 220px",
  M: "(max-width: 600px) 50vw, 340px",
  L: "(max-width: 600px) 100vw, 520px",
};

const $ = (id) => document.getElementById(id);
const views = {
  overview: $("view-overview"),
  index: $("view-index"),
  series: $("view-series"),
};
const status = $("status");
const grid = $("grid");
const lightbox = $("lightbox");

let photos = [];
let seriesList = [];

const pad = (n) => String(n).padStart(2, "0");
const imageUrl = (base, w) => `${base}?w=${w}&auto=format&fit=max`;
// Only advertise widths the original can actually deliver (the CDN never
// upscales), so the browser's size maths matches the real pixels.
const srcsetFor = (base, original) => {
  const top = Math.min(original, MAX_WIDTH);
  return [...WIDTHS.filter((w) => w < top), top]
    .map((w) => `${imageUrl(base, w)} ${w}w`)
    .join(", ");
};

// Plain dates are built in local time so they can't shift a day.
function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const formatDate = (v) =>
  v
    ? parseDate(v).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
const formatMonth = (v) =>
  v
    ? parseDate(v).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Person name -> { url, hotspot } for people who have an avatar in the Studio.
const AVATARS = new Map();
// Square avatar from the crop and hotspot the author set in the Studio. The crop
// is fractions trimmed from each edge, so it is turned into a pixel rect first;
// the hotspot is relative to the whole image, so it is re-based onto that rect.
const clamp01 = (n) => Math.min(1, Math.max(0, n));
function avatarUrl({ url, hotspot, crop, dimensions }, size) {
  const params = [`w=${size}`, `h=${size}`, "fit=crop", "auto=format"];
  const { left = 0, right = 0, top = 0, bottom = 0 } = crop || {};
  if (crop && dimensions) {
    const { width, height } = dimensions;
    const rect = [left * width, top * height, (1 - left - right) * width, (1 - top - bottom) * height];
    params.push(`rect=${rect.map(Math.round).join(",")}`);
  }
  if (hotspot) {
    const x = clamp01((hotspot.x - left) / (1 - left - right));
    const y = clamp01((hotspot.y - top) / (1 - top - bottom));
    params.push("crop=focalpoint", `fp-x=${x.toFixed(4)}`, `fp-y=${y.toFixed(4)}`);
  }
  return `${url}?${params.join("&")}`;
}

function toPhoto(p) {
  (p.avatars || []).forEach((a) => a && a.url && AVATARS.set(a.name, a));
  const { width, height } = p.dimensions;
  const series = p.series && p.series._id ? p.series : null;
  return {
    id: p._id,
    base: p.url,
    src: imageUrl(p.url, Math.min(1800, width)),
    srcset: srcsetFor(p.url, width),
    alt: p.alt || p.title || "",
    lqip: p.lqip,
    width,
    height,
    title: p.title || "",
    location: p.location || "",
    date: formatDate(p.takenAt),
    takenAt: p.takenAt || "",
    caption: p.caption || "",
    featured: !!p.featured,
    tone: p.tone || "",
    people: (p.people || []).filter(Boolean),
    stock: p.filmStock || "",
    frame: p.frame || "",
    seriesId: series ? series._id : null,
    series,
  };
}

// Film-edge style label: "KODAK GOLD 200 ▸ 35A"
const edgeText = (p) =>
  [p.stock, p.frame ? `▸ ${p.frame}A` : ""].filter(Boolean).join(" ");

function toLightboxItem(p) {
  return {
    src: p.src,
    srcset: p.srcset,
    alt: p.alt,
    lqip: p.lqip,
    width: p.width,
    height: p.height,
    label: p.series ? p.series.title : p.title,
    meta: [p.location, p.date].filter(Boolean).join(" · "),
    side: edgeText(p) || (p.series ? p.title : ""),
    caption: p.caption,
  };
}

function buildSeries() {
  const map = new Map();
  photos.forEach((p) => {
    if (!p.series) return;
    if (!map.has(p.seriesId)) {
      const s = p.series;
      map.set(p.seriesId, {
        id: s._id,
        slug: s.slug || s._id,
        title: s.title || "Untitled series",
        description: s.description || "",
        location: s.location || "",
        dateValue: s.date || "",
        date: "",
        stock: "",
        photos: [],
      });
    }
    map.get(p.seriesId).photos.push(p);
  });
  map.forEach((s) => {
    // A series without its own date takes its newest photo's date.
    if (!s.dateValue) s.dateValue = s.photos.map((p) => p.takenAt).sort().pop() || "";
    s.date = formatMonth(s.dateValue);
    s.stock = [...new Set(s.photos.map((p) => p.stock).filter(Boolean))].join(", ");
  });
  // Newest first; series with no date anywhere go last.
  seriesList = [...map.values()].sort((a, b) => {
    if (!a.dateValue !== !b.dateValue) return a.dateValue ? -1 : 1;
    return a.dateValue === b.dateValue
      ? a.title.localeCompare(b.title)
      : b.dateValue.localeCompare(a.dateValue);
  });
  seriesList.forEach((s, i) => (s.num = pad(i + 1)));
}

function makeImage(p, sizes, eager) {
  const img = document.createElement("img");
  img.src = imageUrl(p.base, Math.min(800, p.width));
  img.srcset = srcsetFor(p.base, p.width);
  img.sizes = sizes;
  img.alt = p.alt;
  img.width = p.width;
  img.height = p.height;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (p.lqip) {
    img.style.backgroundImage = `url("${p.lqip}")`;
    img.addEventListener("load", () => (img.style.backgroundImage = ""), { once: true });
  }
  return img;
}

function openLightbox(list, index, opener) {
  lightbox.open(list.map(toLightboxItem), index, opener);
}

function frameLabel(p) {
  return `Open photo: ${p.title || p.alt}`;
}

/* ---------- film strips (overview + series) ---------- */

function stripFrame(p, list, index, { clone, sizes, eager }) {
  const btn = el("button", "Strip-Frame");
  btn.type = "button";
  btn.setAttribute("aria-label", frameLabel(p));
  const img = makeImage(p, sizes, eager && !clone);
  if (clone) {
    // The marquee duplicate is decorative: out of the a11y tree and tab order.
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    img.alt = "";
  }
  const cap = el("span", "Strip-Meta");
  // film-edge text when the photo has it, otherwise where and when
  cap.append(
    el("span", "", p.stock || p.location),
    el("span", "", p.frame ? `▸ ${p.frame}A` : p.date),
  );
  btn.append(img, cap);
  btn.addEventListener("click", () => openLightbox(list, index, btn));
  return btn;
}

function fillStrip(container, track, list, opts) {
  track.replaceChildren(
    ...list.map((p, i) => stripFrame(p, list, i, { ...opts, clone: false, eager: i < 3 })),
  );
  container.classList.remove("Marquee");
  if (!opts.marquee) return;
  // Only scroll automatically when the frames overflow the viewport; otherwise
  // duplicating a couple of photos would just look like a mistake.
  requestAnimationFrame(() => {
    if (track.scrollWidth <= container.clientWidth) return;
    list.forEach((p, i) =>
      track.append(stripFrame(p, list, i, { ...opts, clone: true })),
    );
    track.style.setProperty("--Strip-Duration", `${list.length * 8}s`);
    container.classList.add("Marquee");
  });
}

/* ---------- views ---------- */

function renderOverview() {
  const featured = photos.filter((p) => p.featured);
  const stripPhotos = featured.length ? featured : photos;
  fillStrip($("strip"), $("strip-track"), stripPhotos, {
    sizes: "(max-width: 600px) 90vw, 540px",
    marquee: true,
  });

  const section = $("series-section");
  section.hidden = !seriesList.length;
  const list = $("series-list");
  list.replaceChildren();
  $("series-count").textContent = `${pad(seriesList.length)} series · ${photos.length} frames`;
  seriesList.forEach((s) => {
    const row = el("a", "Series-Row");
    row.href = `#/series/${encodeURIComponent(s.slug)}`;
    row.append(el("span", "Series-Num", s.num));
    const text = el("span", "Series-Text");
    text.append(
      el("span", "Series-Title", s.title),
      el(
        "span",
        "Series-Meta",
        [s.location, s.date, s.stock, `${s.photos.length} ${s.photos.length === 1 ? "frame" : "frames"}`]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    const thumbs = el("span", "Series-Thumbs");
    s.photos.slice(0, 3).forEach((p) => {
      const img = makeImage(p, "92px", false);
      img.alt = "";
      thumbs.append(img);
    });
    row.append(text, thumbs);
    list.append(row);
  });
}

const TONES = [
  ["all", "All"],
  ["colour", "Colour"],
  ["bw", "B&W"],
];
const STOCK_SWATCH = { colour: "#e39a3b", bw: "#8a857c", "": "#bdb7ac" };

const newFilters = () => ({ tone: "all", stock: null, people: [] });
const hasFilters = (f) => f.tone !== "all" || !!f.stock || f.people.length > 0;
let indexFilters = newFilters();
let seriesFilters = newFilters();

// Does `p` pass the filters? `skip` leaves one facet out, so each option can
// show how many photos it would add given the other selections.
function matches(p, f, skip) {
  if (skip !== "tone" && f.tone !== "all" && p.tone !== f.tone) return false;
  if (skip !== "stock" && f.stock && p.stock !== f.stock) return false;
  if (skip !== "people" && f.people.length) {
    // Several people means photos that have all of them in the frame.
    if (!f.people.every((name) => p.people.includes(name))) return false;
  }
  return true;
}
const applyFilters = (list, f) => list.filter((p) => matches(p, f));

function toggleGroup(label, options, current, onPick) {
  const group = el("div", "Filter");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  options.forEach(([key, text, count]) => {
    const b = el("button", "", text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(current === key));
    if (count !== undefined) b.append(el("span", "", String(count)));
    b.addEventListener("click", () => onPick(key));
    group.append(b);
  });
  return group;
}

// People: the most photographed people (plus anyone picked) as avatar chips,
// and a "+ N more" panel with search and a Most seen / A-Z sort for the rest.
const PEOPLE_INLINE = 8;
const peopleUiState = new WeakMap();
const peopleUi = (f) => {
  if (!peopleUiState.has(f)) peopleUiState.set(f, { open: false, query: "", sort: "count", scroll: 0, focus: false });
  return peopleUiState.get(f);
};
const initialsOf = (name) =>
  name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Initials, with the person's avatar over them when they have one.
function avatarEl(name, className, size) {
  const a = el("span", className, initialsOf(name));
  const person = AVATARS.get(name);
  if (person) {
    const img = el("img", "Avatar-Img");
    img.alt = "";
    img.src = avatarUrl(person, size * 2);
    img.addEventListener("error", () => img.remove());
    a.append(img);
  }
  return a;
}

function renderPeople(body, source, names, f, change) {
  const ui = peopleUi(f);
  const people = names.map((name) => {
    const on = f.people.includes(name);
    return {
      name,
      on,
      total: source.filter((p) => p.people.includes(name)).length,
      // Photos left if this person is added to (or kept in) the selection.
      count: source.filter((p) => matches(p, f) && (on || p.people.includes(name))).length,
    };
  });
  const byCount = [...people].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const toggle = (name, on) =>
    change({ people: on ? f.people.filter((x) => x !== name) : [...f.people, name] });

  const inline = [
    ...f.people.map((name) => people.find((p) => p.name === name)).filter(Boolean),
    ...byCount.filter((p) => !p.on && p.count),
  ].slice(0, Math.max(PEOPLE_INLINE, f.people.length));

  const chips = el("div", "Chips");
  inline.forEach((p) => {
    const b = el("button", "Person");
    b.type = "button";
    b.title = p.name;
    b.setAttribute("aria-pressed", String(p.on));
    b.append(avatarEl(p.name, "Person-Avatar", 28), p.name, el("span", "Chip-Count", String(p.count)));
    b.addEventListener("click", () => toggle(p.name, p.on));
    chips.append(b);
  });

  const hidden = people.length - inline.length;
  const more = el("button", "People-More", ui.open ? "Close" : hidden > 0 ? `+ ${hidden} more` : "All people");
  more.type = "button";
  more.setAttribute("aria-expanded", String(ui.open));
  more.addEventListener("click", () => {
    ui.open = !ui.open;
    ui.query = "";
    ui.scroll = 0;
    ui.focus = ui.open;
    change({});
  });
  chips.append(more);
  body.append(chips);

  if (!ui.open) return;

  const panel = el("div", "People-Panel");
  const bar = el("div", "People-Bar");
  const search = el("input", "People-Search");
  search.type = "search";
  search.placeholder = `Search ${people.length} people`;
  search.setAttribute("aria-label", "Search people");
  search.value = ui.query;
  const sort = el("div", "Filter");
  sort.setAttribute("role", "group");
  sort.setAttribute("aria-label", "Sort people");
  const done = el("button", "Link-Button", "Done");
  done.type = "button";
  done.addEventListener("click", () => {
    ui.open = false;
    ui.query = "";
    change({});
  });

  const grid = el("div", "People-Grid");
  const empty = el("p", "People-Empty", "No one by that name.");
  const fill = () => {
    const q = ui.query.trim().toLowerCase();
    const sorted = ui.sort === "count" ? byCount : [...people].sort((a, b) => a.name.localeCompare(b.name));
    const list = sorted.filter((p) => !q || p.name.toLowerCase().includes(q));
    grid.replaceChildren();
    list.forEach((p) => {
      const b = el("button", "People-Row");
      b.type = "button";
      b.setAttribute("aria-pressed", String(p.on));
      b.style.opacity = p.count || p.on ? "" : "0.35";
      b.append(avatarEl(p.name, "People-Avatar", 36), el("span", "People-Name", p.name), el("span", "Chip-Count", String(p.count)));
      b.addEventListener("click", () => toggle(p.name, p.on));
      grid.append(b);
    });
    empty.hidden = list.length > 0;
  };
  // Typing only refills the list, so the input keeps focus.
  search.addEventListener("input", () => {
    ui.query = search.value;
    fill();
  });
  [["count", "Most seen"], ["az", "A\u2013Z"]].forEach(([key, text]) => {
    const b = el("button", "", text);
    b.type = "button";
    b.setAttribute("aria-pressed", String(ui.sort === key));
    b.addEventListener("click", () => {
      ui.sort = key;
      change({});
    });
    sort.append(b);
  });
  bar.append(search, sort, done);
  panel.append(
    bar,
    grid,
    empty,
    el("div", "People-Note", "Picking several shows frames where they\u2019re all together. Faded names aren\u2019t in any frame with the people already picked."),
  );
  fill();
  body.append(panel);
  grid.scrollTop = ui.scroll;
  if (ui.focus) {
    search.focus();
    ui.focus = false;
  }
}

// Film (colour / B&W and stock chips) and People (avatar chips, Any/Together)
// rows plus a result line. Rows with nothing to choose from are left out.
function renderFacets(host, source, f, apply) {
  const ui = peopleUi(f);
  const oldGrid = host.querySelector(".People-Grid");
  if (oldGrid) ui.scroll = oldGrid.scrollTop;
  host.replaceChildren();
  const change = (patch) => {
    Object.assign(f, patch);
    apply();
  };

  const row = (label) => {
    const r = el("div", "Facet-Row");
    const body = el("div", "Facet-Body");
    r.append(el("span", "Facet-Label", label), body);
    host.append(r);
    return body;
  };

  const tagged = source.some((p) => p.tone);
  const stocks = new Map();
  source.forEach((p) => {
    if (p.stock && !stocks.has(p.stock)) stocks.set(p.stock, p.tone);
    else if (p.stock && !stocks.get(p.stock)) stocks.set(p.stock, p.tone);
  });
  const stockList = [...stocks]
    .filter(([, tone]) => f.tone === "all" || tone === f.tone)
    .sort(([a], [b]) => a.localeCompare(b));

  if (tagged || stockList.length) {
    const body = row("Film");
    if (tagged) {
      body.append(
        toggleGroup(
          "Filter by tone",
          TONES.map(([key, text]) => [
            key,
            text,
            source.filter((p) => matches(p, f, "tone") && (key === "all" || p.tone === key)).length,
          ]),
          f.tone,
          (key) => {
            const keep = f.stock && (key === "all" || stocks.get(f.stock) === key);
            change({ tone: key, stock: keep ? f.stock : null });
          },
        ),
      );
    }
    const chips = el("div", "Chips");
    stockList.forEach(([name, tone]) => {
      const on = f.stock === name;
      const count = source.filter((p) => matches(p, f, "stock") && p.stock === name).length;
      const b = el("button", "Chip");
      b.type = "button";
      b.setAttribute("aria-pressed", String(on));
      b.style.opacity = count || on ? "" : "0.4";
      const swatch = el("span", "Chip-Swatch");
      swatch.style.background = STOCK_SWATCH[tone || ""];
      b.append(swatch, name, el("span", "Chip-Count", String(count)));
      b.addEventListener("click", () => change({ stock: on ? null : name }));
      chips.append(b);
    });
    body.append(chips);
  }

  const names = [...new Set(source.flatMap((p) => p.people))];
  if (names.length) renderPeople(row("People"), source, names, f, change);

  if (!host.children.length) return;
  const shown = applyFilters(source, f).length;
  const parts = [];
  if (f.tone !== "all") parts.push(f.tone === "bw" ? "B&W" : "Colour");
  if (f.stock) parts.push(f.stock);
  if (f.people.length) parts.push(`with ${f.people.join(" + ")}`);
  const result = el("div", "Results");
  const summary = el("span", "");
  summary.append(
    el("strong", "", `${pad(shown)} ${shown === 1 ? "frame" : "frames"}`),
    ` · ${parts.length ? parts.join(" · ") : "everything"}`,
  );
  result.append(summary);
  if (parts.length) {
    const clear = el("button", "Link-Button", "Clear filters");
    clear.type = "button";
    clear.addEventListener("click", () => change(newFilters()));
    result.append(clear);
  }
  host.append(result);
}

function renderIndex() {
  const clear = () => {
    Object.assign(indexFilters, newFilters());
    renderIndex();
  };
  renderFacets($("facets"), photos, indexFilters, renderIndex);
  fillGrid(grid, applyFilters(photos, indexFilters), clear);
}

function fillGrid(target, list, onClear) {
  target.replaceChildren();
  if (!list.length && onClear) {
    const empty = el("div", "Empty");
    empty.append(el("p", "Empty-Title", "Nothing on this roll"), el("p", "", "No frames match these filters."));
    const clear = el("button", "Empty-Clear", "Clear filters");
    clear.type = "button";
    clear.addEventListener("click", onClear);
    empty.append(clear);
    target.append(empty);
  }
  list.forEach((p, i) => {
    const tile = el("button", "Tile");
    tile.type = "button";
    tile.setAttribute("aria-label", frameLabel(p));
    tile.append(makeImage(p, SIZES[target.dataset.density], i < 4));
    if (p.people.length || p.location || p.date || p.stock) {
      const cap = el("span", "Tile-Meta");
      const left = el("span", "Tile-Where");
      if (p.people.length) left.append(el("span", "Tile-Who", p.people.join(", ")));
      left.append(el("span", "", [p.location, p.date].filter(Boolean).join(" · ")));
      cap.append(left, el("span", "", p.stock));
      tile.append(cap);
    }
    tile.addEventListener("click", () => openLightbox(list, i, tile));
    target.append(tile);
  });
  target.setAttribute("aria-busy", "false");
}

/* ---------- series grid layout ---------- */

const seriesGrid = $("series-grid");
let currentSeries = null;
let seriesLayout = "grid";
try {
  if (localStorage.photoSeriesLayout === "frames") seriesLayout = "frames";
} catch (_) {}

function renderSeriesGrid() {
  const source = currentSeries.photos;
  const clear = () => {
    Object.assign(seriesFilters, newFilters());
    renderSeriesGrid();
  };
  renderFacets($("series-facets"), source, seriesFilters, renderSeriesGrid);
  fillGrid(seriesGrid, applyFilters(source, seriesFilters), clear);
}

// Frames: the roll and full-width frames. Grid: filter, size and a thumbnail grid.
function applyLayout() {
  const gridMode = seriesLayout === "grid";
  $("roll").hidden = gridMode;
  $("frames").hidden = gridMode;
  seriesGrid.hidden = !gridMode;
  $("series-density").hidden = !gridMode;
  $("series-facets").hidden = !gridMode;
  document.querySelectorAll(".Layout button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.layout === seriesLayout));
  });
}

document.querySelector(".Layout").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-layout]");
  if (!btn) return;
  seriesLayout = btn.dataset.layout;
  applyLayout();
  try {
    localStorage.photoSeriesLayout = seriesLayout;
  } catch (_) {}
});

function renderSeries(slug) {
  const i = seriesList.findIndex((s) => s.slug === slug);
  if (i < 0) return false;
  const s = seriesList[i];
  $("series-eyebrow").textContent = `Series ${s.num} / ${pad(seriesList.length)}`;
  $("series-title").textContent = s.title;
  $("series-desc").textContent = s.description;
  $("series-desc").hidden = !s.description;
  const facts = $("series-facts");
  facts.replaceChildren();
  [
    ["Place", s.location],
    ["Date", s.date],
    ["Stock", s.stock],
    ["Frames", String(s.photos.length)],
  ]
    .filter(([, v]) => v)
    .forEach(([k, v]) => {
      const item = el("div", "Fact");
      item.append(el("dt", "", k), el("dd", "", v));
      facts.append(item);
    });

  if (currentSeries !== s) Object.assign(seriesFilters, newFilters());
  currentSeries = s;
  renderSeriesGrid();
  applyLayout();

  fillStrip($("roll"), $("roll-track"), s.photos, {
    sizes: "(max-width: 600px) 40vw, 240px",
    marquee: false,
  });

  const frames = $("frames");
  frames.replaceChildren();
  s.photos.forEach((p, n) => {
    const fig = el("figure", "Frame");
    const btn = el("button", "Frame-Button");
    btn.type = "button";
    btn.setAttribute("aria-label", frameLabel(p));
    btn.append(makeImage(p, "min(100vw, 1440px)", n < 1));
    btn.addEventListener("click", () => openLightbox(s.photos, n, btn));
    const cap = el("figcaption", "Frame-Meta");
    cap.append(
      el("span", "", `Frame ${p.frame ? p.frame.padStart(2, "0") : pad(n + 1)}`),
      el("span", "", p.stock || [p.title, p.date].filter(Boolean).join(" · ")),
    );
    fig.append(btn, cap);
    frames.append(fig);
  });

  const pager = $("pager");
  pager.replaceChildren();
  if (seriesList.length > 1) {
    const prev = seriesList[(i - 1 + seriesList.length) % seriesList.length];
    const next = seriesList[(i + 1) % seriesList.length];
    [
      [prev, "← Previous", "Pager-Prev"],
      [next, "Next →", "Pager-Next"],
    ].forEach(([t, label, cls]) => {
      const a = el("a", `Pager-Link ${cls}`);
      a.href = `#/series/${encodeURIComponent(t.slug)}`;
      a.append(el("span", "Mono-Label", label), el("span", "Pager-Title", t.title));
      pager.append(a);
    });
  }
  return true;
}

/* ---------- routing ---------- */

function route() {
  if (!photos.length) return;
  const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  let view = parts[0] === "index" ? "index" : parts[0] === "series" ? "series" : "overview";
  if (view === "series") {
    if (!parts[1]) {
      if (!seriesList.length) view = "overview";
      else {
        location.replace(`#/series/${encodeURIComponent(seriesList[0].slug)}`);
        return;
      }
    } else if (!renderSeries(parts[1])) view = "overview";
  }
  Object.entries(views).forEach(([k, v]) => (v.hidden = k !== view));
  document.querySelectorAll(".Subnav-Links a").forEach((a) => {
    a.classList.toggle("Active", a.dataset.view === view);
    if (a.dataset.view === view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  const h1 = views[view].querySelector("h1");
  if (h1 && route.started) h1.focus({ preventScroll: true });
  route.started = true;
}
window.addEventListener("hashchange", route);

/* ---------- states ---------- */

function showStatus(kind, title, text, retry) {
  Object.values(views).forEach((v) => (v.hidden = true));
  status.className = `Wrap Status Status-${kind}`;
  status.replaceChildren(el("p", "Status-Title", title), el("p", "", text));
  if (retry) {
    const b = el("button", "Status-Retry", "Try again");
    b.type = "button";
    b.addEventListener("click", load);
    status.append(b);
  }
  status.hidden = false;
}

function showLoading() {
  status.hidden = true;
  Object.entries(views).forEach(([k, v]) => (v.hidden = k !== "index"));
  grid.setAttribute("aria-busy", "true");
  grid.replaceChildren();
  // Fixed ratios so the skeleton columns look like a gallery, not a stack.
  ["4 / 5", "1 / 1", "3 / 2", "4 / 5", "3 / 2", "1 / 1"].forEach((ratio) => {
    const s = el("div", "Skeleton");
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
    photos = (json.result || []).filter((p) => p.url && p.dimensions).map(toPhoto);
    if (!photos.length) {
      showStatus("Empty", "No photos yet", "Nothing has been published here yet. Check back soon.", false);
      return;
    }
    buildSeries();
    $("series-link").hidden = !seriesList.length;
    renderOverview();
    renderIndex();
    route();
  } catch (err) {
    // Network failures, CORS rejections and a bad project id all land here.
    console.error(err);
    showStatus(
      "Error",
      "Couldn't load the photos",
      "Something went wrong reaching the gallery. Check your connection and try again.",
      true,
    );
  }
}

/* ---------- density ---------- */

// The index and the series grid share one size setting.
function setDensity(d) {
  [grid, seriesGrid].forEach((g) => {
    g.dataset.density = d;
    g.querySelectorAll(".Tile img").forEach((img) => (img.sizes = SIZES[d]));
  });
  document.querySelectorAll(".Density button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.density === d));
  });
}
document.querySelectorAll(".Density").forEach((group) =>
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-density]");
    if (!btn) return;
    setDensity(btn.dataset.density);
    try {
      localStorage.photoDensity = btn.dataset.density;
    } catch (_) {}
  }),
);

let saved = "M";
try {
  saved = localStorage.photoDensity || "M";
} catch (_) {}
setDensity(SIZES[saved] ? saved : "M");
load();
