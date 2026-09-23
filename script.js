const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');

menu.addEventListener('click', () => {
  nav.classList.toggle('open');

  const isOpen = nav.classList.contains('open');
  menu.setAttribute('aria-expanded', isOpen);
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 850) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
});
