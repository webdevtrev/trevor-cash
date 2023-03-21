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
    // const link = document.createElement('a');
    // link.href = '/';
    // const firstName = document.createElement('span');
    // firstName.innerText = 'Trevor';
    // const lastName = document.createElement('span');
    // lastName.innerText = 'Cash';
    // link.append(firstName, lastName);
    // this.append(link);
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
    this.append(nav);
  }
}
customElements.define('custom-header', Header);
