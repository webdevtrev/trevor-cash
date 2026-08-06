class Footer extends HTMLElement {
  connectedCallback() {
    const p = document.createElement("p");
    p.innerText = `Copyright 2026 Trevor Cash`;
    this.append(p);
  }
}
customElements.define("custom-footer", Footer);
