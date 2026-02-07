// /js/sidebar.js

const sidebar = document.getElementById('sidebar');
const main = document.querySelector('.main');
const hamburger = document.getElementById('hamburger');

if (sidebar && main && hamburger) {
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('collapsed');
    hamburger.classList.toggle('active');
  });
}
