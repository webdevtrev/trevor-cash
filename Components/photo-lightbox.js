// <photo-lightbox> — modal viewer for the /photos gallery.
// Built on <dialog>.showModal(): the rest of the page goes inert, Esc fires
// `cancel`, and the dialog sits in the top layer above the fixed header.
//
//   lightbox.open(items, index, openerElement)
//
// Each item: { src, srcset, alt, lqip, width, height, label, meta, side, caption }
// where `label` is shown beside the counter (the series title), `meta` is a
// pre-formatted "Location · Date" string and `side` is the amber text at the
// bottom right. All text is
// inserted with textContent.
class PhotoLightbox extends HTMLElement {
  constructor() {
    super();
    this.items = [];
    this.index = 0;
    this.opener = null;
  }

  connectedCallback() {
    if (this.dialog) return;
    const dialog = document.createElement("dialog");
    dialog.className = "Lightbox";
    dialog.setAttribute("aria-label", "Photo viewer");

    const bar = document.createElement("div");
    bar.className = "Lightbox-Bar";
    this.counter = document.createElement("p");
    this.counter.className = "Lightbox-Counter";
    this.counter.setAttribute("aria-live", "polite");
    this.closeButton = this.button("Lightbox-Close", "Close photo viewer");
    this.closeButton.append(document.createTextNode("Close · Esc"));
    bar.append(this.counter, this.closeButton);

    const stage = document.createElement("div");
    stage.className = "Lightbox-Stage";
    this.prevButton = this.button("Lightbox-Arrow", "Previous photo");
    this.prevButton.textContent = "‹";
    this.nextButton = this.button("Lightbox-Arrow", "Next photo");
    this.nextButton.textContent = "›";
    const frame = document.createElement("div");
    frame.className = "Lightbox-Frame";
    this.image = document.createElement("img");
    this.image.className = "Lightbox-Image";
    this.image.decoding = "async";
    // The blurred placeholder only covers the wait; once the real photo is
    // in, drop it so its rounded aspect ratio can't peek out around the edges.
    this.image.addEventListener("load", () => {
      this.image.style.backgroundImage = "";
    });
    frame.append(this.image);
    stage.append(this.prevButton, frame, this.nextButton);

    this.info = document.createElement("div");
    this.info.className = "Lightbox-Info";
    this.meta = document.createElement("p");
    this.meta.className = "Lightbox-Meta";
    this.caption = document.createElement("p");
    this.caption.className = "Lightbox-Caption";
    this.side = document.createElement("p");
    this.side.className = "Lightbox-Side";
    this.info.append(this.meta, this.side, this.caption);

    dialog.append(bar, stage, this.info);
    this.append(dialog);
    this.dialog = dialog;

    this.closeButton.addEventListener("click", () => this.close());
    this.prevButton.addEventListener("click", () => this.step(-1));
    this.nextButton.addEventListener("click", () => this.step(1));
    // Clicks on the dialog element itself (not its children) hit the backdrop.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) this.close();
    });
    dialog.addEventListener("keydown", (e) => this.onKey(e));
    dialog.addEventListener("close", () => this.onClosed());
  }

  button(className, label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.setAttribute("aria-label", label);
    return b;
  }

  open(items, index, opener) {
    if (!items.length) return;
    this.items = items;
    this.opener = opener || null;
    this.show(index);
    if (!this.dialog.open) this.dialog.showModal();
    this.closeButton.focus();
  }

  close() {
    if (this.dialog.open) this.dialog.close();
  }

  step(delta) {
    this.show((this.index + delta + this.items.length) % this.items.length);
  }

  show(index) {
    this.index = index;
    const item = this.items[index];
    const img = this.image;
    img.style.backgroundImage = item.lqip ? `url("${item.lqip}")` : "";
    img.width = item.width;
    img.height = item.height;
    img.srcset = item.srcset;
    img.sizes = "100vw";
    img.src = item.src;
    img.alt = item.alt;
    const pad = (n) => String(n).padStart(2, "0");
    this.counter.textContent = `${pad(index + 1)} / ${pad(this.items.length)}${
      item.label ? " · " + item.label : ""
    }`;
    this.meta.textContent = item.meta || "";
    this.side.textContent = item.side || "";
    this.caption.textContent = item.caption || "";
    this.caption.hidden = !item.caption;
    const single = this.items.length < 2;
    this.prevButton.hidden = single;
    this.nextButton.hidden = single;
  }

  onKey(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      this.step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.step(-1);
    } else if (e.key === "Tab") {
      // showModal() keeps focus out of the page, but some browsers let Tab
      // escape to their own chrome; wrap explicitly so focus stays inside.
      const focusable = [...this.dialog.querySelectorAll("button")].filter(
        (b) => !b.hidden,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  onClosed() {
    this.image.removeAttribute("src");
    this.image.removeAttribute("srcset");
    // Return focus to the thumbnail that opened the viewer.
    if (this.opener && this.opener.isConnected) this.opener.focus();
    this.opener = null;
  }
}
customElements.define("photo-lightbox", PhotoLightbox);
