const skills = document.querySelectorAll('.Skill');
const placeholder = document.querySelector('.Skills-Info .Placeholder');
const placeholderHeight = document.querySelector(
  '.Skills-Info .Placeholder-Height'
);
let animationTimeout;
assignPositions();
skills.forEach((skill, index) => {
  skill.querySelector('button').addEventListener('click', () => {
    document.querySelector('.Skill-Cards').classList.add('Paused');
    if (skill.classList.contains('Large')) {
      document.querySelector('.Skill-Cards')?.classList.remove('Paused');
      document.querySelector('.Large')?.classList.remove('Large');
      placeholder.style.opacity = 0;
      setCurrentHeight();
      if (animationTimeout) {
        clearTimeout(animationTimeout);
      }
      animationTimeout = setTimeout(() => {
        placeholder.innerHTML = '<p>Select a skill to learn more!</p>';
        setCurrentHeight();
        placeholder.style.opacity = 1;
      }, 300);
    } else {
      document.querySelector('.Skill-Cards')?.classList.add('Paused');
      document.querySelector('.Large')?.classList.remove('Large');
      skill.classList.add('Large');
      const title = skill.querySelector('span').innerText;
      const body = skill.querySelector('p').textContent.replaceAll('\n', '');
      const titleElement = document.createElement('h3');
      titleElement.innerText = title;
      const bodyElement = document.createElement('p');
      bodyElement.innerText = body;
      placeholder.style.opacity = 0;
      setCurrentHeight();
      if (animationTimeout) {
        clearTimeout(animationTimeout);
      }
      animationTimeout = setTimeout(() => {
        placeholder.replaceChildren(titleElement);
        placeholder.append(bodyElement);
        setCurrentHeight();
        placeholder.style.opacity = 1;
      }, 300);
    }
  });
});
function setCurrentHeight() {
  const height = placeholder.clientHeight;
  placeholderHeight.style.height = height + 'px';
}
function assignPositions() {
  let radius = 0.4;
  const angle = 360 / skills.length;
  skills.forEach((skill, index) => {
    const currentAngle = angle * index;
    const radians = (currentAngle * Math.PI) / 180;
    let adjacent = Math.cos(radians) * radius; // bottom value
    let opposite = Math.tan(radians) * adjacent; // left value
    adjacent += 0.5;
    opposite += 0.5;
    skill.style.left = `${adjacent * 100}%`;
    skill.style.bottom = `${opposite * 100}%`;
    skill.querySelector('button').addEventListener('click', () => {
      document.querySelector('.Skill-Cards').classList.add;
    });
  });
}
