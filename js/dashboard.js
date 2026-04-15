// js/dashboard.js
// CHANGES: Reads locale block from API response, formats currency correctly
//          per user's country. Stores locale to localStorage for other pages.

import { API_BASE } from './api.js';
import { getLocale, setActiveLocale, formatCurrency } from './localeConfig.js';

/* ── Utils ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const safeText = (el, text, fallback = '—') => {
  if (!el) return;
  el.textContent = (text !== undefined && text !== null && text !== '') ? text : fallback;
};

const capitalize = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '—';

/* ── Auth ───────────────────────────────────────────── */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/* ── Fetch ──────────────────────────────────────────── */
async function fetchJSON(path) {
  const headers = getAuthHeaders();
  if (!headers) { localStorage.clear(); window.location.replace('/login.html'); return null; }

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (res.status === 401) { localStorage.clear(); window.location.replace('/login.html'); return null; }
    if (res.status === 403) {
      disableAllCreationButtons('plan');
      showUpgradeBanner('Your plan has expired. Upgrade to continue.', true);
      return null;
    }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Dashboard fetch failed:', err);
    return null;
  }
}

/* ── Plan UI helpers ────────────────────────────────── */
function enableCreateButtons() {
  document.querySelectorAll('[data-requires-plan]').forEach(btn => {
    btn.classList.remove('disabled-by-plan');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
    btn.title = '';
    btn.onclick = null;
  });
}

function disableAllCreationButtons(reason = 'limit') {
  document.querySelectorAll('[data-requires-plan]').forEach(btn => {
    btn.classList.add('disabled-by-plan');
    btn.style.opacity = '0.6';
    btn.addEventListener('click', e => { e.preventDefault(); window.location.href = '/plans.html'; });
    btn.title = reason === 'limit' ? 'Upgrade to continue' : 'Upgrade your plan';
  });
}

function showUpgradeBanner(message, cta = true) {
  if (document.getElementById('upgradeBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'upgradeBanner';
  const text = document.createElement('div');
  text.textContent = message;
  banner.appendChild(text);
  if (cta) {
    const btn = document.createElement('a');
    btn.href = '/plans.html';
    btn.textContent = 'Upgrade Plan';
    btn.style.cssText = 'background:#1cc7ae;color:#0a0f1a;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:600;white-space:nowrap;font-size:13px;';
    banner.appendChild(btn);
  }
  (document.querySelector('.main') || document.body).prepend(banner);
}

function applyPlanUIState(principal, expired) {
  if (expired) { disableAllCreationButtons('plan'); showUpgradeBanner('Your plan has expired. Upgrade to continue.', true); return; }
  enableCreateButtons();
  const now = new Date();
  if (principal?.plan_code === 'trial' && principal?.trial_end) {
    const daysLeft = Math.ceil((new Date(principal.trial_end) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) showUpgradeBanner(`${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial — upgrade to continue.`);
  }
}

window.addEventListener('planStatusReady', e => applyPlanUIState(e.detail?.principal, e.detail?.expired));

/* ── Load dashboard ─────────────────────────────────── */
async function loadDashboard(period = 'this_month', start = null, end = null) {
  let url = `/api/dashboard?period=${period}`;
  if (period === 'custom' && start && end) url += `&start=${start}&end=${end}`;

  const data = await fetchJSON(url);
  if (!data || !data.user || !data.stats) { console.error('Invalid dashboard payload:', data); return; }

  const { user, stats } = data;

  // ── Store locale from API response ─────────────────
  const serverLocale = data.locale;
  if (serverLocale?.countryCode) {
    setActiveLocale(serverLocale.countryCode);
  }
  const countryCode = serverLocale?.countryCode || localStorage.getItem('countryCode') || 'IN';

  /* Plan expiry */
  const expired = !user.subscription_active;
  applyPlanUIState(user, expired);

  /* Greeting */
  const firstName = (user.display_name || user.name || '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  safeText($('userName'), firstName ? `${greeting}, ${firstName}` : greeting);
  safeText($('userEmail'), user.display_email || user.email || '');

  /* Plan strip */
  safeText($('planType'), user.plan_type ? capitalize(user.plan_type) : 'Free');
  safeText($('userPlan'), user.plan_code ? capitalize(user.plan_code) : 'Trial');

  /* Stats — locale-aware currency */
  safeText($('amountDue'),       formatCurrency(stats.amountDue,       countryCode));
  safeText($('amountRecovered'), formatCurrency(stats.amountRecovered, countryCode));
  safeText($('pendingInvoices'), stats.pendingInvoices, '0');

  /* Slots */
  let slotsDisplay;
  if (expired) slotsDisplay = '0';
  else slotsDisplay = stats.slotsLeft === null ? 'Unlimited' : `${stats.slotsLeft} remaining`;

  if (!expired && stats.slotsLeft !== null && stats.slotsLeft <= 0) {
    disableAllCreationButtons('limit');
    showUpgradeBanner("You've reached your invoice limit. Upgrade to keep going.", true);
  }
  safeText($('slotsLeft'), slotsDisplay);

  /* Priority lists */
  if (data.priority) renderPriorityLists(data.priority, countryCode);
}

function renderPriorityLists(priority, countryCode) {
  const render = (listId, items) => {
    const el = $(listId);
    if (!el) return;
    if (!items?.length) { el.innerHTML = `<p class="muted">None right now</p>`; return; }
    el.innerHTML = items.map(inv => `
      <div class="action-item" onclick="location.href='/invoice.html?id=${inv.id}'">
        <span>${inv.invoice_id}</span>
        <span>${formatCurrency(inv.payment_due, countryCode)}</span>
      </div>`).join('');
  };
  render('needsActionList', priority.needsAction);
  render('highRiskList',    priority.highRisk);
  render('highValueList',   priority.highValue);
}

/* ── Period pills ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const pills         = document.querySelectorAll('.period-pill');
  const customRangeDiv = document.getElementById('customRange');
  const startDateInput = document.getElementById('startDate');
  const endDateInput   = document.getElementById('endDate');
  const applyCustomBtn = document.getElementById('applyCustomRange');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const period = pill.dataset.period;
      if (period === 'custom') customRangeDiv?.classList.remove('hidden');
      else { customRangeDiv?.classList.add('hidden'); loadDashboard(period); }
    });
  });

  applyCustomBtn?.addEventListener('click', () => {
    const start = startDateInput?.value;
    const end   = endDateInput?.value;
    if (!start || !end) { alert('Please select both dates'); return; }
    loadDashboard('custom', start, end);
  });

  document.querySelectorAll('[data-requires-plan]').forEach(btn => {
    btn.addEventListener('click', e => {
      if (btn.classList.contains('disabled-by-plan')) { e.preventDefault(); window.location.href = '/plans.html'; }
    });
  });
});

/* ── Action center clicks ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.needs-attention-card')?.addEventListener('click', () => window.location.href = '/invoices.html?filter=needs_attention');
  document.querySelector('.high-risk-card')?.addEventListener('click',       () => window.location.href = '/invoices.html?filter=high_risk');
  document.querySelector('.high-value-card')?.addEventListener('click',      () => window.location.href = '/invoices.html?filter=high_value');
});

/* ── Boot ───────────────────────────────────────────── */
loadDashboard('this_month');
if (window.__USER_PLAN__) applyPlanUIState(window.__USER_PLAN__, window.__PLAN_EXPIRED__);