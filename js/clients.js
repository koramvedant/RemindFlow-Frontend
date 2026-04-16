// js/clients.js
// CHANGES: Uses locale-aware date formatting for last payment column.

import { API_BASE } from './api.js';
import { getActiveLocale, formatDate } from './localeConfig.js';

const lc  = getActiveLocale();
const fmt = (d) => formatDate(d, lc.countryCode);

/* ── Elements ───────────────────────────────────────────── */
const table        = document.getElementById('clientTable');
const totalClients = document.getElementById('totalClients');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const searchInput  = document.getElementById('searchInput');
const trustFilter  = document.getElementById('trustFilter');

let clients = [], filtered = [], page = 1;
const perPage = 5;

/* ── Plan UI helpers ────────────────────────────────────── */
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
  Object.assign(banner.style, { background:'#fff4e5', color:'#8a4b00', padding:'14px', marginBottom:'16px', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px' });
  const text = document.createElement('div'); text.textContent = message;
  banner.appendChild(text);
  if (cta) {
    const btn = document.createElement('a');
    Object.assign(btn, { href:'/plans.html', textContent:'Upgrade Plan' });
    Object.assign(btn.style, { background:'#0f766e', color:'#fff', padding:'8px 14px', borderRadius:'6px', textDecoration:'none', fontWeight:'500', whiteSpace:'nowrap' });
    banner.appendChild(btn);
  }
  (document.querySelector('.main') || document.body).prepend(banner);
}

function applyPlanUIState(principal, expired) {
  if (expired) { disableAllCreationButtons('plan'); showUpgradeBanner('Your plan has expired. Upgrade to continue.', true); }
}

/* ── Render ─────────────────────────────────────────────── */
function render() {
  if (!table) return;
  table.innerHTML = '';

  filtered.slice((page - 1) * perPage, page * perPage).forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.id}</td>
      <td><a href="/invoice-logs.html?client_id=${c.id}" class="client-link">${c.name}</a></td>
      <td>
        <span class="trust-badge trust-${c.trust}" title="Payment reliability score: ${c.reliabilityScore}/100">
          ${c.trust}
        </span>
      </td>
      <td>${c.lastPayment || '-'}</td>
      <td>
        <span class="action edit" data-id="${c.id}">Edit</span>
        <span class="action delete" data-id="${c.id}">Delete</span>
      </td>`;
    table.appendChild(row);
  });

  if (totalClients) totalClients.textContent = filtered.length;
  if (prevBtn) prevBtn.disabled = page === 1;
  if (nextBtn) nextBtn.disabled = page * perPage >= filtered.length;
}

/* ── Filters ────────────────────────────────────────────── */
function applyFilters() {
  const s = searchInput?.value.toLowerCase() || '';
  const t = trustFilter?.value || '';
  filtered = clients.filter(c =>
    (c.id + c.name).toString().toLowerCase().includes(s) && (!t || c.trust === t)
  );
  page = 1;
  render();
}

/* ── Load ───────────────────────────────────────────────── */
async function loadClients() {
  const token = localStorage.getItem('accessToken');
  if (!token) { window.location.replace('/login.html'); return; }

  try {
    const res  = await fetch(`${API_BASE}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load clients');

    clients = (data.clients || []).map(c => ({
      id:               c.client_id,
      name:             c.name,
      trust:            c.trust_grade || 'B',
      reliabilityScore: c.payment_reliability_score || 50,
      // ← locale-aware date
      lastPayment:      c.last_payment ? fmt(c.last_payment) : null,
    }));

    filtered = [...clients];
    render();
  } catch (err) {
    console.error('Load clients failed:', err);
    alert('Failed to load clients');
  }
}

/* ── Events ─────────────────────────────────────────────── */
if (table) {
  table.addEventListener('click', e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('edit'))   { window.location.href = `/edit-client.html?id=${id}`; return; }
    if (e.target.classList.contains('delete')) {
      if (!confirm('Delete this client?')) return;
      clients = clients.filter(c => c.id.toString() !== id.toString());
      applyFilters();
    }
  });
}

if (prevBtn) prevBtn.onclick = () => { if (page > 1) { page--; render(); } };
if (nextBtn) nextBtn.onclick = () => { if (page * perPage < filtered.length) { page++; render(); } };
if (searchInput) searchInput.addEventListener('input', applyFilters);
if (trustFilter) trustFilter.addEventListener('change', applyFilters);

window.addEventListener('planStatusReady', e => applyPlanUIState(e.detail?.principal, e.detail?.expired));

window.addEventListener('trustUpdated', async e => {
  const clientId = e.detail?.clientId;
  if (!clientId) return;
  try {
    const token = localStorage.getItem('accessToken');
    const res   = await fetch(`${API_BASE}/api/clients/${clientId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data  = await res.json();
    if (!res.ok) return;
    const idx = clients.findIndex(c => c.id.toString() === clientId.toString());
    if (idx !== -1) {
      clients[idx].trust            = data.client.trust_grade || 'B';
      clients[idx].reliabilityScore = data.client.payment_reliability_score || 50;
    }
    applyFilters();
  } catch (err) { console.error('Trust live update failed:', err); }
});

loadClients();
if (window.__USER_PLAN__) applyPlanUIState(window.__USER_PLAN__, window.__PLAN_EXPIRED__);