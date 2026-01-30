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
    default:
      return `<span class="status">${status}</span>`;
  }
}

/* ------------------ Client Name (AUTHORITATIVE) ------------------ */
function clientName(inv) {
  return inv.client_company || inv.client_name || '—';
}

/* ------------------ PDF Download ------------------ */
async function downloadPdf(invoiceId) {
  try {
    const res = await authFetch(
      `${API_BASE}/api/invoices/${invoiceId}/pdf`
    );
    if (!res.ok) throw new Error('PDF not available');

    const { pdf_signed_url } = await res.json();
    window.open(pdf_signed_url, '_blank');
  } catch (err) {
    console.error(err);
    showToast('Failed to download PDF', 'error');
  }
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
        <td>${inv.invoice_id || '—'}</td>
        <td>${clientName(inv)}</td>
        <td>₹${(inv.grand_total || 0).toLocaleString()}</td>
        <td>${statusBadge(inv.invoice_status)}</td>
        <td>${new Date(inv.created_at).toLocaleDateString()}</td>
        <td>
          ${
            isDraft
              ? `
                <a href="/invoice-edit.html?id=${inv.id}" class="action">Edit</a>
                <button class="action finalize" data-id="${inv.id}">Finalize</button>
              `
              : `
                <a href="/invoice-preview.html?id=${inv.id}" class="action">View</a>
                <button class="action download" data-id="${inv.id}">
                  Download PDF
                </button>
              `
          }
          <button class="action delete" data-id="${inv.id}">Delete</button>
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
  const q = (searchInput.value || '').toLowerCase();
  const status = statusFilter.value;

  filtered = invoices.filter((inv) => {
    return (
      ((inv.invoice_id || '').toLowerCase().includes(q) ||
        clientName(inv).toLowerCase().includes(q)) &&
      (!status || inv.invoice_status === status)
    );
  });

  page = 1;
  render();
}

/* ------------------ Actions ------------------ */
table.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;

  if (e.target.classList.contains('delete')) {
    if (!confirm('Delete this invoice?')) return;

    await authFetch(
      `${API_BASE}/api/invoices/${id}`,
      { method: 'DELETE' }
    );
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
    filtered = [...invoices];
    render();
  } catch (err) {
    console.error(err);
    showToast('Failed to load invoices', 'error');
  }
}

/* ------------------ Events ------------------ */
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
prevBtn.onclick = () => page > 1 && (page--, render());
nextBtn.onclick = () => page * perPage < filtered.length && (page++, render());

/* ------------------ Init ------------------ */
loadInvoices();
