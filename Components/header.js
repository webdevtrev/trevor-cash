const toggleDark = document.createElement('button');
toggleDark.className = 'Button-Theme';
if (localStorage.dark === 'true') {
  toggleDark.classList.add('Active');
  document.querySelector('body').classList.add('Dark');
  console.log(document.querySelector('body').classList);
}

class Header extends HTMLElement {
  // connect component
  constructor() {
    super();
    this.page = 'Home';
  }
  // component attributes
  static get observedAttributes() {
    return ['page'];
  }
  // attribute change
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }
  connectedCallback() {
    toggleDark.addEventListener('click', (e) => {
      document.querySelector('body').classList.toggle('Dark');
      e.target.classList.toggle('Active');
      localStorage.dark = e.target.classList.contains('Active');
    });
    const pages = ['Home', 'Portfolio', 'About', 'Contact'];
    const nav = document.createElement('nav');
    pages.forEach((page) => {
      if (this.page !== page) {
        const link = document.createElement('a');
        link.innerText = page;
        link.href = `/${page === 'Home' ? '' : page.toLowerCase()}`;
        nav.append(link);
      }
    });
    this.append(toggleDark);
    this.append(nav);
  }
}
customElements.define('custom-header', Header);
