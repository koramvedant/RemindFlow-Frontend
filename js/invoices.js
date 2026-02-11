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
    case 'partially_paid':
      return `<span class="status partial">Partially Paid</span>`;
    default:
      return `<span class="status">${status}</span>`;
  }
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
async function downloadPdf(invoiceId) {
  try {
    const res = await authFetch(`${API_BASE}/api/invoices/${invoiceId}/pdf`);
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
        <td>
          ₹${(inv.grand_total || 0).toLocaleString()}
          ${
            inv.invoice_status !== 'paid' && Number(inv.payment_due) > 0
              ? `<span class="due-amount">
                  (₹${Number(inv.payment_due).toLocaleString()} due)
                </span>`
              : ''
          }
        </td>
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
                <button class="action download" data-id="${inv.id}">
                  Download PDF
                </button>

                ${
                  inv.invoice_status !== 'paid'
                    ? `<button class="action record-payment" data-id="${inv.id}">
                        Record Payment
                      </button>`
                    : ''
                }

                ${
                  inv.invoice_status !== 'paid'
                    ? inv.reminders_paused
                      ? `<button class="action resume-reminders" data-id="${inv.id}">
                          Resume
                        </button>`
                      : `<button class="action pause-reminders" data-id="${inv.id}">
                          Pause
                        </button>`
                    : ''
                }
              `
          }

          ${
            canDeleteInvoice(inv)
              ? `<button class="action delete" data-id="${inv.id}">Delete</button>`
              : `<button
                   class="action delete disabled"
                   data-id="${inv.id}"
                   disabled
                   title="Deletion not allowed">
                   Delete
                 </button>`
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
  const q = (searchInput.value || '').toLowerCase();
  const status = statusFilter.value;

  filtered = invoices.filter((inv) => {
    const matchesSearch =
      ((inv.invoice_id || '').toLowerCase().includes(q) ||
        clientName(inv).toLowerCase().includes(q));

    const matchesStatus =
      status === 'all' || !status || inv.invoice_status === status;

    return matchesSearch && matchesStatus;
  });

  page = 1;
  render();
}

/* ------------------ Actions ------------------ */
table.addEventListener('click', async (e) => {
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
}

/* ------------------ Events ------------------ */
searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
prevBtn.onclick = () => page > 1 && (page--, render());
nextBtn.onclick = () => page * perPage < filtered.length && (page++, render());

/* ------------------ Init ------------------ */
loadInvoices();
