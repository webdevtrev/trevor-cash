class Footer extends HTMLElement {
  connectedCallback() {
    const p = document.createElement('p');
    p.innerText = `Copyright 2023 Trevor Cash`;
    this.append(p);
  }
}
customElements.define('custom-footer', Footer);
