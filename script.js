const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');

menu.addEventListener('click', () => {
  const isOpen = nav.style.display === 'flex';

  nav.style.display = isOpen ? 'none' : 'flex';
  menu.setAttribute('aria-expanded', !isOpen);
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.style.display = 'none';
    menu.setAttribute('aria-expanded', 'false');
  });
});