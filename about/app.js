const tabList = document.querySelector(".Hobby-Tabs");
const photo = document.querySelector(".Hobby-Photo");
const indexEl = document.querySelector(".Hobby-Index");
const headlineEl = document.querySelector(".Hobby-Headline");
const bodyEl = document.querySelector(".Hobby-Body");

// Copy lives in the markup under .Hobby-Source; this only reads it.
const hobbies = [...document.querySelectorAll(".Hobby-Source article")].map(
  (el) => ({
    label: el.dataset.tab,
    headline: el.dataset.headline,
    img: el.dataset.img,
    // some photos need a specific crop to frame their subject
    position: el.dataset.position || "center",
    body: el.querySelector("p").textContent.replace(/\s+/g, " ").trim(),
  }),
);

let active = null;

build();
select(0);

function build() {
  hobbies.forEach((hobby, index) => {
    const tab = document.createElement("button");
    tab.className = "Hobby-Tab";
    tab.type = "button";
    tab.innerText = hobby.label;
    tab.setAttribute("aria-pressed", "false");
    tab.addEventListener("click", () => select(index));
    tab.addEventListener("mouseenter", () => select(index));
    hobby.tab = tab;
    tabList.append(tab);

    const frame = document.createElement("div");
    frame.className = "Hobby-Frame";
    frame.style.backgroundPosition = hobby.position;
    frame.setAttribute("role", "img");
    frame.setAttribute("aria-label", `${hobby.label} photo`);
    hobby.frame = frame;
    photo.append(frame);
  });
}

function select(next) {
  if (next === active) return;
  active = next;
  const current = hobbies[active];
  loadPhoto(current);
  hobbies.forEach((hobby, index) => {
    const on = index === active;
    hobby.tab.classList.toggle("Active", on);
    hobby.tab.setAttribute("aria-pressed", String(on));
    hobby.frame.classList.toggle("Active", on);
  });
  indexEl.innerText = `${String(active + 1).padStart(2, "0")} / ${hobbies.length} · ${current.label}`;
  headlineEl.innerText = current.headline;
  bodyEl.innerText = current.body;
}

// Frames start with no background so opening the page doesn't pull down every
// photo at once; each one is fetched the first time its tab is selected.
function loadPhoto(hobby) {
  if (hobby.loaded) return;
  hobby.frame.style.backgroundImage = `url("${hobby.img}")`;
  hobby.loaded = true;
}
