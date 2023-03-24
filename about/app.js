const images = {
  odie: '../images/odie.png',
  running: '../images/running.jpg',
  webdevtrev: '../images/webdevtrev.png',
  portrait: '../images/portrait.png',
};
const defaultImage = '';
let transitionOut;
let transitionIn;
const paragraphs = document.querySelectorAll('p');
paragraphs.forEach((item) => {
  const image = item.closest('.Group').querySelector('img');
  item.addEventListener('mouseover', (e) => {
    if (
      images[e.target.id] &&
      image.src.split('/')[image.src.split('/').length - 1] !==
        images[e.target.id].split('/')[
          images[e.target.id].split('/').length - 1
        ]
    ) {
      //   image.style.transition = 'opacity 0.3s ease 0.3s';
      image.style.opacity = 0;
      if (transitionOut) {
        clearTimeout(transitionOut);
      }
      transitionOut = setTimeout(() => {
        image.src = images[e.target.id];
        image.className = e.target.id;
      }, 500);
    }
  });
});
document.querySelectorAll('.Group img').forEach((image) => {
  image.addEventListener('load', (e) => {
    e.target.style.opacity = 1;
  });
});
