// /js/dashboard.js
import { API_BASE } from './api.js';

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

/* ✅ Money formatter (NUMBER ONLY) */
const formatMoney = (value) =>
  typeof value === 'number' ? value.toLocaleString() : '0';

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/* ------------------ Fetch Helper (JWT AUTH) ------------------ */
async function fetchJSON(path) {
  const headers = getAuthHeaders();

  if (!headers) {
    localStorage.clear();
    window.location.replace('/login.html');
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers });

    // 🔐 401 → unauthenticated → logout
    if (res.status === 401) {
      localStorage.clear();
      window.location.replace('/login.html');
      return null;
    }

    // 🔒 403 → authenticated but blocked (plan)
    if (res.status === 403) {
      console.warn('Access blocked by plan');
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

  /* ------------------ User / Business ------------------ */
  safeText(
    $('userName'),
    user.display_name || user.name || user.email
  );

  safeText(
    $('userEmail'),
    user.display_email || user.email || ''
  );

  /* ------------------ Plan Info ------------------ */
  safeText(
    $('planType'),
    user.plan_type ? capitalize(user.plan_type) : 'Free'
  );

  safeText(
    $('userPlan'),
    user.plan_code ? capitalize(user.plan_code) : 'Trial'
  );

  /* ------------------ Stats ------------------ */
  safeText(
    $('amountDue'),
    `₹${formatMoney(stats.amountDue)}`
  );

  safeText(
    $('amountRecovered'),
    `₹${formatMoney(stats.amountRecovered)}`
  );

  safeText($('pendingInvoices'), stats.pendingInvoices, '0');

  safeText(
    $('slotsLeft'),
    stats.slotsLeft === null
      ? 'Unlimited'
      : `${stats.slotsLeft} remaining`
  );
}

/* ------------------ Boot ------------------ */
loadDashboard();
