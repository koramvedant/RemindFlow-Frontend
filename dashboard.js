/* ------------------ Utils ------------------ */
const $ = (id) => document.getElementById(id);

const safeText = (el, text) => {
  if (el && text !== undefined && text !== null) {
    el.textContent = text;
  }
};

// If using frontend-only, backendBase can be empty
const backendBase = window.REMINDFLOW_API_BASE || '';

/* ------------------ Theme & Sidebar ------------------ */
const themeKey = 'remindflow_theme';
const sidebarKey = 'remindflow_sidebar_collapsed';

const sidebarEl = $('sidebar');
const mainEl = document.querySelector('.main');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(themeKey, theme);

  const icon = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('#themeToggle').forEach((btn) => {
    if (btn) btn.textContent = icon;
  });
}

function toggleTheme() {
  const current =
    localStorage.getItem(themeKey) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');

  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applySidebar(collapsed) {
  if (!sidebarEl) return;

  sidebarEl.classList.toggle('collapsed', collapsed);
  mainEl?.classList.toggle('collapsed', collapsed);
  localStorage.setItem(sidebarKey, collapsed ? '1' : '0');
}

/* ------------------ Event Listeners ------------------ */
$('themeToggle')?.addEventListener('click', toggleTheme);

$('collapseToggle')?.addEventListener('click', () => {
  if (!sidebarEl) return;
  applySidebar(!sidebarEl.classList.contains('collapsed'));
});

/* ------------------ Mobile Sidebar ------------------ */
const mobileHamburger = $('mobileHamburger');

if (mobileHamburger && sidebarEl) {
  mobileHamburger.addEventListener('click', () => {
    sidebarEl.classList.toggle('visible');
    mobileHamburger.classList.toggle('active');
  });
}

/* ------------------ Init UI State ------------------ */
(function initUIState() {
  const savedTheme =
    localStorage.getItem(themeKey) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');

  applyTheme(savedTheme);
  applySidebar(localStorage.getItem(sidebarKey) === '1');

  // Disable links marked as disabled (safety)
  document.querySelectorAll('.disabled').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });
})();

/* ------------------ Fetch Helper (COOKIE AUTH) ------------------ */
async function fetchJSON(path) {
  if (!backendBase) return null; // Frontend-only mode

  try {
    const res = await fetch(backendBase + path, {
      credentials: 'include',
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Fetch error:', err);
    return null;
  }
}

/* ------------------ Load Dashboard Stats ONLY ------------------ */
async function loadDashboard() {
  const data = await fetchJSON('/api/dashboard');

  if (!data || !data.stats) return;

  const { stats } = data;

  safeText($('totalClients'), stats.totalClients);
  safeText($('totalInvoices'), stats.totalInvoices);
  safeText($('pendingInvoices'), stats.pendingInvoices);
  safeText($('remindersSent'), stats.remindersSent);
}

/* ------------------ Boot ------------------ */
loadDashboard();
