const toggleDark = document.createElement("button");
toggleDark.className = "Button-Theme";
if (localStorage.dark === "true") {
  toggleDark.classList.add("Active");
  document.querySelector("body").classList.add("Dark");
}

class Header extends HTMLElement {
  // connect component
  constructor() {
    super();
    this.page = "Home";
  }
  // component attributes
  static get observedAttributes() {
    return ["page"];
  }
  // attribute change
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }
  connectedCallback() {
    toggleDark.addEventListener("click", (e) => {
      document.querySelector("body").classList.toggle("Dark");
      e.target.classList.toggle("Active");
      localStorage.dark = e.target.classList.contains("Active");
    });
    // A link, not an h1 — each page already has its own h1.
    if (this.page !== "Home") {
      const wordmark = document.createElement("a");
      wordmark.className = "Wordmark";
      wordmark.innerText = "Trevor Cash";
      wordmark.href = "/";
      this.append(wordmark);
    } else {
      this.classList.add("Home");
    }
    const pages = ["Home", "Portfolio", "About", "Contact"];
    const nav = document.createElement("nav");
    pages.forEach((page) => {
      // if (this.page !== page) {
      const link = document.createElement("a");
      link.innerText = page;
      link.href = `/${page === "Home" ? "" : page.toLowerCase()}`;
      if (this.page === page) {
        link.classList.add("Active");
      }
      nav.append(link);
      // }
    });
    // this.append(toggleDark);
    this.append(nav);
  }
}
customElements.define("custom-header", Header);
