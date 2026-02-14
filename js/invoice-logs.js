// invoice-logs.js
import { API_BASE } from './api.js';

/* ------------------ Read client_id from URL ------------------ */
const params = new URLSearchParams(window.location.search);
const clientId = params.get('client_id');

if (!clientId) {
  alert('Client not specified');
  window.location.href = '/clients.html';
  throw new Error('client_id missing');
}

/* ------------------ Auth Helper ------------------ */
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* ------------------ Client Info Header ------------------ */
async function loadClientInfo(clientId) {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/clients/${clientId}`,
      { headers }
    );
    const data = await res.json();

    if (!res.ok || !data.client) {
      throw new Error('Failed to load client');
    }

    const client = data.client;

    // Client Name
    const nameEl = document.getElementById('clientName');
    if (nameEl) nameEl.textContent = client.name;

    // User-based trust (optimistic default)
    const userTrust =
      client.status_flags?.user_trust_grade || 'A';

    const userTrustEl = document.getElementById('userTrust');
    if (userTrustEl) userTrustEl.textContent = userTrust;

    // Global trust (informational only)
    const globalTrust =
      client.global_trust_grade || '—';

    const globalTrustEl = document.getElementById('globalTrust');
    if (globalTrustEl) globalTrustEl.textContent = globalTrust;

  } catch (err) {
    console.error('Client info load failed:', err);
  }
}

/* ------------------ Invoices State ------------------ */
let invoices = [];
let filtered = [];
let page = 1;
const perPage = 5;

function statusBadge(status) {
  switch (status) {
    case 'draft':
      return `<span class="status draft">Draft</span>`;
    case 'sent':
    case 'issued':
      return `<span class="status sent">Issued</span>`;
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

/* ------------------ Render Table ------------------ */
function render() {
  const tbody = document.getElementById('invoiceTable');
  if (!tbody) return;

  tbody.innerHTML = '';

  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);

  if (rows.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="text-align:center;">No invoices found</td></tr>`;
    return;
  }

  rows.forEach((inv) => {
    const tr = document.createElement('tr');
  
    tr.innerHTML = `
      <td>${inv.invoice_id}</td>
  
      <td>
        ₹${Number(inv.amount).toLocaleString('en-IN')}
        ${
          inv.status !== 'paid' && Number(inv.payment_due) > 0
            ? `<span class="due-amount">
                (₹${Number(inv.payment_due).toLocaleString('en-IN')} due)
              </span>`
            : ''
        }
      </td>
  
      <td>${statusBadge(inv.status)}</td>
  
      <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
  
      <td>
        <span class="action download" data-id="${inv.id}">
          Download
        </span>
  
        ${
          inv.status !== 'paid'
            ? `<span class="action record-payment" data-id="${inv.id}">
                Record Payment
              </span>`
            : ''
        }
  
        ${
          inv.status !== 'paid'
            ? inv.reminders_paused
              ? `<span class="action resume-reminders" data-id="${inv.id}">
                  Resume
                </span>`
              : `<span class="action pause-reminders" data-id="${inv.id}">
                  Pause
                </span>`
            : ''
        }
  
        <span class="action delete" data-id="${inv.id}">
          Delete
        </span>
      </td>
    `;
  
    tbody.appendChild(tr);
  });



  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');

  if (nextBtn) nextBtn.disabled = page * perPage >= filtered.length;
  if (prevBtn) prevBtn.disabled = page === 1;
}

const table = document.getElementById('invoiceTable');

table.addEventListener('click', async (e) => {
  if (
    !e.target.classList.contains('action') ||
    e.target.classList.contains('disabled')
  )
    return;


  const id = e.target.dataset.id;
  if (!id) return;

  const headers = getAuthHeaders();
  if (!headers) return;

  if (e.target.classList.contains('download')) {
    window.open(`${API_BASE}/api/invoices/${id}/pdf`, '_blank');
  }

  if (e.target.classList.contains('record-payment')) {
    alert('Use main Invoices page to record payment.');
  }

  if (e.target.classList.contains('pause-reminders')) {
    await fetch(`${API_BASE}/api/invoices/${id}/pause-reminders`, {
      method: 'PUT',
      headers,
    });
    loadInvoices();
  }

  if (e.target.classList.contains('resume-reminders')) {
    await fetch(`${API_BASE}/api/invoices/${id}/resume-reminders`, {
      method: 'PUT',
      headers,
    });
    loadInvoices();
  }

  if (e.target.classList.contains('delete')) {
    if (!confirm('Delete this invoice?')) return;

    await fetch(`${API_BASE}/api/invoices/${id}`, {
      method: 'DELETE',
      headers,
    });

    loadInvoices();
  }
});

/* ------------------ Filters ------------------ */
function applyFilters() {
  const search =
    document.getElementById('searchInput')?.value.trim() || '';

  const status =
    document.getElementById('statusFilter')?.value || '';

  const q = search.toLowerCase();

  filtered = invoices.filter((i) => {

    const matchesSearch =
      !q ||

      // Invoice ID
      i.invoice_id.toString().toLowerCase().includes(q) ||

      // Amount
      i.amount.toString().includes(q) ||

      // Created date
      (i.created_at &&
        new Date(i.created_at)
          .toLocaleDateString('en-IN')
          .toLowerCase()
          .includes(q)) ||

      // Due date
      (i.due_date &&
        new Date(i.due_date)
          .toLocaleDateString('en-IN')
          .toLowerCase()
          .includes(q));

    const matchesStatus =
      !status ||
      i.status.toLowerCase() === status.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  page = 1;
  render();
}

/* ------------------ Pagination ------------------ */
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');

if (nextBtn) {
  nextBtn.onclick = () => {
    if (page * perPage < filtered.length) {
      page++;
      render();
    }
  };
}

if (prevBtn) {
  prevBtn.onclick = () => {
    if (page > 1) {
      page--;
      render();
    }
  };
}

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

if (searchInput) {
  searchInput.addEventListener('input', applyFilters);
}

if (statusFilter) {
  statusFilter.addEventListener('change', applyFilters);
}


/* ------------------ Sidebar Toggle ------------------ */
const sidebar = document.getElementById('sidebar');
const main = document.querySelector('.main');
const hamburger = document.getElementById('hamburger');
const sidebarKey = 'remindflow_sidebar_collapsed';

function applySidebarState(collapsed) {
  sidebar?.classList.toggle('collapsed', collapsed);
  main?.classList.toggle('collapsed', collapsed);
  localStorage.setItem(sidebarKey, collapsed ? '1' : '0');
}

if (hamburger && sidebar) {
  hamburger.onclick = () =>
    applySidebarState(!sidebar.classList.contains('collapsed'));

  applySidebarState(localStorage.getItem(sidebarKey) === '1');
}

/* ------------------ Fetch Invoices ------------------ */
async function loadInvoices() {
  const headers = getAuthHeaders();
  if (!headers) {
    window.location.replace('/login.html');
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/invoices/client/${encodeURIComponent(clientId)}`,
      { headers }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch invoices');
    }

    // ✅ IMPORTANT: backend returns { success, invoices }
    invoices = (data.invoices || []).map((i) => ({
      id: i.id,
      invoice_id: i.invoice_id || i.id,
      amount: Number(i.grand_total || 0),
      status: i.invoice_status,
      created_at: i.created_at || null,
      due_date: i.due_date || null,
      payment_due: Number(i.payment_due || 0),
      reminders_paused: i.reminders_paused || false,
    }));


    applyFilters();
  } catch (err) {
    console.error(err);
    alert('Failed to load invoices');
    window.location.href = '/clients.html';
  }
}

/* ------------------ Init ------------------ */
loadClientInfo(clientId);
loadInvoices();
