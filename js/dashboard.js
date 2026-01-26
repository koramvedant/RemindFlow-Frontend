// /js/dashboard.js

/* ------------------ Utils ------------------ */
const $ = (id) => document.getElementById(id);

const safeText = (el, text, fallback = '—') => {
  if (!el) return;
  el.textContent =
    text !== undefined && text !== null && text !== ''
      ? text
      : fallback;
};

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '—';

// Backend base (optional override)
const backendBase = window.REMINDFLOW_API_BASE || '';

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

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

  document.querySelectorAll('.disabled').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });
})();

/* ------------------ Fetch Helper (JWT AUTH) ------------------ */
async function fetchJSON(path) {
  const headers = getAuthHeaders();

  if (!headers) {
    localStorage.clear();
    window.location.replace('/login.html');
    return null;
  }

  try {
    const res = await fetch(backendBase + path, { headers });

    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.replace('/login.html');
      return null;
    }

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Dashboard fetch failed:', err);
    return null;
  }
}

/* ------------------ Load Dashboard ------------------ */
async function loadDashboard() {
  const data = await fetchJSON('/api/dashboard');

  if (!data || !data.user || !data.stats) {
    console.error('Invalid dashboard payload:', data);
    return;
  }

  const { user, stats } = data;

  // ------------------ User / Business Name ------------------
  safeText(
    $('userName'),
    user.business_name || user.name || user.email
  );

  // ------------------ Plan Info ------------------
  safeText($('planType'), capitalize(user.plan_type));
  safeText($('userPlan'), capitalize(user.plan_code));

  // ------------------ Stats ------------------
  safeText($('totalClients'), stats.totalClients, '0');
  safeText($('totalInvoices'), stats.totalInvoices, '0');
  safeText($('pendingInvoices'), stats.pendingInvoices, '0');
  safeText($('remindersSent'), stats.remindersSent, '0');
}

/* ------------------ Boot ------------------ */
loadDashboard();
