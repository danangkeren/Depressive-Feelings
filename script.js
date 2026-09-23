const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');

menu.addEventListener('click', () => {
  nav.classList.toggle('open');

  const isOpen = nav.classList.contains('open');
  menu.setAttribute('aria-expanded', isOpen);
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    // Hanya menutup menu pada tampilan mobile
    if (window.innerWidth <= 768) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
});
