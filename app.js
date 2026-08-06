const wheel = document.querySelector(".Skill-Cards");
const placeholder = document.querySelector(".Skills-Info .Placeholder");
const placeholderHeight = document.querySelector(
  ".Skills-Info .Placeholder-Height",
);
const chipList = document.querySelector(".Skill-Chips");
const countLabel = document.querySelector(".Skill-Count");

// Radius of the ring the icons sit on, as a fraction of the ring's box.
const RADIUS = 0.42;
// Matches the opacity/height transitions in style.css.
const FADE = 300;

// The skill content lives in the markup, so the chips and the info panel read
// their copy from it rather than keeping a second list in here.
const entries = [...document.querySelectorAll(".Skill")].map((skill) => ({
  skill,
  name: skill.querySelector(".Tooltip").innerText,
  desc: skill.querySelector("p").textContent.replace(/\s+/g, " ").trim(),
}));

let selected = null;
let animationTimeout;

assignPositions();
buildChips();
countLabel.innerText = `${entries.length} technologies`;
renderPanel(true);

function assignPositions() {
  const step = 360 / entries.length;
  entries.forEach(({ skill }, index) => {
    // -90deg matches the mockup's phase, putting the first icon bottom-centre
    const radians = ((step * index - 90) * Math.PI) / 180;
    skill.style.left = `${(0.5 + Math.cos(radians) * RADIUS) * 100}%`;
    skill.style.bottom = `${(0.5 + Math.sin(radians) * RADIUS) * 100}%`;
    skill
      .querySelector("button")
      .addEventListener("click", () => toggle(index));
  });
}

function buildChips() {
  entries.forEach((entry, index) => {
    const chip = document.createElement("button");
    chip.className = "Chip";
    chip.type = "button";
    chip.innerText = entry.name;
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => toggle(index));
    entry.chip = chip;
    chipList.append(chip);
  });
}

function toggle(index) {
  select(selected === index ? null : index);
}

function select(next) {
  selected = next;
  wheel.classList.toggle("Paused", selected !== null);
  entries.forEach((entry, index) => {
    const isSelected = index === selected;
    entry.skill.classList.toggle("Large", isSelected);
    entry.chip.classList.toggle("Active", isSelected);
    entry.chip.setAttribute("aria-pressed", String(isSelected));
  });
  renderPanel();
}

// Fades the panel out, swaps its contents, then fades back in, animating the
// wrapper's height across the swap so the page below doesn't jump.
function renderPanel(immediate) {
  if (immediate) {
    placeholder.replaceChildren(...panelContent());
    setCurrentHeight();
    return;
  }
  placeholder.style.opacity = 0;
  setCurrentHeight();
  clearTimeout(animationTimeout);
  animationTimeout = setTimeout(() => {
    placeholder.replaceChildren(...panelContent());
    setCurrentHeight();
    placeholder.style.opacity = 1;
  }, FADE);
}

function panelContent() {
  const label = document.createElement("p");
  label.className = "Panel-Label";
  const body = document.createElement("p");
  body.className = "Panel-Body";

  if (selected === null) {
    label.innerText = "No skill selected";
    body.innerText =
      "Pick a logo from the wheel, or a name from the list below, to read how I use it.";
    return [label, body];
  }

  const entry = entries[selected];
  label.innerText = `${String(selected + 1).padStart(2, "0")} / ${entries.length}`;
  body.innerText = entry.desc;
  const title = document.createElement("h3");
  title.innerText = entry.name;
  return [label, title, body];
}

function setCurrentHeight() {
  placeholderHeight.style.height = `${placeholder.clientHeight}px`;
}
