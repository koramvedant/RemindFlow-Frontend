// js/invoices.js
// CHANGES: All ₹ hardcodes replaced with formatCurrency() using active locale.

import { API_BASE } from './api.js';
import { getActiveLocale, formatCurrency } from './localeConfig.js';

const lc = getActiveLocale();
const fmt = (val) => formatCurrency(val, lc.countryCode);

/* ── Elements ───────────────────────────────────────────── */
const table         = document.getElementById('invoiceTable');
const totalInvoices = document.getElementById('totalInvoices');
const searchInput   = document.getElementById('searchInput');
const clientFilter  = document.getElementById('clientFilter');
const statusFilter  = document.getElementById('statusFilter');
const prevBtn       = document.getElementById('prevBtn');
const nextBtn       = document.getElementById('nextBtn');
const toast         = document.getElementById('toast');

/* ── State ──────────────────────────────────────────────── */
let invoices = [], filtered = [], page = 1;
const perPage = 5;
const params          = new URLSearchParams(window.location.search);
const dashboardFilter = params.get('filter');

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
  const text = document.createElement('div');
  text.textContent = message;
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

/* ── Auth fetch ─────────────────────────────────────────── */
function authFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...options,
    headers: { 'Content-Type':'application/json', ...(options.headers||{}), ...(token ? { Authorization:`Bearer ${token}` } : {}) },
  });
}

/* ── Helpers ────────────────────────────────────────────── */
function renderSyncInfo(inv) {
  if (!inv.last_synced_at || inv.source === 'manual') return '';
  const diffHours = Math.floor((new Date() - new Date(inv.last_synced_at)) / (1000 * 60 * 60));
  const text = diffHours < 1 ? 'Just synced' : diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours/24)}d ago`;
  return `<div class="sync-info">Synced ${text}</div>`;
}

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => (toast.textContent = ''), 3000);
}

function statusBadge(status) {
  const map = { draft:'Draft', sent:'Sent', paid:'Paid', overdue:'Overdue', partially_paid:'Partially Paid' };
  const cls  = { draft:'draft', sent:'sent', paid:'paid', overdue:'overdue', partially_paid:'partial' };
  return `<span class="status ${cls[status] || ''}">${map[status] || status}</span>`;
}

function clientName(inv) { return inv.client_company || inv.client_name || '—'; }

function canDeleteInvoice(inv) {
  if (inv.invoice_status === 'draft') return true;
  if (inv.invoice_status === 'paid') return false;
  if (!inv.due_date) return false;
  const due = new Date(inv.due_date); due.setHours(23,59,59,999);
  return new Date() <= due;
}

function openRecordPaymentModal(inv) {
  const amount = prompt(
    `Record Payment\n\nTotal: ${fmt(inv.grand_total)}\nPaid: ${fmt(inv.payment_amount||0)}\nDue: ${fmt(inv.payment_due)}\n\nEnter payment amount:`
  );
  if (amount === null) return;
  const value = Number(amount);
  if (!value || value <= 0) { showToast('Invalid payment amount', 'error'); return; }
  if (value > Number(inv.payment_due)) { showToast('Amount exceeds due', 'error'); return; }
  submitPayment(inv.id, value);
}

async function submitPayment(invoiceId, amount) {
  try {
    const res = await authFetch(`${API_BASE}/api/invoices/${invoiceId}/record-payment`, { method:'POST', body:JSON.stringify({ amount }) });
    if (!res.ok) { showToast('Failed to record payment', 'error'); return; }
    showToast('Payment recorded');
    loadInvoices();
  } catch (err) { console.error(err); showToast('Payment error', 'error'); }
}

function downloadPdf(invoiceId) {
  const invoice = invoices.find(i => i.id === Number(invoiceId));
  if (!invoice || !invoice.pdf_signed_url) { showToast('PDF not available', 'error'); return; }
  window.open(invoice.pdf_signed_url, '_blank');
}

/* ── Render table ───────────────────────────────────────── */
function render() {
  table.innerHTML = '';
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center;">No invoices found</td></tr>`;
    totalInvoices.textContent = 0;
    return;
  }

  rows.forEach(inv => {
    const isDraft = inv.invoice_status === 'draft';
    table.innerHTML += `
      <tr class="${isDraft ? 'draft-row' : ''}">
        <td>
          <a href="/invoice.html?id=${inv.id}" class="invoice-link">
            ${inv.invoice_id || '—'}${renderSyncInfo(inv)}
          </a>
        </td>
        <td>${clientName(inv)}</td>
        <td>
          ${fmt(inv.grand_total)}
          ${inv.invoice_status !== 'paid' && Number(inv.payment_due) > 0
            ? `<span class="due-amount">(${fmt(inv.payment_due)} due)</span>`
            : ''}
        </td>
        <td>${statusBadge(inv.invoice_status)}</td>
        <td>${inv.formatted_due_date || '—'}</td>
        <td>
          ${isDraft
            ? `<a href="/invoice-edit.html?id=${inv.id}" class="action view">Edit</a>
               <span class="action finalize" data-id="${inv.id}">Finalize</span>`
            : `<span class="action download" data-id="${inv.id}">Download</span>
               ${inv.invoice_status !== 'paid' ? `<span class="action record-payment" data-id="${inv.id}">Record Payment</span>` : ''}
               ${inv.invoice_status !== 'paid'
                 ? inv.reminders_paused
                   ? `<span class="action resume-reminders" data-id="${inv.id}">Resume</span>`
                   : `<span class="action pause-reminders" data-id="${inv.id}">Pause</span>`
                 : ''}`}
          ${canDeleteInvoice(inv)
            ? `<span class="action delete" data-id="${inv.id}">Delete</span>`
            : `<span class="action delete disabled">Delete</span>`}
        </td>
      </tr>`;
  });

  totalInvoices.textContent = filtered.length;
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page * perPage >= filtered.length;
}

/* ── Filters ────────────────────────────────────────────── */
function applyFilters() {
  const q      = (searchInput?.value || '').trim().toLowerCase();
  const status = (statusFilter?.value || '').toLowerCase();
  const today  = new Date();

  filtered = invoices.filter(inv => {
    const due    = inv.due_date ? new Date(inv.due_date) : null;
    const amount = Number(inv.payment_due || inv.grand_total || 0);

    let matchesDashboard = true;
    if (dashboardFilter === 'needs_attention') matchesDashboard = due && due <= today && inv.invoice_status !== 'paid';
    if (dashboardFilter === 'high_risk')       matchesDashboard = inv.escalation_score >= 70 || (due && due < today && amount > 10000);
    if (dashboardFilter === 'high_value')      matchesDashboard = amount >= 20000;

    const matchesSearch = !q ||
      (inv.invoice_id || '').toLowerCase().includes(q) ||
      clientName(inv).toLowerCase().includes(q) ||
      String(inv.grand_total || '').replace(/[,]/g, '').includes(q.replace(/[,]/g, '')) ||
      (inv.due_date ? new Date(inv.due_date).toLocaleDateString().toLowerCase().includes(q) : false);

    const matchesStatus = status === 'all' || inv.invoice_status?.toLowerCase() === status;

    return matchesDashboard && matchesSearch && matchesStatus;
  });

  page = 1;
  render();
}

let searchTimer;
searchInput?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 250); });
statusFilter?.addEventListener('change', applyFilters);
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(searchTimer); applyFilters(); } });
prevBtn.onclick = () => { if (page > 1) { page--; render(); } };
nextBtn.onclick = () => { if (page * perPage < filtered.length) { page++; render(); } };

/* ── Table actions ──────────────────────────────────────── */
table.addEventListener('click', async e => {
  if (!e.target.classList.contains('action') || e.target.disabled) return;
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('delete')) {
    const inv = invoices.find(i => i.id === Number(id));
    if (!inv || !canDeleteInvoice(inv)) { showToast('Invoice cannot be deleted', 'error'); return; }
    if (!confirm('Delete this invoice?')) return;
    const res = await authFetch(`${API_BASE}/api/invoices/${id}`, { method:'DELETE' });
    if (!res.ok) { showToast('Delete failed', 'error'); return; }
    invoices = invoices.filter(i => i.id !== Number(id));
    applyFilters(); showToast('Invoice deleted');
  }

  if (e.target.classList.contains('finalize')) {
    if (!confirm('Finalize this invoice?')) return;
    const res = await authFetch(`${API_BASE}/api/invoices/${id}/finalize`, { method:'PUT' });
    if (!res.ok) { showToast('Failed to finalize invoice', 'error'); return; }
    showToast('Invoice finalized'); loadInvoices();
  }

  if (e.target.classList.contains('record-payment')) {
    const inv = invoices.find(i => i.id === Number(id));
    if (inv) openRecordPaymentModal(inv);
  }

  if (e.target.classList.contains('pause-reminders')) {
    if (!confirm('Pause reminders for this invoice?')) return;
    const res = await authFetch(`${API_BASE}/api/invoices/${id}/pause-reminders`, { method:'PUT' });
    if (!res.ok) { showToast('Failed to pause reminders', 'error'); return; }
    showToast('Reminders paused'); loadInvoices();
  }

  if (e.target.classList.contains('resume-reminders')) {
    if (!confirm('Resume reminders for this invoice?')) return;
    const res = await authFetch(`${API_BASE}/api/invoices/${id}/resume-reminders`, { method:'PUT' });
    if (!res.ok) { showToast('Failed to resume reminders', 'error'); return; }
    showToast('Reminders resumed'); loadInvoices();
  }

  if (e.target.classList.contains('download')) downloadPdf(id);
});

/* ── Load ───────────────────────────────────────────────── */
async function loadInvoices() {
  try {
    const res = await authFetch(`${API_BASE}/api/invoices`);
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    invoices = data.invoices || [];
    applyFilters();
  } catch (err) { console.error(err); showToast('Failed to load invoices', 'error'); }
  if (dashboardFilter) showToast(`Filtered: ${dashboardFilter.replace('_',' ')}`);
}

window.addEventListener('planStatusReady', e => applyPlanUIState(e.detail?.principal, e.detail?.expired));
loadInvoices();
if (window.__USER_PLAN__) applyPlanUIState(window.__USER_PLAN__, window.__PLAN_EXPIRED__);