/* ===================================================
   INVOICES LIST — USER VIEW (DRAFT AWARE)
=================================================== */

import { API_BASE } from './api.js';

/* ------------------ Elements ------------------ */
const table = document.getElementById('invoiceTable');
const totalInvoices = document.getElementById('totalInvoices');
const searchInput = document.getElementById('searchInput');
const clientFilter = document.getElementById('clientFilter');
const statusFilter = document.getElementById('statusFilter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const toast = document.getElementById('toast');

/* ------------------ State ------------------ */
let invoices = [];
let filtered = [];
let page = 1;
const perPage = 5;

// 🔥 Dashboard filter support
const params = new URLSearchParams(window.location.search);
const dashboardFilter = params.get('filter');

/* ------------------ Plan UI Helpers ------------------ */
function disableCreateButtons() {
  document
    .querySelectorAll('[data-requires-plan]')
    .forEach((btn) => {
      btn.style.pointerEvents = 'none';   // disable anchor click
      btn.style.opacity = '0.5';
      btn.title = 'Upgrade to create new invoices';
      btn.classList.add('disabled-by-plan');
    });
}

function disableAllCreationButtons(reason = 'limit') {
  document.querySelectorAll('[data-requires-plan]').forEach((btn) => {
    btn.classList.add('disabled-by-plan');
    btn.style.opacity = '0.6';

    // 🔥 Instead of blocking → redirect
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/plans.html';
    });

    if (reason === 'limit') {
      btn.title = 'Upgrade to continue';
    } else {
      btn.title = 'Upgrade your plan';
    }
  });
}

function showUpgradeBanner(message, cta = true) {
  const existing = document.getElementById('upgradeBanner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'upgradeBanner';

  banner.style.background = '#fff4e5';
  banner.style.color = '#8a4b00';
  banner.style.padding = '14px';
  banner.style.marginBottom = '16px';
  banner.style.borderRadius = '8px';
  banner.style.display = 'flex';
  banner.style.justifyContent = 'space-between';
  banner.style.alignItems = 'center';
  banner.style.gap = '12px';

  const text = document.createElement('div');
  text.textContent = message;

  banner.appendChild(text);

  if (cta) {
    const btn = document.createElement('a');
    btn.href = '/plans.html';
    btn.textContent = 'Upgrade Plan';
    btn.style.background = '#0f766e';
    btn.style.color = '#fff';
    btn.style.padding = '8px 14px';
    btn.style.borderRadius = '6px';
    btn.style.textDecoration = 'none';
    btn.style.fontWeight = '500';
    btn.style.whiteSpace = 'nowrap';

    banner.appendChild(btn);
  }

  const container = document.querySelector('.main') || document.body;
  container.prepend(banner);
}

function applyPlanUIState(principal, expired) {
  if (expired) {
    disableAllCreationButtons('plan');
    showUpgradeBanner('Your plan has expired. Upgrade to continue.', true);
    return;
  }
}

/* ------------------ Auth Fetch Helper ------------------ */
function authFetch(url, options = {}) {
  const token = localStorage.getItem('accessToken');

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/* ------------------ Helpers ------------------ */
function renderSyncInfo(inv) {
  if (!inv.last_synced_at || inv.source === 'manual') return '';

  const last = new Date(inv.last_synced_at);
  const now = new Date();

  const diffHours = Math.floor((now - last) / (1000 * 60 * 60));

  let text = '';

  if (diffHours < 1) {
    text = 'Just synced';
  } else if (diffHours < 24) {
    text = `${diffHours}h ago`;
  } else {
    const days = Math.floor(diffHours / 24);
    text = `${days}d ago`;
  }

  return `<div class="sync-info">Synced ${text}</div>`;
}

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => (toast.textContent = ''), 3000);
}

function statusBadge(status) {
  switch (status) {
    case 'draft':
      return `<span class="status draft">Draft</span>`;
    case 'sent':
      return `<span class="status sent">Sent</span>`;
    case 'paid':
      return `<span class="status paid">Paid</span>`;
    case 'overdue':
      return `<span class="status overdue">Overdue</span>`;
    case 'partially_paid':
      return `<span class="status partial">Partially Paid</span>`;
    default:
      return `<span class="status">${status}</span>`;
  }
}

function sourceBadge(inv) {
  const type =
    inv.source_type ||
    (inv.source === 'manual' ? 'manual' : 'imported');

  if (type === 'imported') {
    return `<span class="badge imported" title="Imported from external system">Imported</span>`;
  }

  return ''; // 🔥 keep manual invisible (premium UX)
}

/* ------------------ Client Name (AUTHORITATIVE) ------------------ */
function clientName(inv) {
  return inv.client_company || inv.client_name || '—';
}

/* ------------------ DELETE RULES ------------------ */
function canDeleteInvoice(inv) {
  if (inv.invoice_status === 'draft') return true;
  if (inv.invoice_status === 'paid') return false;
  if (!inv.due_date) return false;

  const today = new Date();
  const due = new Date(inv.due_date);
  due.setHours(23, 59, 59, 999);

  return today <= due;
}

/* ------------------ Record Payment Logic ------------------ */
function openRecordPaymentModal(inv) {
  const amount = prompt(
    `Record Payment\n\n` +
      `Total: ₹${inv.grand_total}\n` +
      `Paid: ₹${inv.payment_amount || 0}\n` +
      `Due: ₹${inv.payment_due}\n\n` +
      `Enter payment amount:`
  );

  if (amount === null) return;

  const value = Number(amount);

  if (!value || value <= 0) {
    showToast('Invalid payment amount', 'error');
    return;
  }

  if (value > Number(inv.payment_due)) {
    showToast('Amount exceeds due', 'error');
    return;
  }

  submitPayment(inv.id, value);
}

async function submitPayment(invoiceId, amount) {
  try {
    const res = await authFetch(
      `${API_BASE}/api/invoices/${invoiceId}/record-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }
    );

    if (!res.ok) {
      showToast('Failed to record payment', 'error');
      return;
    }

    showToast('Payment recorded');
    loadInvoices();
  } catch (err) {
    console.error(err);
    showToast('Payment error', 'error');
  }
}

/* ------------------ PDF Download ------------------ */
function downloadPdf(invoiceId) {
  const invoice = invoices.find(i => i.id === Number(invoiceId));

  if (!invoice || !invoice.pdf_signed_url) {
    showToast('PDF not available', 'error');
    return;
  }

  window.open(invoice.pdf_signed_url, '_blank');
} 


/* ------------------ Render ------------------ */
function render() {
  table.innerHTML = '';

  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  if (!rows.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">No invoices found</td>
      </tr>
    `;
    totalInvoices.textContent = 0;
    return;
  }

  rows.forEach((inv) => {
    const isDraft = inv.invoice_status === 'draft';

    table.innerHTML += `
      <tr class="${isDraft ? 'draft-row' : ''}">
        <td>
          <a href="/invoice.html?id=${inv.id}" class="invoice-link">
            ${inv.invoice_id || '—'}
            ${renderSyncInfo(inv)}
          </a>
        </td>
        <td>${clientName(inv)}</td>
        <td>
          ₹${Number(inv.grand_total || 0).toLocaleString('en-IN')}
          ${
            inv.invoice_status !== 'paid' && Number(inv.payment_due) > 0
              ? `<span class="due-amount">
                  (₹${Number(inv.payment_due).toLocaleString('en-IN')} due)
                </span>`
              : ''
          }
        </td>
        <td>${statusBadge(inv.invoice_status)}</td>
        <td>${inv.formatted_due_date || '—'}</td>
        <td>
          ${
            isDraft
              ? `
                <a href="/invoice-edit.html?id=${inv.id}" class="action view">Edit</a>
                <span class="action finalize" data-id="${inv.id}">Finalize</span>
              `
              : `
                <span class="action download" data-id="${inv.id}">
                  Download
                </span>
          
                ${
                  inv.invoice_status !== 'paid'
                    ? `<span class="action record-payment" data-id="${inv.id}">
                        Record Payment
                      </span>`
                    : ''
                }
          
                ${
                  inv.invoice_status !== 'paid'
                    ? inv.reminders_paused
                      ? `<span class="action resume-reminders" data-id="${inv.id}">
                          Resume
                        </span>`
                      : `<span class="action pause-reminders" data-id="${inv.id}">
                          Pause
                        </span>`
                    : ''
                }
              `
          }

${
  canDeleteInvoice(inv)
    ? `<span class="action delete" data-id="${inv.id}">Delete</span>`
    : `<span class="action delete disabled">Delete</span>`
}

        </td>
      </tr>
    `;
  });

  totalInvoices.textContent = filtered.length;
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page * perPage >= filtered.length;
}

/* ------------------ Filters ------------------ */
function applyFilters() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const status = (statusFilter.value || '').toLowerCase();

  filtered = invoices.filter((inv) => {

  /* ---------- DASHBOARD FILTER ---------- */

  let matchesDashboardFilter = true;

  const today = new Date();
  const due = inv.due_date ? new Date(inv.due_date) : null;
  const amount = Number(inv.payment_due || inv.grand_total || 0);

  if (dashboardFilter === 'needs_attention') {
    matchesDashboardFilter =
      due && due <= today &&
      inv.invoice_status !== 'paid';
  }

  if (dashboardFilter === 'high_risk') {
    matchesDashboardFilter =
      inv.escalation_score >= 70 ||
      (due && due < today && amount > 10000);
  }

  if (dashboardFilter === 'high_value') {
    matchesDashboardFilter =
      amount >= 20000;
  }

  /* ---------- SEARCH ---------- */

  const q = (searchInput.value || '').trim().toLowerCase();
  const status = (statusFilter.value || '').toLowerCase();

  const invoiceMatch =
    (inv.invoice_id || '').toLowerCase().includes(q);

  const clientMatch =
    clientName(inv).toLowerCase().includes(q);

  const amountRaw = String(inv.grand_total || '')
    .replace(/[,₹]/g, '')
    .toLowerCase();

  const searchAmount = q.replace(/[,₹]/g, '');
  const amountMatch = amountRaw.includes(searchAmount);

  const dueDateMatch =
    inv.due_date
      ? new Date(inv.due_date)
          .toLocaleDateString()
          .toLowerCase()
          .includes(q)
      : false;

  const createdMatch =
    inv.created_at
      ? new Date(inv.created_at)
          .toLocaleDateString()
          .toLowerCase()
          .includes(q)
      : false;

  const matchesSearch =
    !q ||
    invoiceMatch ||
    clientMatch ||
    amountMatch ||
    dueDateMatch ||
    createdMatch;

  /* ---------- STATUS ---------- */

  const matchesStatus =
    status === 'all' ||
    inv.invoice_status?.toLowerCase() === status;

  return matchesDashboardFilter && matchesSearch && matchesStatus;
});

  page = 1;
  render();
}

/* ------------------ Debounce ------------------ */

let searchTimer;

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    applyFilters();
  }, 250);
}

/* ------------------ Actions ------------------ */
table.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('action')) return;
  if (e.target.disabled) return; // 🔒 HARD BLOCK

  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('delete')) {
    const inv = invoices.find((i) => i.id === Number(id));
    if (!inv || !canDeleteInvoice(inv)) {
      showToast('Invoice cannot be deleted', 'error');
      return;
    }

    if (!confirm('Delete this invoice?')) return;

    const res = await authFetch(`${API_BASE}/api/invoices/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      showToast('Delete failed', 'error');
      return;
    }

    invoices = invoices.filter((i) => i.id !== Number(id));
    applyFilters();
    showToast('Invoice deleted');
  }

  if (e.target.classList.contains('finalize')) {
    if (!confirm('Finalize this invoice?')) return;

    const res = await authFetch(
      `${API_BASE}/api/invoices/${id}/finalize`,
      { method: 'PUT' }
    );

    if (!res.ok) {
      showToast('Failed to finalize invoice', 'error');
      return;
    }

    showToast('Invoice finalized');
    loadInvoices();
  }

  if (e.target.classList.contains('record-payment')) {
    const inv = invoices.find((i) => i.id === Number(id));
    if (!inv) return;
    openRecordPaymentModal(inv);
  }

  if (e.target.classList.contains('pause-reminders')) {
    if (!confirm('Pause reminders for this invoice?')) return;

    const res = await authFetch(
      `${API_BASE}/api/invoices/${id}/pause-reminders`,
      { method: 'PUT' }
    );

    if (!res.ok) {
      showToast('Failed to pause reminders', 'error');
      return;
    }

    showToast('Reminders paused');
    loadInvoices();
  }

  if (e.target.classList.contains('resume-reminders')) {
    if (!confirm('Resume reminders for this invoice?')) return;

    const res = await authFetch(
      `${API_BASE}/api/invoices/${id}/resume-reminders`,
      { method: 'PUT' }
    );

    if (!res.ok) {
      showToast('Failed to resume reminders', 'error');
      return;
    }

    showToast('Reminders resumed');
    loadInvoices();
  }

  if (e.target.classList.contains('download')) {
    downloadPdf(id);
  }
});

/* ------------------ Load ------------------ */
async function loadInvoices() {
  try {
    const res = await authFetch(`${API_BASE}/api/invoices`);
    if (!res.ok) throw new Error('Unauthorized');

    const data = await res.json();
    invoices = data.invoices || [];

    applyFilters();
  } catch (err) {
    console.error(err);
    showToast('Failed to load invoices', 'error');
  }
  if (dashboardFilter) {
  showToast(`Filtered: ${dashboardFilter.replace('_', ' ')}`);
}
}

/* ------------------ Events ------------------ */

searchInput.addEventListener('input', debounceSearch);

statusFilter.addEventListener('change', () => {
  applyFilters();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchTimer);
    applyFilters();
  }
});
prevBtn.onclick = () => {
  if (page > 1) {
    page--;
    render();
  }
};

nextBtn.onclick = () => {
  if (page * perPage < filtered.length) {
    page++;
    render();
  }
};

/* ------------------ Plan Status Listener ------------------ */
window.addEventListener('planStatusReady', (e) => {
  applyPlanUIState(
    e.detail?.principal,
    e.detail?.expired
  );
});

/* ------------------ Init ------------------ */
loadInvoices();

// 🔥 Handle race condition
if (window.__USER_PLAN__) {
  applyPlanUIState(
    window.__USER_PLAN__,
    window.__PLAN_EXPIRED__
  );
}
